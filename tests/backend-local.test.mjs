import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create } from '../js/backend-local.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('startet mit Standardübungen', async () => {
  const b = create(memoryStorage());
  const ex = await b.listExercises();
  assert.ok(ex.some((e) => e.name === 'Bankdrücken' && e.type === 'strength'));
  assert.ok(ex.some((e) => e.name === 'Laufband' && e.type === 'cardio'));
});

test('Training speichern, bearbeiten, löschen – und Daten überleben Neustart', async () => {
  const storage = memoryStorage();
  let b = create(storage);
  const id = await b.saveWorkout({
    id: null, date: '2026-09-25', notes: 'x',
    sets: [{ exercise_id: 1, reps: 8, weight_kg: 60 }, { exercise_id: 27, duration_min: 20, distance_km: 3 }],
  });
  b = create(storage); // "Seite neu laden"
  let w = await b.getWorkout(id);
  assert.equal(w.sets.length, 2);
  assert.deepEqual([w.sets[0].reps, w.sets[0].weight_kg, w.sets[1].duration_min], [8, 60, 20]);

  await b.saveWorkout({ id, date: '2026-09-24', notes: null, sets: [{ exercise_id: 1, reps: 5, weight_kg: 70 }] });
  w = await b.getWorkout(id);
  assert.equal(w.date, '2026-09-24');
  assert.equal(w.sets.length, 1);
  assert.equal((await b.listSets()).length, 1);

  await b.deleteWorkout(id);
  assert.equal((await b.listWorkouts()).length, 0);
  assert.equal((await b.listSets()).length, 0);
});

test('Körpergewicht: ein Eintrag pro Tag', async () => {
  const b = create(memoryStorage());
  await b.saveBodyWeight('2026-09-25', 81);
  await b.saveBodyWeight('2026-09-25', 80.5);
  await b.saveBodyWeight('2026-09-20', 82);
  const list = await b.listBodyWeights();
  assert.deepEqual(list.map((x) => [x.date, x.weight_kg]), [['2026-09-20', 82], ['2026-09-25', 80.5]]);
});

test('Backup Export/Import und Ablehnung ungültiger Dateien', async () => {
  const a = create(memoryStorage());
  await a.createExercise('Hip Thrust', 'strength');
  await a.saveBodyWeight('2026-09-25', 80);
  const backup = a.exportData();

  const b = create(memoryStorage());
  b.importData(backup);
  assert.ok((await b.listExercises()).some((e) => e.name === 'Hip Thrust'));
  assert.equal((await b.listBodyWeights()).length, 1);
  // neue IDs kollidieren nicht mit importierten
  const ex = await b.createExercise('Neu', 'cardio');
  assert.ok(!backup.exercises.some((e) => e.id === ex.id));

  assert.throws(() => b.importData({ foo: 1 }), /kein gültiges/);
  assert.equal((await b.listBodyWeights()).length, 1); // unverändert
});

test('Vorlagen speichern, ändern, löschen', async () => {
  const b = create(memoryStorage());
  const id = await b.saveTemplate({ id: null, name: 'Push', exercises: [{ exercise_id: 1, rest_seconds: 120, sets: [{ warmup: true, reps: 5, weight_kg: 20 }] }] });
  let t = await b.getTemplate(id);
  assert.equal(t.name, 'Push');
  t.exercises[0].sets[0].reps = 99; // Kopie, Original bleibt
  assert.equal((await b.getTemplate(id)).exercises[0].sets[0].reps, 5);
  await b.saveTemplate({ id, name: 'Push A', exercises: [] });
  assert.equal((await b.listTemplates())[0].name, 'Push A');
  await b.deleteTemplate(id);
  assert.equal((await b.listTemplates()).length, 0);
});

test('Alte Daten (Version 1) werden migriert', async () => {
  const storage = memoryStorage();
  storage.setItem('gym-tracker-data', JSON.stringify({
    version: 1, nextId: 50,
    exercises: [{ id: 1, name: 'Bankdrücken', type: 'strength', user_id: null }, { id: 40, name: 'Eigene', type: 'strength', user_id: 'local' }],
    workouts: [{ id: 41, date: '2026-09-01', notes: null }],
    sets: [{ id: 42, workout_id: 41, exercise_id: 1, position: 0, reps: 5, weight_kg: 60 }],
    body_weights: [],
  }));
  const b = create(storage);
  const ex = await b.listExercises();
  assert.deepEqual(ex.find((e) => e.id === 1).muscles, ['brust']);
  assert.deepEqual(ex.find((e) => e.id === 40).muscles, []);
  assert.equal((await b.listSets())[0].is_warmup, false);
  assert.deepEqual(await b.listTemplates(), []);
  const updated = await b.updateExercise(40, { muscles: ['bizeps'] });
  assert.deepEqual(updated.muscles, ['bizeps']);
  await assert.rejects(() => b.updateExercise(1, { muscles: [] }), /eigene/);
});
