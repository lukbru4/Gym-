import { describe, expect, it } from 'vitest';
import { buildSchedule, DEFAULTS } from '../src/lib/reminders';
import { cleanSupps, dueOn, streak, today, type Supplement } from '../src/lib/supplements';

const kre: Supplement = { id: 'k', name: 'Kreatin', dose: '5 g', time: '08:00', days: null, icon: '⚡', on: true };
// Dienstag, 3.11.2026, 07:00
const now = new Date(2026, 10, 3, 7, 0);
const ctx = { now, week: [], trainedToday: false, weekDone: 0, weekGoal: 3, pro: false };

describe('Supplements', () => {
  it('cleanSupps prüft Daten', () => {
    expect(cleanSupps(null)).toEqual([]);
    const c = cleanSupps([{ name: '  Zink ', time: 'xx', days: ['Mo', 'Mo?'] }, { name: '' }, 5]);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ name: 'Zink', time: '08:00', days: ['Mo'], on: true });
    expect(cleanSupps([{ name: 'A', days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] }])[0].days).toBeNull();
    expect(cleanSupps(Array.from({ length: 20 }, (_, i) => ({ name: `S${i}` })))).toHaveLength(12);
  });
  it('fällig nur an gewählten Tagen und wenn aktiv', () => {
    expect(dueOn(kre, '2026-11-03')).toBe(true);
    expect(dueOn({ ...kre, days: ['Mo'] }, '2026-11-03')).toBe(false);
    expect(dueOn({ ...kre, days: ['Mo'] }, '2026-11-02')).toBe(true);
    expect(dueOn({ ...kre, on: false }, '2026-11-03')).toBe(false);
    expect(today([kre], { '2026-11-03': ['k'] }, '2026-11-03')[0].taken).toBe(true);
  });
  it('Serie zählt fällige Tage in Folge', () => {
    const log = { '2026-11-01': ['k'], '2026-11-02': ['k'] };
    expect(streak(kre, log, '2026-11-03')).toBe(2);
    expect(streak(kre, { ...log, '2026-11-03': ['k'] }, '2026-11-03')).toBe(3);
    expect(streak(kre, { '2026-11-01': ['k'] }, '2026-11-03')).toBe(0);
    // nur montags: Lücken an anderen Tagen zählen nicht
    expect(streak({ ...kre, days: ['Mo'] }, { '2026-10-26': ['k'], '2026-11-02': ['k'] }, '2026-11-03')).toBe(2);
  });
  it('tägliche Erinnerung „Heute Kreatin nehmen“', () => {
    const list = buildSchedule(DEFAULTS, { ...ctx, supps: [kre] });
    expect(list).toHaveLength(7);
    expect(list[0].title).toBe('Heute Kreatin nehmen ⚡');
    expect(list[0].at!.getHours()).toBe(8);
    expect(list[0].route).toBe('#/supplements');
    expect(new Set(list.map((p) => p.id)).size).toBe(7);
    for (const p of list) expect(p.id >= 1500 && p.id < 1600 && p.id !== 1499).toBe(true);
  });
  it('schon genommen / inaktiv / anderer Tag → keine Erinnerung heute', () => {
    expect(buildSchedule(DEFAULTS, { ...ctx, supps: [kre], suppsTakenToday: ['k'] })[0].at!.getDate()).toBe(4);
    expect(buildSchedule(DEFAULTS, { ...ctx, supps: [{ ...kre, on: false }] })).toEqual([]);
    expect(buildSchedule(DEFAULTS, { ...ctx, supps: [{ ...kre, days: ['Fr'] }] })).toHaveLength(1);
  });
});
