// Überträgt lokal gespeicherte Daten (Browser) in das Cloud-Konto.
// Übungen werden über den Namen zugeordnet; fehlende eigene Übungen werden angelegt.

const LOCAL_KEY = 'gym-tracker-data';
const DONE_KEY = 'gym-tracker-migrated';
const PARTIAL_KEY = 'gym-tracker-migrated-workouts'; // { [userId]: [lokale Trainings-IDs] } – verhindert Doppelte bei erneutem Versuch

function readPartial(userId) {
  try {
    return new Set((JSON.parse(localStorage.getItem(PARTIAL_KEY)) || {})[userId] || []);
  } catch {
    return new Set();
  }
}
function writePartial(userId, ids) {
  try {
    const all = JSON.parse(localStorage.getItem(PARTIAL_KEY)) || {};
    all[userId] = [...ids];
    localStorage.setItem(PARTIAL_KEY, JSON.stringify(all));
  } catch {
    /* ignorieren */
  }
}

export function readLocalData() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCAL_KEY));
    if (!d || !Array.isArray(d.workouts)) return null;
    const hasData = d.workouts.length || d.body_weights?.length || d.templates?.length;
    return hasData ? d : null;
  } catch {
    return null;
  }
}

export function migrationDone(userId) {
  try {
    return (JSON.parse(localStorage.getItem(DONE_KEY)) || []).includes(userId);
  } catch {
    return false;
  }
}

function markDone(userId) {
  try {
    const list = JSON.parse(localStorage.getItem(DONE_KEY)) || [];
    localStorage.setItem(DONE_KEY, JSON.stringify([...new Set([...list, userId])]));
  } catch {
    /* ignorieren */
  }
}

// data: lokales Backup-Objekt, api: Cloud-Backend, cloudExercises: [{ id, name, type }]
// onProgress(text) für eine Fortschrittsanzeige. Liefert { exercises, workouts, weights, templates, cloudExercises }.
export async function migrateToCloud(data, api, cloudExercises, userId, onProgress = () => {}) {
  const exercises = [...cloudExercises];
  const localEx = new Map((data.exercises || []).map((e) => [e.id, e]));
  const idMap = new Map();
  let createdExercises = 0;

  async function cloudId(localId) {
    if (idMap.has(localId)) return idMap.get(localId);
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
    const sets = [];
    for (const s of (data.sets || []).filter((x) => x.workout_id === w.id).sort((a, b) => a.position - b.position)) {
      const exercise_id = await cloudId(s.exercise_id);
      if (!exercise_id) continue;
      sets.push({
        exercise_id,
        reps: s.reps ?? null,
        weight_kg: s.weight_kg ?? null,
        duration_min: s.duration_min ?? null,
        distance_km: s.distance_km ?? null,
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
    const exercisesOut = [];
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
