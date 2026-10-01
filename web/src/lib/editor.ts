// Reine Logik für den Trainings-/Vorlagen-Editor (ohne React), damit sie testbar ist.
import { parseNum, toInput } from './format';
import { todayISO } from './stats';
import type { DatedSet, Exercise, ExerciseType, ISODate, Template, TemplateExercise, TemplateSet, Workout, WorkoutSet } from './types';
import type { SetInput } from '../data/backend';

const DRAFT_KEY = 'gym-tracker-draft';

/** Eine Eingabezeile im Editor. Werte sind Texte (wie im Eingabefeld). */
export interface Row {
  warmup?: boolean;
  reps?: string;
  weight_kg?: string;
  duration_min?: string;
  distance_km?: string;
  done?: boolean;
  /** Zielwerte aus der Vorlage (als Platzhalter) */
  target?: { reps?: number | null; weight_kg?: number | null; duration_min?: number | null; distance_km?: number | null };
}
export type RowField = 'reps' | 'weight_kg' | 'duration_min' | 'distance_km';

export interface Block {
  exercise_id: number;
  rest_seconds?: number | null;
  sets: Row[];
}

export type EditorMode = 'live' | 'edit' | 'template';
export interface EditorState {
  mode: EditorMode;
  id: number | null;
  template_id?: number | null;
  name: string;
  date: ISODate;
  notes: string;
  started_at: number;
  blocks: Block[];
}

export const emptySet = (type: ExerciseType, warmup = false): Row =>
  type === 'cardio' ? { duration_min: '', distance_km: '' } : { warmup, reps: '', weight_kg: '' };

export const newLiveState = (): EditorState => ({
  mode: 'live', id: null, template_id: null, name: '', date: todayISO(), notes: '', started_at: Date.now(), blocks: [],
});

// ---- Entwurf des laufenden Trainings (übersteht Neuladen) --------------------
export function loadDraft(): EditorState | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    return d && Array.isArray(d.blocks) ? { ...newLiveState(), ...d, mode: 'live' } : null;
  } catch {
    return null;
  }
}
export function saveDraft(state: EditorState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    /* Entwurf ist nur Komfort */
  }
}
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignorieren */
  }
}
export const hasDraft = () => Boolean(loadDraft()?.blocks.length);

// ---- Sätze gruppieren / nummerieren -----------------------------------------
/** Sätze mit dem Datum ihres Trainings (für Kraft-Stufen und Fortschritt) */
export function datedSets(workouts: Workout[], sets: WorkoutSet[]): DatedSet[] {
  const dateOf = new Map(workouts.map((w) => [w.id, w.date]));
  return sets.map((x) => ({ ...x, date: dateOf.get(x.workout_id)! })).filter((x) => x.date);
}

/** Satznummern: Aufwärmsätze heißen "A", Arbeitssätze werden durchgezählt. */
export function numberSets<T extends { is_warmup?: boolean }>(sets: T[]): [T, string][] {
  let n = 0;
  return sets.map((s) => [s, s.is_warmup ? 'A' : String(++n)]);
}

/** Aufeinanderfolgende Sätze derselben Übung zu Blöcken zusammenfassen. */
export function groupSets<T extends { exercise_id: number }>(sets: T[]): { exercise: number; sets: T[] }[] {
  const groups: { exercise: number; sets: T[] }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.exercise === s.exercise_id) last.sets.push(s);
    else groups.push({ exercise: s.exercise_id, sets: [s] });
  }
  return groups;
}

/** Letzte Ausführung jeder Übung: Sätze aus dem neuesten Training, das sie enthält. */
export function lastPerformance(workouts: Workout[], sets: WorkoutSet[], excludeWorkoutId: number | null): Map<number, WorkoutSet[]> {
  const rank = new Map(workouts.map((w, i) => [w.id, i])); // workouts sind neueste zuerst
  const latest = new Map<number, { rank: number; workout_id: number }>();
  for (const s of sets) {
    const r = rank.get(s.workout_id);
    if (r == null || s.workout_id === excludeWorkoutId) continue;
    const cur = latest.get(s.exercise_id);
    if (!cur || r < cur.rank) latest.set(s.exercise_id, { rank: r, workout_id: s.workout_id });
  }
  const result = new Map<number, WorkoutSet[]>();
  for (const [exId, { workout_id }] of latest) {
    result.set(
      exId,
      sets.filter((s) => s.workout_id === workout_id && s.exercise_id === exId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    );
  }
  return result;
}

/** Passender Vorher-Satz: n-ter Aufwärmsatz ↔ n-ter Aufwärmsatz, n-ter Arbeitssatz ↔ n-ter Arbeitssatz. */
export function previousFor(prevSets: WorkoutSet[] | undefined, block: Block, si: number): WorkoutSet | null {
  if (!prevSets) return null;
  const warm = Boolean(block.sets[si].warmup);
  const idx = block.sets.slice(0, si).filter((r) => Boolean(r.warmup) === warm).length;
  return prevSets.filter((p) => Boolean(p.is_warmup) === warm)[idx] || null;
}

type ExerciseLookup = (id: number) => Exercise | undefined;

export function stateFromTemplate(t: Template, exerciseById: ExerciseLookup): EditorState {
  return {
    ...newLiveState(),
    template_id: t.id,
    name: t.name,
    blocks: t.exercises
      .filter((e) => exerciseById(e.exercise_id))
      .map((e) => {
        const type = exerciseById(e.exercise_id)!.type;
        return {
          exercise_id: e.exercise_id,
          rest_seconds: e.rest_seconds ?? null,
          sets: e.sets.map((s) => ({
            ...emptySet(type, Boolean(s.warmup)),
            target:
              type === 'cardio'
                ? { duration_min: s.duration_min ?? null, distance_km: s.distance_km ?? null }
                : { reps: s.reps ?? null, weight_kg: s.weight_kg ?? null },
            done: false,
          })),
        };
      }),
  };
}

export function templateBlocks(t: Pick<Template, 'exercises'>, exerciseById: ExerciseLookup): Block[] {
  return t.exercises
    .filter((e) => exerciseById(e.exercise_id))
    .map((e) => {
      const type = exerciseById(e.exercise_id)!.type;
      return {
        exercise_id: e.exercise_id,
        rest_seconds: e.rest_seconds ?? null,
        sets: e.sets.map((s) =>
          type === 'cardio'
            ? { duration_min: toInput(s.duration_min), distance_km: toInput(s.distance_km) }
            : { warmup: Boolean(s.warmup), reps: toInput(s.reps), weight_kg: toInput(s.weight_kg) },
        ),
      };
    });
}

export function editBlocks(sets: WorkoutSet[], exerciseById: ExerciseLookup): Block[] {
  return groupSets(sets).map((g) => ({
    exercise_id: g.exercise,
    sets: g.sets.map((s) =>
      exerciseById(g.exercise)?.type === 'cardio'
        ? { duration_min: toInput(s.duration_min), distance_km: toInput(s.distance_km) }
        : { warmup: Boolean(s.is_warmup), reps: toInput(s.reps), weight_kg: toInput(s.weight_kg) },
    ),
  }));
}

/** Liest einen Satz aus den Eingaben. Liefert null (leer), ein Objekt oder wirft bei ungültigen Werten. */
export function parseRow(row: Row, cardio: boolean): Omit<SetInput, 'exercise_id'> | null {
  if (cardio) {
    const duration_min = parseNum(row.duration_min);
    const distance_km = parseNum(row.distance_km);
    if (Number.isNaN(duration_min) || Number.isNaN(distance_km)) throw new Error('Bitte nur Zahlen eingeben.');
    if (duration_min == null && distance_km == null) return null;
    return { duration_min, distance_km };
  }
  const reps = parseNum(row.reps);
  const weight_kg = parseNum(row.weight_kg);
  if (Number.isNaN(reps) || Number.isNaN(weight_kg)) throw new Error('Bitte nur Zahlen eingeben.');
  if (reps == null && weight_kg == null) return null;
  if (!reps || !Number.isInteger(reps)) throw new Error('Jeder Kraftsatz braucht eine ganze Zahl an Wiederholungen.');
  return { reps, weight_kg: weight_kg ?? 0, is_warmup: Boolean(row.warmup) };
}

export function parseRowSafe(row: Row, cardio: boolean) {
  try {
    return parseRow(row, cardio);
  } catch {
    return null;
  }
}

/** Für Vorlagen: leere Felder sind erlaubt (Zielwerte optional). */
export function parseRowLoose(row: Row, cardio: boolean): TemplateSet {
  const num = (v: unknown) => {
    const n = parseNum(v);
    if (Number.isNaN(n)) throw new Error('Bitte nur Zahlen eingeben.');
    return n;
  };
  if (cardio) return { duration_min: num(row.duration_min), distance_km: num(row.distance_km) };
  const reps = num(row.reps);
  if (reps != null && !Number.isInteger(reps)) throw new Error('Wiederholungen müssen ganze Zahlen sein.');
  return { warmup: Boolean(row.warmup), reps, weight_kg: num(row.weight_kg) };
}

/** Vorlage aus dem Editor-Zustand (wirft bei ungültigen Zahlen) */
export function templateFromBlocks(blocks: Block[], exerciseById: ExerciseLookup): TemplateExercise[] {
  return blocks.map((b) => ({
    exercise_id: b.exercise_id,
    rest_seconds: b.rest_seconds ?? null,
    sets: b.sets.map((row) => parseRowLoose(row, exerciseById(b.exercise_id)!.type === 'cardio')),
  }));
}

/** Nach dem Training: neue Zielwerte für die Vorlage aus den heute geschafften Werten */
export function templateFromWorkout(blocks: Block[], exerciseById: ExerciseLookup): TemplateExercise[] {
  return blocks.map((b) => {
    const cardio = exerciseById(b.exercise_id)!.type === 'cardio';
    return {
      exercise_id: b.exercise_id,
      rest_seconds: b.rest_seconds ?? null,
      sets: b.sets.map((row) => {
        const v = parseRowSafe(row, cardio);
        if (cardio) {
          return v
            ? { duration_min: v.duration_min ?? null, distance_km: v.distance_km ?? null }
            : { duration_min: row.target?.duration_min ?? null, distance_km: row.target?.distance_km ?? null };
        }
        return {
          warmup: Boolean(row.warmup),
          reps: v ? v.reps ?? null : row.target?.reps ?? null,
          weight_kg: v ? v.weight_kg ?? null : row.target?.weight_kg ?? null,
        };
      }),
    };
  });
}

/** Neue Sätze für eine hinzugefügte Übung: Struktur des letzten Trainings übernehmen */
export function blockFor(ex: Exercise, prevSets: WorkoutSet[] | undefined): Block {
  const sets = prevSets?.length
    ? prevSets.map((p) => ({ ...emptySet(ex.type, Boolean(p.is_warmup)), done: false }))
    : [emptySet(ex.type)];
  return { exercise_id: ex.id, rest_seconds: null, sets };
}
