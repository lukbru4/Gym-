// Lokaler Speicher im Browser (localStorage) – funktioniert ohne Konto und ohne Server.
// Gleiche Schnittstelle wie supabase.ts.
import { DEFAULT_MUSCLES } from '../lib/muscles';
import type { Exercise, ExerciseType, Template, User } from '../lib/types';
import type { Backend, LocalData } from './backend';

export const STORAGE_KEY = 'gym-tracker-data';
const VERSION = 2;
const LOCAL_USER: User = Object.freeze({ id: 'local', email: 'Lokal' });

// Gleiche Standardübungen wie in supabase/schema.sql
const DEFAULT_EXERCISES: [string, ExerciseType][] = [
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

const TABLES = ['exercises', 'workouts', 'sets', 'body_weights'] as const;

function emptyData(): LocalData {
  return {
    version: VERSION,
    nextId: DEFAULT_EXERCISES.length + 1,
    exercises: DEFAULT_EXERCISES.map(([name, type], i) => ({
      id: i + 1, name, type, user_id: null, muscles: DEFAULT_MUSCLES[name] || [],
    })),
    workouts: [],
    sets: [],
    body_weights: [],
    templates: [],
  };
}

export function validateData(data: unknown): LocalData {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object' || !TABLES.every((t) => Array.isArray(d[t])) || !Number.isInteger(d.nextId)) {
    throw new Error('Die Datei ist kein gültiges Gym-Tracker-Backup.');
  }
  return d as unknown as LocalData;
}

/** Ältere Daten (Version 1) um Vorlagen, Muskeln und Aufwärmsätze ergänzen. */
export function migrate(data: LocalData): LocalData {
  if (data.version >= VERSION) return data;
  data.templates ??= [];
  for (const e of data.exercises) e.muscles ??= e.user_id ? [] : DEFAULT_MUSCLES[e.name] || [];
  for (const s of data.sets) s.is_warmup ??= false;
  data.version = VERSION;
  return data;
}

export function create(storage: Storage = globalThis.localStorage): Backend {
  const raw = storage.getItem(STORAGE_KEY); // wirft, wenn der Browser Speicher blockiert
  let data: LocalData = raw ? migrate(validateData(JSON.parse(raw))) : emptyData();

  const persist = () => {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      throw new Error(`Speichern im Browser fehlgeschlagen (${(err as Error).message}).`);
    }
  };
  const newId = () => data.nextId++;
  const copy = <T extends object>(rows: T[]): T[] => rows.map((r) => ({ ...r }));
  const byDateDesc = (a: { date: string; id: number }, b: { date: string; id: number }) => b.date.localeCompare(a.date) || b.id - a.id;

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

    async createExercise(name, type, muscles = []) {
      const ex: Exercise = { id: newId(), name, type, user_id: LOCAL_USER.id, muscles: [...muscles] };
      data.exercises.push(ex);
      persist();
      return { ...ex };
    },

    async updateExercise(id, fields) {
      const ex = data.exercises.find((e) => e.id === id && e.user_id === LOCAL_USER.id);
      if (!ex) throw new Error('Nur eigene Übungen können geändert werden.');
      Object.assign(ex, fields);
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
          workout_id: workoutId!,
          exercise_id: s.exercise_id,
          position: i,
          reps: s.reps ?? null,
          weight_kg: s.weight_kg ?? null,
          duration_min: s.duration_min ?? null,
          distance_km: s.distance_km ?? null,
          is_warmup: Boolean(s.is_warmup),
          side: s.side ?? null,
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

    // Vorlagen
    listTemplates: async () => structuredClone(data.templates).sort((a, b) => a.id - b.id),

    async getTemplate(id) {
      const t = data.templates.find((x) => x.id === id);
      if (!t) throw new Error('Vorlage nicht gefunden.');
      return structuredClone(t);
    },

    async saveTemplate({ id, name, exercises }) {
      if (id) {
        const t = data.templates.find((x) => x.id === id);
        if (!t) throw new Error('Vorlage nicht gefunden.');
        Object.assign(t, structuredClone({ name, exercises }));
        persist();
        return id;
      }
      const newTemplate: Template = structuredClone({ id: newId(), name, exercises });
      data.templates.push(newTemplate);
      persist();
      return newTemplate.id;
    },

    async deleteTemplate(id) {
      data.templates = data.templates.filter((t) => t.id !== id);
      persist();
    },

    // Alles löschen (lokales Gegenstück zu "Konto löschen")
    deleteAllData() {
      data = emptyData();
      persist();
    },

    // Backup
    validateBackup: validateData,
    exportData: () => JSON.parse(JSON.stringify(data)),
    importData(obj) {
      data = migrate(validateData(JSON.parse(JSON.stringify(obj))));
      persist();
    },
  };
}
