import { test } from 'vitest';
import assert from 'node:assert/strict';
import { computeProgress, playerLevel, exerciseLevel, weightLevel, RULES } from '../src/lib/xp';

const exercises = new Map([
  [1, { name: 'Latziehen', type: 'strength' }],
  [2, { name: 'Laufband', type: 'cardio' }],
]);

test('Level-Schwellen', () => {
  assert.deepEqual([0, 99, 100, 299, 300, 600].map((x) => playerLevel(x).level), [1, 1, 2, 2, 3, 4]);
  const l = playerLevel(150);
  assert.equal(l.into, 50);
  assert.equal(l.needed, 200);
  assert.deepEqual([0, 39, 40, 120].map((x) => exerciseLevel(x).level), [1, 1, 2, 3]);
  assert.deepEqual([0, 4.9, 5, 44.9, 45].map(weightLevel), [1, 1, 2, 9, 10]);
});

test('Credits: Training, Sätze, Steigerung, Rekord; Aufwärmsätze zählen nicht', () => {
  const workouts = [
    { id: 10, date: '2026-09-01' },
    { id: 11, date: '2026-09-08' },
    { id: 12, date: '2026-09-15' },
    { id: 13, date: '2026-09-22' },
  ];
  const sets = [
    // 1. Training: 2 Arbeitssätze + 1 Aufwärmsatz, Cardio
    { workout_id: 10, exercise_id: 1, reps: 5, weight_kg: 20, is_warmup: true },
    { workout_id: 10, exercise_id: 1, reps: 8, weight_kg: 40 },
    { workout_id: 10, exercise_id: 1, reps: 8, weight_kg: 40 },
    { workout_id: 10, exercise_id: 2, duration_min: 20 },
    // 2. Training: stärker → Steigerung + Rekord
    { workout_id: 11, exercise_id: 1, reps: 8, weight_kg: 45 },
    // 3. Training: schwächer → nichts extra
    { workout_id: 12, exercise_id: 1, reps: 8, weight_kg: 42.5 },
    // 4. Training: stärker als letztes Mal, aber kein Rekord
    { workout_id: 13, exercise_id: 1, reps: 8, weight_kg: 44 },
  ];
  const p = computeProgress(workouts, sets, exercises);
  const c = (id) => p.perWorkout.get(id).credits;
  assert.equal(c(10), RULES.workout + 3 * RULES.set);
  assert.equal(c(11), RULES.workout + RULES.set + RULES.improvement + RULES.record);
  assert.equal(c(12), RULES.workout + RULES.set);
  assert.equal(c(13), RULES.workout + RULES.set + RULES.improvement);
  assert.equal(p.total, c(10) + c(11) + c(12) + c(13));
  assert.equal(p.perWorkout.get(11).before, c(10));
  assert.ok(p.perWorkout.get(11).items.some((i) => i.label === 'Neuer Rekord: Latziehen'));
  const lat = p.perExercise.get(1);
  assert.equal(lat.sessions, 4);
  assert.equal(lat.xp, 4 * 10 + 10 + 15 + 10); // 4 Trainings, 2 Steigerungen, 1 Rekord
  assert.ok(Math.abs(lat.best - 45 * (1 + 8 / 30)) < 1e-9);
});

test('Reihenfolge nach Datum, nicht nach Eingabe', () => {
  const workouts = [{ id: 2, date: '2026-09-10' }, { id: 1, date: '2026-09-01' }];
  const sets = [
    { workout_id: 2, exercise_id: 1, reps: 5, weight_kg: 50 },
    { workout_id: 1, exercise_id: 1, reps: 5, weight_kg: 40 },
  ];
  const p = computeProgress(workouts, sets, exercises);
  assert.ok(p.perWorkout.get(2).items.some((i) => i.label === 'Latziehen gesteigert'));
  assert.ok(!p.perWorkout.get(1).items.some((i) => i.label.includes('gesteigert')));
});
