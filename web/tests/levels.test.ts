import { describe, expect, test } from 'vitest';
import { levelInfo, levelProgress, mixHex, muscleColor, oftenScore, STRENGTH_LEVELS, trainingTitle } from '../src/lib/levels';
import { LEVELS, type MuscleLevel } from '../src/lib/muscles';
import type { MuscleId, Workout } from '../src/lib/types';

const lv = (level: number, gain: number): MuscleLevel => ({ level, gain, exercises: [] });
describe('Stufen & Farben', () => {
  test('Namen und Reihenfolge Weiß → Gelb → Orange → Rot → Blau → Lila', () => {
    expect(STRENGTH_LEVELS.map((l) => l.name)).toEqual(['Untrainiert', 'Beginner', 'Fortgeschritten', 'Profi', 'Elite', 'Ultra']);
    expect(STRENGTH_LEVELS[0].light).toBe('#ffffff');
    // gleiche Grenzen wie die Kraft-Stufen im Körpergraph
    expect(STRENGTH_LEVELS.slice(2).map((l) => l.from)).toEqual(LEVELS.slice(1).map((l) => l.from));
  });
  test('innerhalb einer Stufe wird die Farbe dunkler', () => {
    expect(levelProgress(3, 0.15)).toBe(0);
    expect(levelProgress(3, 0.3)).toBe(1);
    const a = muscleColor(3, 0.16), b = muscleColor(3, 0.29);
    const sum = (c: string) => [1, 3, 5].reduce((s, i) => s + parseInt(c.slice(i, i + 2), 16), 0);
    expect(sum(b)).toBeLessThan(sum(a));
    expect(muscleColor(0, null)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(levelInfo(9).name).toBe('Ultra');
  });
});
describe('Titel', () => {
  const weeks = (perWeek: number, today = '2026-11-01'): Workout[] => Array.from({ length: perWeek * 8 }, (_, i) => ({ id: i + 1, date: new Date(Date.parse(today) - (i * 7 / perWeek) * 86400000).toISOString().slice(0, 10) }));
  const muscles = (level: number, n: number) => new Map<MuscleId, MuscleLevel>((['brust', 'lat', 'quadrizeps', 'schultern', 'bizeps', 'trizeps', 'bauch', 'gesaess', 'waden', 'beinbeuger'] as MuscleId[]).slice(0, n).map((m) => [m, lv(level, 0.6)]));
  test('am Anfang Beginner', () => {
    expect(trainingTitle([], new Map(), '2026-11-01').name).toBe('Beginner');
  });
  test('oft und stark → Ultra; oft aber schwach → Mitte', () => {
    expect(trainingTitle(weeks(4), muscles(5, 10), '2026-11-01').name).toBe('Ultra');
    const mid = trainingTitle(weeks(4), muscles(1, 10), '2026-11-01');
    expect(mid.level).toBe(3);
    expect(mid.next).toContain('stärker');
  });
  test('Häufigkeit in Punkten', () => {
    expect([0, 0.5, 1, 2, 3, 4, 6].map(oftenScore)).toEqual([1, 1, 2, 3, 4, 5, 5]);
  });
});
