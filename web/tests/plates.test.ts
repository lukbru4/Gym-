import { describe, expect, test } from 'vitest';
import { isBarbell, platesFor, plateText, warmupSets } from '../src/lib/plates';
import { nextInRound, roundStart, supersetLabels, templateBlocks, templateFromBlocks } from '../src/lib/editor';

describe('Scheibenrechner', () => {
  test('genaue Aufteilung je Seite', () => {
    expect(platesFor(100).perSide).toEqual([25, 15]);
    expect(platesFor(62.5).perSide).toEqual([20, 1.25]);
    expect(platesFor(20)).toMatchObject({ perSide: [], exact: true, loaded: 20 });
    expect(plateText(platesFor(142.5).perSide)).toBe('25 + 25 + 10 + 1,25');
    expect(platesFor(60, 15).perSide).toEqual([20, 2.5]);
    expect(platesFor(100, 20, [20, 10, 5, 2.5, 1.25]).perSide).toEqual([20, 20]);
  });
  test('nicht genau machbar → nächste Lasten', () => {
    const r = platesFor(61);
    expect(r.exact).toBe(false);
    expect([r.lower, r.upper]).toEqual([60, 62.5]);
    expect(platesFor(10).exact).toBe(false);
  });
  test('Langhantel-Übungen erkennen', () => {
    expect(isBarbell('Bankdrücken')).toBe(true);
    expect(isBarbell('Kreuzheben')).toBe(true);
    expect(isBarbell('Kniebeuge')).toBe(true);
    expect(isBarbell('Kurzhantel-Bankdrücken')).toBe(false);
    expect(isBarbell('Latzug')).toBe(false);
  });
});

describe('Aufwärmsätze', () => {
  test('100 kg: Stange, 40 %, 60 %, 80 %', () => {
    expect(warmupSets(100)).toEqual([{ weight: 20, reps: 10 }, { weight: 40, reps: 8 }, { weight: 60, reps: 5 }, { weight: 80, reps: 3 }]);
  });
  test('leicht: zwei Sätze, nie schwerer als Arbeitsgewicht, keine Dopplungen', () => {
    expect(warmupSets(30, 20)).toEqual([{ weight: 15, reps: 10 }, { weight: 22.5, reps: 5 }]);
    const w = warmupSets(45);
    expect(w.every((x) => x.weight < 45)).toBe(true);
    expect(new Set(w.map((x) => x.weight)).size).toBe(w.length);
    expect(warmupSets(0)).toEqual([]);
  });
});

describe('Supersätze', () => {
  const blocks = [{ superset: true }, {}, {}, { superset: true }, { superset: true }, {}];
  test('Etiketten A1/A2, B1/B2/B3', () => {
    expect(supersetLabels(blocks)).toEqual(['A1', 'A2', null, 'B1', 'B2', 'B3']);
    expect(supersetLabels([{}, { superset: true }])).toEqual([null, null]);
  });
  test('Runde: weiter ohne Pause, Ende der Runde', () => {
    expect(nextInRound(blocks, 0)).toBe(1);
    expect(nextInRound(blocks, 1)).toBeNull();
    expect(roundStart(blocks, 1)).toBe(0);
    expect(roundStart(blocks, 5)).toBe(3);
    expect(roundStart(blocks, 2)).toBe(2);
  });
  test('bleibt in der Vorlage erhalten', () => {
    const ex = () => ({ id: 1, name: 'Bankdrücken', type: 'strength' as const, user_id: null, muscles: [] });
    const t = templateFromBlocks([{ exercise_id: 1, superset: true, sets: [{ warmup: false, reps: '8', weight_kg: '60' }] }, { exercise_id: 1, sets: [{ warmup: false, reps: '8', weight_kg: '60' }] }], ex);
    expect(t.map((e) => e.superset)).toEqual([true, undefined]);
    expect(templateBlocks({ exercises: t }, ex).map((b) => b.superset)).toEqual([true, undefined]);
  });
});
