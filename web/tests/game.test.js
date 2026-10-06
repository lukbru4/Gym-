import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rankFromPoints, overallPoints } from '../src/lib/ranks';
import { computeQuests, computeMedals, longestStreak } from '../src/lib/quests';
import { computeProgress } from '../src/lib/xp';

test('Ränge: Stufen und Unterstufen III → I', () => {
  const r = (p) => rankFromPoints(p).label;
  assert.equal(r(0), 'Bronze III');
  assert.equal(r(49), 'Bronze III');
  assert.equal(r(50), 'Bronze II');
  assert.equal(r(100), 'Bronze I');
  assert.equal(r(149), 'Bronze I');
  assert.equal(r(150), 'Silber III');
  assert.equal(r(389), 'Silber I');
  assert.equal(r(390), 'Gold III');
  assert.equal(r(1800), 'Titan III');
  assert.equal(r(5000), 'Titan I');
  const g = rankFromPoints(427);
  assert.deepEqual([g.label, g.lp, g.needed], ['Gold III', 37, 120]);
  assert.equal(rankFromPoints(5000).progress, 1);
});

test('Gesamt-Rang = Schnitt der 5 besten Übungen', () => {
  assert.equal(overallPoints([]), 0);
  assert.equal(overallPoints([100, 200]), 150);
  assert.equal(overallPoints([500, 400, 300, 200, 100, 0, 0]), 300);
});

const ex = new Map([[1, { name: 'Latziehen', type: 'strength' }]]);
const s = (workout_id, reps, weight_kg) => ({ workout_id, exercise_id: 1, reps, weight_kg });

test('Aufgaben: tägliche und wöchentliche Belohnungen', () => {
  // Woche ab Mo 21.09.: Mo, Mi, Fr trainiert; Mi und Fr stärker
  const workouts = [{ id: 1, date: '2026-09-21' }, { id: 2, date: '2026-09-23' }, { id: 3, date: '2026-09-25' }];
  const sets = [
    ...Array.from({ length: 10 }, () => s(1, 8, 40)), // 10 Sätze am Mo
    s(2, 8, 42.5), // Steigerung + Rekord
    s(3, 8, 45), // Steigerung + Rekord
  ];
  const p = computeProgress(workouts, sets, ex);
  const q = computeQuests(p.perWorkout, '2026-09-25');
  // täglich: Mo train+sets10 = 40; Mi train+record = 55; Fr train+record = 55
  // wöchentlich: 3 Tage = 75 (erreicht am Fr); nur 2 Steigerungen → keine 60
  assert.equal(q.total, 40 + 55 + 55 + 75);
  assert.equal(q.byDate.get('2026-09-25'), 55 + 75);
  assert.deepEqual(q.today.map((x) => x.done), [true, false, true]);
  assert.deepEqual(q.week.map((x) => [x.id, x.value, x.done]), [['days3', 3, true], ['improve3', 2, false]]);
  // Tag ohne Training
  const empty = computeQuests(p.perWorkout, '2026-09-26');
  assert.deepEqual(empty.today.map((x) => x.done), [false, false, false]);
});

test('Medaillen und längste Serie', () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak(['2026-09-01', '2026-09-08', '2026-09-16', '2026-10-01']), 3); // Wochen 31.8., 7.9., 14.9.; dann Lücke
  const workouts = [{ id: 1, date: '2026-09-01' }, { id: 2, date: '2026-09-08' }];
  const p = computeProgress(workouts, [s(1, 5, 40), s(2, 5, 50)], ex);
  const medals = computeMedals(p.perWorkout, { maxStreak: 2, level: 1, templates: 1 });
  const byId = Object.fromEntries(medals.map((m) => [m.id, m]));
  assert.equal(byId.first.date, '2026-09-01');
  assert.equal(byId.record1.date, '2026-09-08');
  assert.equal(byId.ten.done, false);
  assert.equal(byId.template.done, true);
  assert.equal(byId.streak4.done, false);
});
