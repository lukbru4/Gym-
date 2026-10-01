// Gemeinsame Datentypen – gleiche Felder wie in supabase/schema.sql und im lokalen Speicher.

export type ISODate = string; // 'YYYY-MM-DD'
export type ExerciseType = 'strength' | 'cardio';

export type MuscleId =
  | 'brust'
  | 'schultern'
  | 'bizeps'
  | 'trizeps'
  | 'bauch'
  | 'oberer_ruecken'
  | 'lat'
  | 'unterer_ruecken'
  | 'gesaess'
  | 'quadrizeps'
  | 'beinbeuger'
  | 'waden';

export interface Exercise {
  id: number;
  name: string;
  type: ExerciseType;
  user_id: string | null; // null = vorgegebene Übung
  muscles?: MuscleId[];
}

export interface Workout {
  id: number;
  date: ISODate;
  notes?: string | null;
}

export interface WorkoutSet {
  id?: number;
  workout_id: number;
  exercise_id: number;
  position?: number;
  reps?: number | string | null;
  weight_kg?: number | string | null;
  duration_min?: number | string | null;
  distance_km?: number | string | null;
  is_warmup?: boolean;
}

/** Satz mit dem Datum seines Trainings (für Verlauf, Rekorde, Körpergraph) */
export interface DatedSet extends WorkoutSet {
  date: ISODate;
}

export interface BodyWeight {
  id: number;
  date: ISODate;
  weight_kg: number;
}

export interface TemplateSet {
  warmup?: boolean;
  reps?: number | null;
  weight_kg?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
}

export interface TemplateExercise {
  exercise_id: number;
  rest_seconds?: number | null;
  sets: TemplateSet[];
}

export interface Template {
  id: number;
  name: string;
  exercises: TemplateExercise[];
}

export interface User {
  id: string;
  email?: string | null;
}

export type ExerciseMap = Map<number, Pick<Exercise, 'name' | 'type' | 'muscles' | 'user_id'>>;
