import { describe, expect, test } from 'vitest';
import {
  blockFor,
  groupSets,
  lastPerformance,
  isUnilateral,
  numberSets,
  partnerOf,
  parseRow,
  parseRowLoose,
  previousFor,
  rowLabels,
  setUnilateral,
  stateFromTemplate,
  templateFromWorkout,
  type Block,
} from '../src/lib/editor';
import { parseNum } from '../src/lib/format';
import type { Exercise, Template, Workout, WorkoutSet } from '../src/lib/types';

const bank: Exercise = { id: 1, name: 'Bankdrücken', type: 'strength', user_id: null };
const lauf: Exercise = { id: 2, name: 'Laufband', type: 'cardio', user_id: null };
const byId = (id: number) => [bank, lauf].find((e) => e.id === id);

describe('Zahlen aus Eingabefeldern', () => {
  test('Komma und Punkt, leer, ungültig', () => {
    expect(parseNum('62,5')).toBe(62.5);
    expect(parseNum('62.5')).toBe(62.5);
    expect(parseNum('  ')).toBeNull();
    expect(parseNum('abc')).toBeNaN();
    expect(parseNum('-3')).toBeNaN();
  });
});

describe('parseRow', () => {
  test('Kraftsatz braucht ganze Wiederholungen', () => {
    expect(parseRow({ reps: '8', weight_kg: '40' }, false)).toEqual({ reps: 8, weight_kg: 40, is_warmup: false });
    expect(parseRow({ reps: '10', weight_kg: '' }, false)).toEqual({ reps: 10, weight_kg: 0, is_warmup: false });
    expect(parseRow({ reps: '', weight_kg: '' }, false)).toBeNull();
    expect(() => parseRow({ reps: '7,5', weight_kg: '40' }, false)).toThrow(/ganze Zahl/);
    expect(() => parseRow({ reps: '', weight_kg: '40' }, false)).toThrow();
    expect(() => parseRow({ reps: 'x', weight_kg: '40' }, false)).toThrow(/Zahlen/);
  });
  test('Aufwärmsatz wird übernommen', () => {
    expect(parseRow({ warmup: true, reps: '5', weight_kg: '20' }, false)?.is_warmup).toBe(true);
  });
  test('Cardio: Dauer oder Distanz genügt', () => {
    expect(parseRow({ duration_min: '20', distance_km: '' }, true)).toEqual({ duration_min: 20, distance_km: null });
    expect(parseRow({ duration_min: '', distance_km: '' }, true)).toBeNull();
  });
  test('Vorlagen dürfen leere Zielwerte haben', () => {
    expect(parseRowLoose({ warmup: true, reps: '', weight_kg: '20' }, false)).toEqual({ warmup: true, reps: null, weight_kg: 20 });
    expect(() => parseRowLoose({ reps: '1,5' }, false)).toThrow();
  });
});

describe('Sätze gruppieren und nummerieren', () => {
  const sets = [
    { exercise_id: 1, is_warmup: true },
    { exercise_id: 1 },
    { exercise_id: 1 },
    { exercise_id: 2 },
    { exercise_id: 1 },
  ];
  test('nur aufeinanderfolgende Sätze derselben Übung bilden einen Block', () => {
    expect(groupSets(sets).map((g) => [g.exercise, g.sets.length])).toEqual([[1, 3], [2, 1], [1, 1]]);
  });
  test('Aufwärmsätze heißen A, Arbeitssätze werden gezählt', () => {
    expect(numberSets(sets.slice(0, 3)).map(([, l]) => l)).toEqual(['A', '1', '2']);
  });
});

describe('„Vorherig“: letzte Ausführung einer Übung', () => {
  const workouts: Workout[] = [
    { id: 20, date: '2026-09-24' },
    { id: 10, date: '2026-09-17' },
  ]; // neueste zuerst
  const sets: WorkoutSet[] = [
    { workout_id: 10, exercise_id: 1, position: 0, reps: 8, weight_kg: 30 },
    { workout_id: 20, exercise_id: 1, position: 1, reps: 8, weight_kg: 35 },
    { workout_id: 20, exercise_id: 1, position: 0, reps: 5, weight_kg: 20, is_warmup: true },
  ];
  test('nimmt das neueste Training, sortiert nach Position', () => {
    const prev = lastPerformance(workouts, sets, null).get(1)!;
    expect(prev.map((s) => s.weight_kg)).toEqual([20, 35]);
  });
  test('ein Training kann ausgeschlossen werden (beim Bearbeiten)', () => {
    expect(lastPerformance(workouts, sets, 20).get(1)!.map((s) => s.weight_kg)).toEqual([30]);
  });
  test('n-ter Aufwärmsatz ↔ n-ter Aufwärmsatz, n-ter Arbeitssatz ↔ n-ter Arbeitssatz', () => {
    const prev = lastPerformance(workouts, sets, null).get(1)!;
    const block: Block = { exercise_id: 1, sets: [{ warmup: true }, { warmup: false }, { warmup: false }] };
    expect(previousFor(prev, block, 0)?.weight_kg).toBe(20);
    expect(previousFor(prev, block, 1)?.weight_kg).toBe(35);
    expect(previousFor(prev, block, 2)).toBeNull();
  });
  test('neue Übung übernimmt die Satzstruktur vom letzten Mal', () => {
    const prev = lastPerformance(workouts, sets, null).get(1);
    expect(blockFor(bank, prev).sets.map((s) => Boolean(s.warmup))).toEqual([true, false]);
    expect(blockFor(lauf, undefined).sets).toEqual([{ duration_min: '', distance_km: '' }]);
  });
});

describe('Vorlagen', () => {
  const template: Template = {
    id: 7,
    name: 'Push',
    exercises: [
      { exercise_id: 1, rest_seconds: 120, sets: [{ warmup: true, reps: 5, weight_kg: 20 }, { reps: 8, weight_kg: 35 }] },
      { exercise_id: 99, sets: [{ reps: 8 }] }, // gelöschte Übung → wird übersprungen
    ],
  };
  test('Training aus Vorlage: Zielwerte als Platzhalter, Pause übernommen', () => {
    const s = stateFromTemplate(template, byId);
    expect(s.template_id).toBe(7);
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0].rest_seconds).toBe(120);
    expect(s.blocks[0].sets[1]).toMatchObject({ warmup: false, reps: '', target: { reps: 8, weight_kg: 35 } });
  });
  test('Vorlage aktualisieren: geschaffte Werte, sonst alte Zielwerte', () => {
    const s = stateFromTemplate(template, byId);
    s.blocks[0].sets[1] = { ...s.blocks[0].sets[1], reps: '9', weight_kg: '37,5', done: true };
    const out = templateFromWorkout(s.blocks, byId);
    expect(out[0].sets).toEqual([
      { warmup: true, reps: 5, weight_kg: 20 },
      { warmup: false, reps: 9, weight_kg: 37.5 },
    ]);
  });
});

describe('Kommentar-Filter', async () => {
  const { isOffensive } = await import('../src/lib/moderation');
  test('sperrt Beleidigungen, lässt normale Kommentare durch', () => {
    expect(isOffensive('Stark gemacht! 💪')).toBe(false);
    expect(isOffensive('Starke Leistung, weiter so')).toBe(false);
    expect(isOffensive('Du ARSCHLOCH')).toBe(true);
    expect(isOffensive('what the fuck')).toBe(true);
  });
});

describe('einseitig (L/R)', () => {
  const ws = (o: Partial<WorkoutSet>): WorkoutSet => ({ workout_id: 1, exercise_id: 5, ...o });

  test('numberSets zählt L/R-Paare als einen Satz', () => {
    const labels = numberSets([{ is_warmup: true, side: 'L' as const }, { is_warmup: true, side: 'R' as const }, { side: 'L' as const }, { side: 'R' as const }, { side: 'L' as const }, { side: 'R' as const }]).map(([, l]) => l);
    expect(labels).toEqual(['AL', 'AR', '1L', '1R', '2L', '2R']);
    expect(rowLabels([{ warmup: true }, {}, {}])).toEqual(['A', '1', '2']);
  });

  test('setUnilateral verdoppelt Sätze und nimmt sie wieder zurück', () => {
    const b: Block = { exercise_id: 5, sets: [{ warmup: true, reps: '12', weight_kg: '8' }, { reps: '10', weight_kg: '12' }] };
    const on = setUnilateral(b, true);
    expect(on.sets.map((r) => `${r.side}${r.reps}`)).toEqual(['L12', 'R12', 'L10', 'R10']);
    expect(isUnilateral(on)).toBe(true);
    expect(setUnilateral(on, true)).toEqual(on);
    const off = setUnilateral(on, false);
    expect(off.sets).toEqual(b.sets);
    expect(partnerOf(on.sets, 2)).toBe(3);
    expect(partnerOf(on.sets, 3)).toBe(2);
    expect(partnerOf(b.sets, 0)).toBe(-1);
  });

  test('previousFor: gleiche Seite, sonst n-ter Satz für beide Seiten', () => {
    const block: Block = { exercise_id: 5, sets: [{ side: 'L' }, { side: 'R' }, { side: 'L' }, { side: 'R' }] };
    const uni = [ws({ reps: 10, side: 'L' }), ws({ reps: 9, side: 'R' }), ws({ reps: 8, side: 'L' }), ws({ reps: 7, side: 'R' })];
    expect([0, 1, 2, 3].map((i) => previousFor(uni, block, i)?.reps)).toEqual([10, 9, 8, 7]);
    const both = [ws({ reps: 12 }), ws({ reps: 11 })];
    expect([0, 1, 2, 3].map((i) => previousFor(both, block, i)?.reps)).toEqual([12, 12, 11, 11]);
    const plain: Block = { exercise_id: 5, sets: [{}, {}] };
    expect([0, 1].map((i) => previousFor(uni, plain, i)?.reps)).toEqual([10, 8]);
  });

  test('Seite wird gespeichert, in Vorlagen übernommen und wieder geladen', () => {
    expect(parseRow({ side: 'R', reps: '8', weight_kg: '14' }, false)).toEqual({ reps: 8, weight_kg: 14, is_warmup: false, side: 'R' });
    expect(parseRow({ reps: '8', weight_kg: '14' }, false)).not.toHaveProperty('side');
    expect(parseRowLoose({ side: 'L', reps: '', weight_kg: '' }, false)).toMatchObject({ side: 'L' });
    const ex: Exercise = { id: 5, name: 'Kurzhantel-Curl einarmig', type: 'strength', user_id: null };
    const blocks: Block[] = [{ exercise_id: 5, sets: [{ side: 'L', reps: '10', weight_kg: '12' }, { side: 'R', reps: '9', weight_kg: '12' }] }];
    const t = templateFromWorkout(blocks, () => ex);
    expect(t[0].sets.map((s) => s.side)).toEqual(['L', 'R']);
    const st = stateFromTemplate({ id: 1, name: 'Arme', exercises: t }, () => ex);
    expect(st.blocks[0].sets.map((r) => r.side)).toEqual(['L', 'R']);
    expect(blockFor(ex, [ws({ side: 'L' }), ws({ side: 'R' })]).sets.map((r) => r.side)).toEqual(['L', 'R']);
  });
});
