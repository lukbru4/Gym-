// Cloud-Speicher über Supabase (Login + Postgres mit Row Level Security).
// Die Bibliothek wird erst geladen, wenn dieser Modus aktiv ist.
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export async function create(url, anonKey) {
  const { createClient } = await import(SUPABASE_JS);
  return backend(createClient(url, anonKey));
}

function backend(supabase) {
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
  async function getUser() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password }).then(check);
  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }).then(check);
  const signOut = () => supabase.auth.signOut();
  const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));

  // ---- Übungen ---------------------------------------------------------------
  const listExercises = () =>
    fetchAll(() => supabase.from('exercises').select('id, name, type, user_id, muscles').order('name').order('id'));

  const createExercise = (name, type, muscles = []) =>
    supabase.from('exercises').insert({ name, type, muscles }).select('id, name, type, user_id, muscles').single().then(check);

  const updateExercise = (id, fields) =>
    supabase.from('exercises').update(fields).eq('id', id).select('id, name, type, user_id, muscles').single().then(check);

  // ---- Trainings -------------------------------------------------------------
  const listWorkouts = () =>
    fetchAll(() => supabase.from('workouts').select('id, date, notes').order('date', { ascending: false }).order('id', { ascending: false }));

  const listSets = () =>
    fetchAll(() =>
      supabase.from('sets').select('id, workout_id, exercise_id, position, reps, weight_kg, duration_min, distance_km, is_warmup').order('id')
    );

  async function getWorkout(id) {
    const workout = check(await supabase.from('workouts').select('id, date, notes').eq('id', id).single());
    const sets = check(
      await supabase
        .from('sets')
        .select('exercise_id, position, reps, weight_kg, duration_min, distance_km, is_warmup')
        .eq('workout_id', id)
        .order('position')
    );
    return { ...workout, sets };
  }

  // Speichert ein Training inkl. Sätze. Bei `id` wird es ersetzt.
  async function saveWorkout({ id, date, notes, sets }) {
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

  const deleteWorkout = (id) => supabase.from('workouts').delete().eq('id', id).then(check);

  // ---- Körpergewicht ---------------------------------------------------------
  const listBodyWeights = () =>
    fetchAll(() => supabase.from('body_weights').select('id, date, weight_kg').order('date'));

  async function saveBodyWeight(date, weight_kg) {
    const user = await getUser();
    check(await supabase.from('body_weights').upsert({ user_id: user.id, date, weight_kg }, { onConflict: 'user_id,date' }));
  }

  // ---- Vorlagen -------------------------------------------------------------
  const listTemplates = () =>
    fetchAll(() => supabase.from('templates').select('id, name, exercises').order('created_at').order('id'));

  const getTemplate = (id) =>
    supabase.from('templates').select('id, name, exercises').eq('id', id).single().then(check);

  async function saveTemplate({ id, name, exercises }) {
    if (id) {
      check(await supabase.from('templates').update({ name, exercises }).eq('id', id));
      return id;
    }
    return check(await supabase.from('templates').insert({ name, exercises }).select('id').single()).id;
  }

  const deleteTemplate = (id) => supabase.from('templates').delete().eq('id', id).then(check);

  const deleteBodyWeight = (id) => supabase.from('body_weights').delete().eq('id', id).then(check);

  return { mode: 'cloud', getUser, signIn, signUp, signOut, onAuthChange, listExercises, createExercise, updateExercise, listWorkouts, listSets, getWorkout, saveWorkout, deleteWorkout, listBodyWeights, saveBodyWeight, deleteBodyWeight, listTemplates, getTemplate, saveTemplate, deleteTemplate };
}
