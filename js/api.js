import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isConfigured = !SUPABASE_URL.includes('DEIN-PROJEKT') && !SUPABASE_ANON_KEY.includes('DEIN-ANON-KEY');

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function check({ data, error }) {
  if (error) throw error;
  return data;
}

// Supabase liefert standardmäßig max. 1000 Zeilen pro Anfrage – daher seitenweise laden.
async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const page = check(await buildQuery().range(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

// ---- Auth ------------------------------------------------------------------
export async function getUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password }).then(check);
export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }).then(check);
export const signOut = () => supabase.auth.signOut();
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));

// ---- Übungen ---------------------------------------------------------------
export const listExercises = () =>
  fetchAll(() => supabase.from('exercises').select('id, name, type, user_id').order('name').order('id'));

export const createExercise = (name, type) =>
  supabase.from('exercises').insert({ name, type }).select('id, name, type, user_id').single().then(check);

// ---- Trainings -------------------------------------------------------------
export const listWorkouts = () =>
  fetchAll(() => supabase.from('workouts').select('id, date, notes').order('date', { ascending: false }).order('id', { ascending: false }));

export const listSets = () =>
  fetchAll(() =>
    supabase.from('sets').select('id, workout_id, exercise_id, position, reps, weight_kg, duration_min, distance_km').order('id')
  );

export async function getWorkout(id) {
  const workout = check(await supabase.from('workouts').select('id, date, notes').eq('id', id).single());
  const sets = check(
    await supabase
      .from('sets')
      .select('exercise_id, position, reps, weight_kg, duration_min, distance_km')
      .eq('workout_id', id)
      .order('position')
  );
  return { ...workout, sets };
}

// Speichert ein Training inkl. Sätze. Bei `id` wird es ersetzt.
export async function saveWorkout({ id, date, notes, sets }) {
  let workoutId = id;
  if (workoutId) {
    check(await supabase.from('workouts').update({ date, notes }).eq('id', workoutId));
    check(await supabase.from('sets').delete().eq('workout_id', workoutId));
  } else {
    workoutId = check(await supabase.from('workouts').insert({ date, notes }).select('id').single()).id;
  }
  if (sets.length) {
    check(await supabase.from('sets').insert(sets.map((s, i) => ({ ...s, workout_id: workoutId, position: i }))));
  }
  return workoutId;
}

export const deleteWorkout = (id) => supabase.from('workouts').delete().eq('id', id).then(check);

// ---- Körpergewicht ---------------------------------------------------------
export const listBodyWeights = () =>
  fetchAll(() => supabase.from('body_weights').select('id, date, weight_kg').order('date'));

export async function saveBodyWeight(date, weight_kg) {
  const user = await getUser();
  check(await supabase.from('body_weights').upsert({ user_id: user.id, date, weight_kg }, { onConflict: 'user_id,date' }));
}

export const deleteBodyWeight = (id) => supabase.from('body_weights').delete().eq('id', id).then(check);
