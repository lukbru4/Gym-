import { test } from 'vitest';
import assert from 'node:assert/strict';
import { strengthLevels, musclesOf, DEFAULT_MUSCLES, MUSCLES } from '../src/lib/muscles';
import { estimate1RM } from '../src/lib/stats';

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

test('Übungsauswahl: Kategorien und Suche', async () => {
  const { filterExercises, exerciseCategories } = await import('../src/lib/muscles');
  const list = [
    { id: 1, name: 'Bankdrücken', type: 'strength', user_id: null },
    { id: 2, name: 'Dips', type: 'strength', user_id: null },
    { id: 3, name: 'Laufband', type: 'cardio', user_id: null },
    { id: 4, name: 'Hip Thrust', type: 'strength', user_id: 'u1' },
    { id: 5, name: 'Latziehen', type: 'strength', user_id: null, muscles: ['lat'] },
  ];
  const ids = (o) => filterExercises(list, o).map((e) => e.id);
  assert.deepEqual([...exerciseCategories(list[1])].sort(), ['arme', 'brust']);
  assert.deepEqual(ids({}), [1, 2, 5, 3, 4], 'Beliebte zuerst (Katalog-Klassiker), eigene Übungen danach');
  assert.deepEqual(ids({ category: 'brust' }), [1, 2]);
  assert.deepEqual(ids({ category: 'beine' }), [4]);
  assert.deepEqual(ids({ category: 'eigene' }), [4]);
  assert.deepEqual(ids({ category: 'cardio' }), [3]);
  assert.deepEqual(ids({ query: 'drucken' }), [1], 'ohne Umlaut findet Umlaut');
  assert.deepEqual(ids({ query: 'gesäß' }), [4], 'Suche nach Muskelname');
  assert.deepEqual(ids({ query: 'latissimus', category: 'ruecken' }), [5], 'Muskelname + Kategorie Rücken');
  assert.deepEqual(ids({ query: 'xyz' }), []);
});
