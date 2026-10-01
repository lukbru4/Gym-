// Cloud-Speicher über Supabase (Login + Postgres mit Row Level Security).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TERMS_VERSION } from '../lib/legal';
import { publicUrl } from '../lib/platform';
import type { BodyWeight, Exercise, Template, User, Workout, WorkoutSet } from '../lib/types';
import type { Backend } from './backend';
import { createSocial } from './social';

export function create(url: string, anonKey: string): Backend {
  return backend(createClient(url, anonKey));
}

interface Result<T> { data: T | null; error: unknown }
function check<T>({ data, error }: Result<T>): T {
  if (error) throw error;
  return data as T;
}

function backend(supabase: SupabaseClient): Backend {
  // Supabase liefert standardmäßig max. 1000 Zeilen pro Anfrage – daher seitenweise laden.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function fetchAll<T>(buildQuery: () => any, pageSize = 1000): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const page = check<T[]>(await buildQuery().range(from, from + pageSize - 1));
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  // ---- Auth ------------------------------------------------------------------
  async function getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }

  const EXERCISE_COLS = 'id, name, type, user_id, muscles';

  return {
    mode: 'cloud',
    social: createSocial(supabase),
    getUser,
    signIn: async (email, password) => check<unknown>(await supabase.auth.signInWithPassword({ email, password })),
    signUp: async (email, password) =>
      check<{ session: unknown }>(
        await supabase.auth.signUp({
          email,
          password,
          // Zustimmung zu Nutzungsbedingungen, Datenschutz und Gesundheitsdaten (Art. 9 DSGVO) festhalten
          options: { emailRedirectTo: publicUrl(), data: { terms_version: TERMS_VERSION, consent_at: new Date().toISOString() } },
        }),
      ),
    signOut: () => supabase.auth.signOut(),
    resetPassword: async (email) => {
      check(await supabase.auth.resetPasswordForEmail(email, { redirectTo: publicUrl() }));
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onAuthChange: (cb) => {
      supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
    },

    // ---- Übungen -------------------------------------------------------------
    listExercises: () => fetchAll<Exercise>(() => supabase.from('exercises').select(EXERCISE_COLS).order('name').order('id')),
    createExercise: async (name, type, muscles = []) =>
      check<Exercise>(await supabase.from('exercises').insert({ name, type, muscles }).select(EXERCISE_COLS).single()),
    updateExercise: async (id, fields) =>
      check<Exercise>(await supabase.from('exercises').update(fields).eq('id', id).select(EXERCISE_COLS).single()),

    // ---- Trainings -----------------------------------------------------------
    listWorkouts: () =>
      fetchAll<Workout>(() => supabase.from('workouts').select('id, date, notes').order('date', { ascending: false }).order('id', { ascending: false })),
    listSets: () =>
      fetchAll<WorkoutSet>(() =>
        supabase.from('sets').select('id, workout_id, exercise_id, position, reps, weight_kg, duration_min, distance_km, is_warmup').order('id'),
      ),
    async getWorkout(id) {
      const workout = check<Workout>(await supabase.from('workouts').select('id, date, notes').eq('id', id).single());
      const sets = check<WorkoutSet[]>(
        await supabase
          .from('sets')
          .select('workout_id, exercise_id, position, reps, weight_kg, duration_min, distance_km, is_warmup')
          .eq('workout_id', id)
          .order('position'),
      );
      return { ...workout, sets };
    },
    /** Speichert ein Training inkl. Sätze. Bei `id` wird es ersetzt. */
    async saveWorkout({ id, date, notes, sets }) {
      let workoutId = id;
      if (workoutId) {
        check(await supabase.from('workouts').update({ date, notes }).eq('id', workoutId));
        check(await supabase.from('sets').delete().eq('workout_id', workoutId));
      } else {
        workoutId = check<{ id: number }>(await supabase.from('workouts').insert({ date, notes }).select('id').single()).id;
      }
      if (sets.length) {
        check(await supabase.from('sets').insert(sets.map((s, i) => ({ ...s, workout_id: workoutId, position: i }))));
      }
      return workoutId;
    },
    deleteWorkout: async (id) => check(await supabase.from('workouts').delete().eq('id', id)),

    // ---- Körpergewicht -------------------------------------------------------
    listBodyWeights: () => fetchAll<BodyWeight>(() => supabase.from('body_weights').select('id, date, weight_kg').order('date')),
    async saveBodyWeight(date, weight_kg) {
      const user = await getUser();
      if (!user) throw new Error('Bitte melde dich erneut an.');
      check(await supabase.from('body_weights').upsert({ user_id: user.id, date, weight_kg }, { onConflict: 'user_id,date' }));
    },
    deleteBodyWeight: async (id) => check(await supabase.from('body_weights').delete().eq('id', id)),

    // ---- Vorlagen ------------------------------------------------------------
    listTemplates: () => fetchAll<Template>(() => supabase.from('templates').select('id, name, exercises').order('created_at').order('id')),
    getTemplate: async (id) => check<Template>(await supabase.from('templates').select('id, name, exercises').eq('id', id).single()),
    async saveTemplate({ id, name, exercises }) {
      if (id) {
        check(await supabase.from('templates').update({ name, exercises }).eq('id', id));
        return id;
      }
      return check<{ id: number }>(await supabase.from('templates').insert({ name, exercises }).select('id').single()).id;
    },
    deleteTemplate: async (id) => check(await supabase.from('templates').delete().eq('id', id)),

    // ---- Konto ---------------------------------------------------------------
    async deleteAccount() {
      check(await supabase.rpc('delete_my_account'));
      await supabase.auth.signOut();
    },
    serverCredits: async () => check<number>(await supabase.rpc('my_credits')),
  };
}
