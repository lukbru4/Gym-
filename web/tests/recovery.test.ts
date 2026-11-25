import { describe, expect, test } from 'vitest';
import { readiness, recoveryAdjust, recoverySetCount } from '../src/lib/recovery';
import { suggestProgress } from '../src/lib/progression';

describe('Erholungsabfrage', () => {
  test('Tagesform aus Schlaf, Energie, Muskelkater', () => {
    expect(readiness({ sleep: 2, energy: 2, soreness: 2 })).toBe('high');
    expect(readiness({ sleep: 2, energy: 2, soreness: 1 })).toBe('high');
    expect(readiness({ sleep: 1, energy: 1, soreness: 1 })).toBe('normal');
    expect(readiness({ sleep: 0, energy: 1, soreness: 0 })).toBe('low');
    expect(readiness({ sleep: 0, energy: 2, soreness: 1 })).toBe('low'); // sehr schlecht geschlafen
    expect(readiness({ sleep: 2, energy: 1, soreness: 0 })).toBe('low'); // starker Muskelkater
    expect(readiness({ sleep: 1, energy: 2, soreness: 1 })).toBe('normal');
  });
  test('niedrige Tagesform: ca. 10 % weniger als das letzte Arbeitsgewicht', () => {
    const s = suggestProgress([{ weight_kg: 60, reps: 10 }, { weight_kg: 60, reps: 10 }], 10)!; // normal 62,5
    const r = recoveryAdjust(s);
    expect(r.weight).toBe(55);
    expect(r.action).toBe('down');
    expect(r.why).toContain('weniger erholt');
  });
  test('Satzzahl: einer weniger, mindestens zwei', () => {
    expect(recoverySetCount(4)).toBe(3);
    expect(recoverySetCount(3)).toBe(2);
    expect(recoverySetCount(2)).toBe(2);
  });
});
