// Lokaler Speicher im Browser (localStorage) – funktioniert ohne Konto und ohne Server.
// Gleiche Schnittstelle wie backend-supabase.js.

const STORAGE_KEY = 'gym-tracker-data';
const LOCAL_USER = Object.freeze({ id: 'local', email: 'Lokal' });

// Gleiche Standardübungen wie in supabase/schema.sql
const DEFAULT_EXERCISES = [
  ['Bankdrücken', 'strength'], ['Schrägbankdrücken', 'strength'], ['Kurzhantel-Bankdrücken', 'strength'],
  ['Butterfly', 'strength'], ['Dips', 'strength'], ['Kniebeuge', 'strength'], ['Beinpresse', 'strength'],
  ['Ausfallschritte', 'strength'], ['Beinstrecker', 'strength'], ['Beinbeuger', 'strength'],
  ['Wadenheben', 'strength'], ['Kreuzheben', 'strength'], ['Rumänisches Kreuzheben', 'strength'],
  ['Klimmzüge', 'strength'], ['Latziehen', 'strength'], ['Langhantelrudern', 'strength'],
  ['Kabelrudern', 'strength'], ['Schulterdrücken', 'strength'], ['Seitheben', 'strength'],
  ['Face Pulls', 'strength'], ['Bizepscurls', 'strength'], ['Hammercurls', 'strength'],
  ['Trizepsdrücken am Kabel', 'strength'], ['French Press', 'strength'], ['Crunches', 'strength'],
  ['Plank', 'strength'], ['Laufband', 'cardio'], ['Crosstrainer', 'cardio'], ['Fahrradergometer', 'cardio'],
  ['Rudergerät', 'cardio'], ['Stepper', 'cardio'], ['Laufen (draußen)', 'cardio'],
];

const TABLES = ['exercises', 'workouts', 'sets', 'body_weights'];

function emptyData() {
  return {
    version: 1,
    nextId: DEFAULT_EXERCISES.length + 1,
    exercises: DEFAULT_EXERCISES.map(([name, type], i) => ({ id: i + 1, name, type, user_id: null })),
    workouts: [],
    sets: [],
    body_weights: [],
  };
}

export function validateData(data) {
  if (!data || typeof data !== 'object' || !TABLES.every((t) => Array.isArray(data[t])) || !Number.isInteger(data.nextId)) {
    throw new Error('Die Datei ist kein gültiges Gym-Tracker-Backup.');
  }
  return data;
}

export function create(storage = globalThis.localStorage) {
  let data;
  const raw = storage.getItem(STORAGE_KEY); // wirft, wenn der Browser Speicher blockiert
  data = raw ? validateData(JSON.parse(raw)) : emptyData();

  const persist = () => {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      throw new Error(`Speichern im Browser fehlgeschlagen (${err.message}).`);
    }
  };
  const newId = () => data.nextId++;
  const copy = (rows) => rows.map((r) => ({ ...r }));
  const byDateDesc = (a, b) => b.date.localeCompare(a.date) || b.id - a.id;

  return {
    mode: 'local',

    // Auth: lokal gibt es genau einen Nutzer, ohne Login
    getUser: async () => LOCAL_USER,
    signIn: async () => {},
    signUp: async () => ({ session: {} }),
    signOut: async () => {},
    onAuthChange: () => {},

    listExercises: async () =>
      copy(data.exercises).sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id - b.id),

    async createExercise(name, type) {
      const ex = { id: newId(), name, type, user_id: LOCAL_USER.id };
      data.exercises.push(ex);
      persist();
      return { ...ex };
    },

    listWorkouts: async () => copy(data.workouts).sort(byDateDesc),
    listSets: async () => copy(data.sets).sort((a, b) => a.id - b.id),

    async getWorkout(id) {
      const w = data.workouts.find((x) => x.id === id);
      if (!w) throw new Error('Training nicht gefunden.');
      const sets = copy(data.sets.filter((s) => s.workout_id === id)).sort((a, b) => a.position - b.position);
      return { ...w, sets };
    },

    async saveWorkout({ id, date, notes, sets }) {
      let workoutId = id;
      if (workoutId) {
        const w = data.workouts.find((x) => x.id === workoutId);
        if (!w) throw new Error('Training nicht gefunden.');
        Object.assign(w, { date, notes });
        data.sets = data.sets.filter((s) => s.workout_id !== workoutId);
      } else {
        workoutId = newId();
        data.workouts.push({ id: workoutId, date, notes });
      }
      sets.forEach((s, i) => {
        data.sets.push({
          id: newId(),
          workout_id: workoutId,
          exercise_id: s.exercise_id,
          position: i,
          reps: s.reps ?? null,
          weight_kg: s.weight_kg ?? null,
          duration_min: s.duration_min ?? null,
          distance_km: s.distance_km ?? null,
        });
      });
      persist();
      return workoutId;
    },

    async deleteWorkout(id) {
      data.workouts = data.workouts.filter((w) => w.id !== id);
      data.sets = data.sets.filter((s) => s.workout_id !== id);
      persist();
    },

    listBodyWeights: async () => copy(data.body_weights).sort((a, b) => a.date.localeCompare(b.date)),

    async saveBodyWeight(date, weight_kg) {
      const existing = data.body_weights.find((b) => b.date === date);
      if (existing) existing.weight_kg = weight_kg;
      else data.body_weights.push({ id: newId(), date, weight_kg });
      persist();
    },

    async deleteBodyWeight(id) {
      data.body_weights = data.body_weights.filter((b) => b.id !== id);
      persist();
    },

    // Backup
    validateBackup: validateData,
    exportData: () => JSON.parse(JSON.stringify(data)),
    importData(obj) {
      data = validateData(JSON.parse(JSON.stringify(obj)));
      persist();
    },
  };
}
