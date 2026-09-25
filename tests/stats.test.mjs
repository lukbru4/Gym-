import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, addDays, estimate1RM, weeklySummary, exerciseProgress, personalRecords } from '../js/stats.js';

test('weekStart liefert den Montag', () => {
  assert.equal(weekStart('2026-09-25'), '2026-09-21'); // Freitag
  assert.equal(weekStart('2026-09-21'), '2026-09-21'); // Montag
  assert.equal(weekStart('2026-09-27'), '2026-09-21'); // Sonntag
  assert.equal(weekStart('2026-01-01'), '2025-12-29'); // Jahreswechsel
});

test('addDays über Monatsgrenzen', () => {
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(addDays('2026-03-01', -7), '2026-02-22');
});

test('estimate1RM (Epley)', () => {
  assert.equal(estimate1RM(100, 1), 100);
  assert.equal(estimate1RM(100, 10), 100 * (1 + 10 / 30));
  assert.equal(estimate1RM(0, 10), 0);
});

test('weeklySummary zählt Trainings, Volumen und Cardio pro Woche', () => {
  const workouts = [
    { id: 1, date: '2026-09-22' },
    { id: 2, date: '2026-09-24' },
    { id: 3, date: '2026-09-15' },
    { id: 4, date: '2025-01-01' }, // außerhalb
  ];
  const sets = [
    { workout_id: 1, reps: 10, weight_kg: 50 },
    { workout_id: 2, reps: 5, weight_kg: '100.00' },
    { workout_id: 2, duration_min: '30' },
    { workout_id: 3, reps: 8, weight_kg: 60 },
    { workout_id: 4, reps: 8, weight_kg: 60 },
  ];
  const weeks = weeklySummary(workouts, sets, '2026-09-25', 3);
  assert.deepEqual(weeks.map((w) => w.start), ['2026-09-07', '2026-09-14', '2026-09-21']);
  assert.deepEqual(weeks[2], { start: '2026-09-21', workouts: 2, volume: 1000, cardioMin: 30 });
  assert.deepEqual(weeks[1], { start: '2026-09-14', workouts: 1, volume: 480, cardioMin: 0 });
  assert.equal(weeks[0].workouts, 0);
});

test('exerciseProgress nimmt pro Tag den besten Satz', () => {
  const rows = exerciseProgress(
    [
      { date: '2026-09-22', reps: 5, weight_kg: 100 },
      { date: '2026-09-22', reps: 10, weight_kg: 80 },
      { date: '2026-09-15', reps: 5, weight_kg: 90 },
    ],
    'strength'
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].date, '2026-09-15');
  assert.equal(rows[1].maxWeight, 100);
  assert.ok(Math.abs(rows[1].e1rm - 100 * (1 + 5 / 30)) < 1e-9); // 116,7 > 106,7 (80 × 10)
  assert.equal(rows[1].volume, 1300);
});

test('personalRecords für Kraft und Cardio', () => {
  const exercises = new Map([
    [1, { name: 'Bankdrücken', type: 'strength' }],
    [2, { name: 'Laufband', type: 'cardio' }],
  ]);
  const recs = personalRecords(
    [
      { exercise_id: 1, workout_id: 10, date: '2026-09-01', reps: 5, weight_kg: 100 },
      { exercise_id: 1, workout_id: 10, date: '2026-09-01', reps: 5, weight_kg: 100 },
      { exercise_id: 1, workout_id: 11, date: '2026-09-08', reps: 12, weight_kg: 90 },
      { exercise_id: 2, workout_id: 10, date: '2026-09-01', duration_min: 20, distance_km: 3 },
      { exercise_id: 2, workout_id: 10, date: '2026-09-01', duration_min: 15, distance_km: 2 },
      { exercise_id: 2, workout_id: 11, date: '2026-09-08', duration_min: 30, distance_km: 4 },
    ],
    exercises
  );
  const bench = recs.find((r) => r.exercise === 'Bankdrücken');
  assert.deepEqual(bench.heaviest, { weight: 100, reps: 5, date: '2026-09-01' });
  assert.equal(bench.bestE1RM.date, '2026-09-08'); // 90 × 12 schlägt 100 × 5
  assert.deepEqual(bench.bestVolume, { value: 1080, date: '2026-09-08' });
  const run = recs.find((r) => r.exercise === 'Laufband');
  assert.deepEqual(run.longestDuration, { value: 35, date: '2026-09-01' });
  assert.deepEqual(run.longestDistance, { value: 5, date: '2026-09-01' });
});
