import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strengthLevels, musclesOf, DEFAULT_MUSCLES, MUSCLES } from '../js/muscles.js';
import { estimate1RM } from '../js/stats.js';

const exercises = new Map([
  [1, { name: 'Latziehen', type: 'strength', muscles: ['lat'] }],
  [2, { name: 'Bizepscurls', type: 'strength', muscles: [] }], // Fallback über Namen
  [3, { name: 'Laufband', type: 'cardio', muscles: [] }],
]);

test('Standardübungen verweisen nur auf bekannte Muskeln', () => {
  const known = new Set(MUSCLES.map(([id]) => id));
  for (const [name, ms] of Object.entries(DEFAULT_MUSCLES)) {
    for (const m of ms) assert.ok(known.has(m), `${name}: ${m}`);
  }
  assert.deepEqual(musclesOf(exercises.get(2)), ['bizeps']);
});

test('Kraft-Stufe aus Steigerung des 1RM, Aufwärmsätze ignoriert', () => {
  const sets = [
    { exercise_id: 1, date: '2026-06-01', reps: 5, weight_kg: 40 },
    { exercise_id: 1, date: '2026-06-01', reps: 30, weight_kg: 60, is_warmup: true }, // ignoriert
    { exercise_id: 1, date: '2026-09-20', reps: 5, weight_kg: 50 },
    { exercise_id: 2, date: '2026-09-20', reps: 10, weight_kg: 10 },
    { exercise_id: 3, date: '2026-09-20', duration_min: 20 },
  ];
  const levels = strengthLevels(sets, exercises, '2026-09-25');
  const lat = levels.get('lat');
  assert.ok(Math.abs(lat.gain - (estimate1RM(50, 5) / estimate1RM(40, 5) - 1)) < 1e-9); // +25 %
  assert.equal(lat.level, 3);
  assert.equal(levels.get('bizeps').level, 1); // nur ein Training → 0 %
  assert.equal(levels.get('brust').level, 0); // nie trainiert
});

test('Ohne Training in den letzten 30 Tagen zählt das letzte Training', () => {
  const sets = [
    { exercise_id: 1, date: '2026-01-01', reps: 5, weight_kg: 40 },
    { exercise_id: 1, date: '2026-03-01', reps: 5, weight_kg: 80 },
  ];
  assert.equal(strengthLevels(sets, exercises, '2026-09-25').get('lat').level, 5); // +100 %
});
