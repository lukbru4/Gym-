import { describe, expect, test } from 'vitest';
import { cycleInfo, cycleLength, deloadAdjust, deloadSetCount, withNewCycle } from '../src/lib/cycle';
import { suggestProgress } from '../src/lib/progression';

const sets = (w: number, reps: number[]) => reps.map((r) => ({ weight_kg: w, reps: r }));

describe('Wochen-Zyklus', () => {
  test('Zykluslänge nach Erfahrung', () => {
    expect(cycleLength('neu')).toBe(4);
    expect(cycleLength('basis')).toBe(4);
    expect(cycleLength('mittel')).toBe(5);
    expect(cycleLength('profi')).toBe(6);
    expect(cycleLength(undefined)).toBe(4);
  });
  test('Wochenzählung ab dem Start', () => {
    expect(cycleInfo('2026-10-05', '2026-10-05', 4)).toEqual({ week: 1, total: 4, cycleNo: 1, deload: false });
    expect(cycleInfo('2026-10-05', '2026-10-11', 4).week).toBe(1);
    expect(cycleInfo('2026-10-05', '2026-10-12', 4).week).toBe(2);
    expect(cycleInfo('2026-10-05', '2026-10-26', 4)).toEqual({ week: 4, total: 4, cycleNo: 1, deload: true });
  });
  test('nach dem Zyklusende beginnt der nächste automatisch', () => {
    expect(cycleInfo('2026-10-05', '2026-11-02', 4)).toEqual({ week: 1, total: 4, cycleNo: 2, deload: false });
    expect(cycleInfo('2026-10-05', '2026-11-23', 4)).toEqual({ week: 4, total: 4, cycleNo: 2, deload: true });
  });
  test('Datum vor dem Start zählt als Woche 1', () => {
    expect(cycleInfo('2026-10-05', '2026-10-01', 5).week).toBe(1);
  });
  test('neuer Zyklus wird in den Antworten gespeichert', () => {
    expect(withNewCycle({ exp: 'profi' }, '2026-10-12')).toMatchObject({ cycleStart: '2026-10-12', cycleWeeks: '6' });
  });
  test('Entlastung: ca. 10 % weniger als das letzte Arbeitsgewicht', () => {
    const s = suggestProgress(sets(60, [10, 10, 10]), 10)!; // normal: 62,5
    const d = deloadAdjust(s);
    expect(d.weight).toBe(55); // 60 × 0,9 = 54 → Schritt 2,5 → 55
    expect(d.action).toBe('down');
    expect(d.repsTo).toBe(10);
    expect(d.why).toContain('Entlastungswoche');
  });
  test('Entlastung: kleine Gewichte in 1-kg-Schritten, nie unter einem Schritt', () => {
    expect(deloadAdjust(suggestProgress(sets(10, [12, 12]), 12)!).weight).toBe(9);
    expect(deloadAdjust(suggestProgress(sets(1, [12]), 12)!).weight).toBeGreaterThanOrEqual(1);
  });
  test('Satzzahl: einer weniger, mindestens zwei', () => {
    expect(deloadSetCount(4)).toBe(3);
    expect(deloadSetCount(3)).toBe(2);
    expect(deloadSetCount(2)).toBe(2);
    expect(deloadSetCount(1)).toBe(1);
  });
});
