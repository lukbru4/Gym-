// Gemeinsame Schnittstelle für den lokalen Speicher (Browser) und die Cloud (Supabase).
import type { Social } from './social';
import type { Side, BodyWeight, Exercise, ExerciseType, ISODate, MuscleId, Template, TemplateExercise, User, Workout, WorkoutSet } from '../lib/types';

export interface SetInput {
  exercise_id: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  is_warmup?: boolean;
  side?: Side | null;
}
export interface WorkoutInput { id: number | null; date: ISODate; notes: string | null; sets: SetInput[] }
export interface WorkoutWithSets extends Workout { sets: WorkoutSet[] }
export interface TemplateInput { id: number | null; name: string; exercises: TemplateExercise[] }

export interface Backend {
  mode: 'local' | 'cloud';
  getUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<unknown>;
  signUp(email: string, password: string): Promise<{ session: unknown } | unknown>;
  signOut(): Promise<unknown>;
  onAuthChange(cb: (user: User | null) => void): void;
  /** E-Mail mit Link zum Zurücksetzen des Passworts (nur Cloud) */
  resetPassword?(email: string): Promise<void>;
  /** Bestätigungs-Mail nach der Registrierung erneut senden */
  resendConfirmation?(email: string): Promise<void>;
  /** Neues Passwort für den angemeldeten Nutzer (nach dem Link aus der Mail) */
  updatePassword?(password: string): Promise<void>;

  listExercises(): Promise<Exercise[]>;
  createExercise(name: string, type: ExerciseType, muscles?: MuscleId[]): Promise<Exercise>;
  updateExercise(id: number, fields: Partial<Pick<Exercise, 'name' | 'muscles'>>): Promise<Exercise>;

  listWorkouts(): Promise<Workout[]>;
  listSets(): Promise<WorkoutSet[]>;
  getWorkout(id: number): Promise<WorkoutWithSets>;
  saveWorkout(w: WorkoutInput): Promise<number>;
  deleteWorkout(id: number): Promise<unknown>;

  listBodyWeights(): Promise<BodyWeight[]>;
  saveBodyWeight(date: ISODate, weight_kg: number): Promise<void>;
  deleteBodyWeight(id: number): Promise<unknown>;

  listTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template>;
  saveTemplate(t: TemplateInput): Promise<number>;
  deleteTemplate(id: number): Promise<unknown>;

  // nur Cloud
  social?: Social;
  deleteAccount?(): Promise<void>;
  serverCredits?(): Promise<number>;
  // nur lokal
  deleteAllData?(): void;
  validateBackup?(obj: unknown): LocalData;
  exportData?(): LocalData;
  importData?(obj: unknown): void;
}

/** Inhalt des lokalen Speichers bzw. einer Backup-Datei */
export interface LocalData {
  version: number;
  nextId: number;
  exercises: Exercise[];
  workouts: Workout[];
  sets: (WorkoutSet & { id: number; position: number })[];
  body_weights: BodyWeight[];
  templates: Template[];
}
