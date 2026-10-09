import { describe, expect, test } from 'vitest';
import { stepFor, suggestProgress, suggestionText } from '../src/lib/progression';

const sets = (w: number, reps: number[], warm = false) => reps.map((r) => ({ weight_kg: w, reps: r, is_warmup: warm }));

describe('Gewichtsvorschlag (Doppelte Progression)', () => {
  test('keine Daten → kein Vorschlag, Aufwärmsätze zählen nicht', () => {
    expect(suggestProgress(undefined)).toBeNull();
    expect(suggestProgress([])).toBeNull();
    expect(suggestProgress(sets(40, [8, 8], true))).toBeNull();
  });
  test('alle Sätze oben angekommen → Gewicht rauf', () => {
    const s = suggestProgress(sets(60, [10, 10, 10]), 10)!;
    expect(s.action).toBe('up');
    expect(s.weight).toBe(62.5);
    expect(s.repsFrom).toBe(6);
    expect(suggestionText(s)).toBe('62,5 kg × 6–8');
    expect(s.last).toBe('60 kg × 10, 10, 10');
  });
  test('noch nicht oben → gleiches Gewicht, eine Wiederholung mehr', () => {
    const s = suggestProgress(sets(60, [10, 9, 8]), 10)!;
    expect(s.action).toBe('same');
    expect(s.weight).toBe(60);
    expect(s.repsFrom).toBe(9);
    expect(s.repsTo).toBe(10);
  });
  test('deutlich zu wenige Wiederholungen → etwas weniger Gewicht', () => {
    const s = suggestProgress(sets(100, [3, 3, 2]), 10)!;
    expect(s.action).toBe('down');
    expect(s.weight).toBe(95);
  });
  test('ohne Planwert wird die Zielzahl aus den letzten Wiederholungen geschätzt', () => {
    expect(suggestProgress(sets(20, [12, 12, 12]))!.hi).toBe(12);
    expect(suggestProgress(sets(100, [5, 5, 5]))!.hi).toBe(8);
    expect(suggestProgress(sets(100, [5, 5, 5]))!.action).toBe('same');
    expect(suggestProgress(sets(100, [8, 8, 8]), 8)!.weight).toBe(105);
  });
  test('Schrittweite je nach Gewicht, Werte als Text aus der Datenbank', () => {
    expect(stepFor(12)).toBe(1);
    expect(stepFor(60)).toBe(2.5);
    expect(stepFor(140)).toBe(5);
    const s = suggestProgress([{ weight_kg: '12.00', reps: '12' }, { weight_kg: '12.00', reps: '12' }], 12)!;
    expect(s.weight).toBe(13);
  });
  test('schwerster Satz zählt, leichtere Sätze nicht', () => {
    const s = suggestProgress([...sets(50, [10]), ...sets(60, [8, 8])], 10)!;
    expect(s.weight).toBe(60);
    expect(s.last).toBe('60 kg × 8, 8');
  });
});
