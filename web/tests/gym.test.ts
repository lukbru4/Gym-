import { describe, expect, test } from 'vitest';
import { autoPlace, GYM_ITEMS, gymProgress, hitsFrom, stoneHp } from '../src/lib/gym';
import { PATTERNS } from '../src/lib/animations';

describe('Mein Gym', () => {
  test('jedes Gerät hat ein gezeichnetes Muster, IDs eindeutig', () => {
    for (const it of GYM_ITEMS) expect(PATTERNS[it.pattern], it.id).toBeTruthy();
    expect(new Set(GYM_ITEMS.map((i) => i.id)).size).toBe(GYM_ITEMS.length);
  });
  test('Steine werden härter, Fortschritt stimmt', () => {
    expect(stoneHp(0)).toBe(15);
    expect(stoneHp(1)).toBe(23);
    expect(gymProgress(0)).toMatchObject({ unlocked: [], stone: { index: 0, hp: 15, done: 0 } });
    expect(gymProgress(14).unlocked).toHaveLength(0);
    const p = gymProgress(15 + 23 + 5);
    expect(p.unlocked.map((i) => i.id)).toEqual(['bench', 'pullup']);
    expect(p.stone).toMatchObject({ index: 2, done: 5, hp: 31 });
    const all = GYM_ITEMS.reduce((s, _i, n) => s + stoneHp(n), 0);
    expect(gymProgress(all).stone).toBeNull();
    expect(gymProgress(all).unlocked).toHaveLength(GYM_ITEMS.length);
  });
  test('Aufwärmsätze zählen nicht', () => {
    expect(hitsFrom([{ is_warmup: true }, { is_warmup: false }, {}])).toBe(2);
  });
  test('neue Geräte kommen auf freie Plätze, vorhandene bleiben', () => {
    const l = autoPlace([null, 'bench', null], GYM_ITEMS.slice(0, 3));
    expect(l).toEqual(['pullup', 'bench', 'dip']);
    expect(autoPlace(['a', 'b'], GYM_ITEMS.slice(0, 1))).toEqual(['a', 'b']);
  });
});
