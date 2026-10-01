// Überträgt lokal gespeicherte Daten (Browser) in das Cloud-Konto.
// Übungen werden über den Namen zugeordnet; fehlende eigene Übungen werden angelegt.
import type { Exercise, TemplateExercise } from '../lib/types';
import type { Backend, LocalData, SetInput } from './backend';
import { STORAGE_KEY as LOCAL_KEY } from './local';

const DONE_KEY = 'gym-tracker-migrated';
const PARTIAL_KEY = 'gym-tracker-migrated-workouts'; // { [userId]: [lokale Trainings-IDs] } – verhindert Doppelte bei erneutem Versuch

function readJSON<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignorieren */
  }
}

const readPartial = (userId: string) => new Set<number>(readJSON<Record<string, number[]>>(PARTIAL_KEY, {})[userId] || []);
function writePartial(userId: string, ids: Set<number>) {
  writeJSON(PARTIAL_KEY, { ...readJSON<Record<string, number[]>>(PARTIAL_KEY, {}), [userId]: [...ids] });
}

/** Lokale Daten, falls es etwas zu übertragen gibt – sonst null. */
export function readLocalData(): LocalData | null {
  const d = readJSON<LocalData | null>(LOCAL_KEY, null);
  if (!d || !Array.isArray(d.workouts)) return null;
  const hasData = d.workouts.length || d.body_weights?.length || d.templates?.length;
  return hasData ? d : null;
}

export const migrationDone = (userId: string) => readJSON<string[]>(DONE_KEY, []).includes(userId);
const markDone = (userId: string) => writeJSON(DONE_KEY, [...new Set([...readJSON<string[]>(DONE_KEY, []), userId])]);

export interface MigrationResult { exercises: number; workouts: number; weights: number; templates: number; cloudExercises: Exercise[] }

export async function migrateToCloud(
  data: LocalData,
  api: Backend,
  cloudExercises: Exercise[],
  userId: string,
  onProgress: (text: string) => void = () => {},
): Promise<MigrationResult> {
  const exercises = [...cloudExercises];
  const localEx = new Map((data.exercises || []).map((e) => [e.id, e]));
  const idMap = new Map<number, number>();
  let createdExercises = 0;

  async function cloudId(localId: number): Promise<number | null> {
    if (idMap.has(localId)) return idMap.get(localId)!;
    const le = localEx.get(localId);
    if (!le) return null;
    let ce = exercises.find((x) => x.name.toLowerCase() === le.name.toLowerCase());
    if (!ce) {
      ce = await api.createExercise(le.name, le.type, le.muscles || []);
      exercises.push(ce);
      createdExercises++;
    }
    idMap.set(localId, ce.id);
    return ce.id;
  }

  const workouts = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const already = readPartial(userId);
  let done = 0;
  for (const w of workouts) {
    if (already.has(w.id)) {
      onProgress(`Trainings: ${++done} von ${workouts.length}`);
      continue;
    }
    const sets: SetInput[] = [];
    for (const s of (data.sets || []).filter((x) => x.workout_id === w.id).sort((a, b) => a.position - b.position)) {
      const exercise_id = await cloudId(s.exercise_id);
      if (!exercise_id) continue;
      sets.push({
        exercise_id,
        reps: (s.reps as number) ?? null,
        weight_kg: (s.weight_kg as number) ?? null,
        duration_min: (s.duration_min as number) ?? null,
        distance_km: (s.distance_km as number) ?? null,
        is_warmup: Boolean(s.is_warmup),
      });
    }
    await api.saveWorkout({ id: null, date: w.date, notes: w.notes ?? null, sets });
    already.add(w.id);
    writePartial(userId, already);
    onProgress(`Trainings: ${++done} von ${workouts.length}`);
  }
  for (const b of data.body_weights || []) await api.saveBodyWeight(b.date, b.weight_kg);
  for (const t of data.templates || []) {
    const exercisesOut: TemplateExercise[] = [];
    for (const e of t.exercises) {
      const exercise_id = await cloudId(e.exercise_id);
      if (exercise_id) exercisesOut.push({ ...e, exercise_id });
    }
    await api.saveTemplate({ id: null, name: t.name, exercises: exercisesOut });
  }
  markDone(userId);
  return {
    exercises: createdExercises,
    workouts: workouts.length,
    weights: (data.body_weights || []).length,
    templates: (data.templates || []).length,
    cloudExercises: exercises,
  };
}
