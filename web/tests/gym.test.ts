import { describe, expect, test } from 'vitest';
import { autoPlace, GYM_ITEMS, gymProgress, hitsFrom, stoneHp } from '../src/lib/gym';
import { PATTERNS } from '../src/lib/animations';
import { propBounds } from '../src/lib/drawFigure';

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

import { readFileSync } from 'node:fs';
import { firstNameOf, gymNameIdeas, ALL_DECO, chestsEarned, cleanGym, CHEST_DECO, DECO_SHOP, fromSlots, nextTier, placeNew, tierFor, TIERS } from '../src/lib/gym';

describe('Mein Gym gestalten', () => {
  test('Ausbaustufen nach gefundenen Geräten', () => {
    expect(tierFor(0).id).toBe('garage');
    expect(tierFor(6).id).toBe('studio');
    expect(tierFor(14).id).toBe('halle');
    expect(tierFor(28).id).toBe('elevation');
    expect(tierFor(28).empore).toBe(true);
    expect(nextTier(5)?.id).toBe('studio');
    expect(nextTier(22)).toBeNull();
    expect(TIERS.map((t) => t.max)).toEqual([8, 16, 28, 40]);
  });
  test('Kisten nach Stein 5, 10, …, 28', () => {
    expect(chestsEarned(4)).toEqual([]);
    expect(chestsEarned(5).map((c) => c.id)).toEqual(['chest_trophy']);
    expect(chestsEarned(28)).toHaveLength(CHEST_DECO.length);
  });
  test('Daten werden geprüft: Fremdes, Doppeltes, zu viel und Empore ohne Ausbau fallen raus', () => {
    const owned = new Set(['bench', 'pullup']);
    const g = cleanGym({ name: 'X'.repeat(40), objects: [
      { id: 'bench', x: 150, y: -5, level: 1 }, { id: 'bench', x: 1, y: 1, level: 0 }, { id: 'hack-evil', x: 1, y: 1 }, { id: 'pullup', x: '1', y: 2 },
      ...Array.from({ length: 20 }, () => ({ id: 'gym_plant', x: 5, y: 5, level: 0 })),
    ] }, owned, tierFor(0));
    expect(g.name).toHaveLength(24);
    expect(g.objects).toEqual([{ id: 'bench', x: 100, y: 0, level: 0 }, { id: 'gym_plant', x: 5, y: 5, level: 0 }]);
    expect(cleanGym(null, owned, tierFor(0))).toEqual({ name: '', objects: [] });
    expect(cleanGym({ objects: [{ id: 'bench', x: 5, y: 5, level: 1 }] }, owned, tierFor(28)).objects[0].level).toBe(1);
  });
  test('alte 12-Platz-Aufstellung wird übernommen, neue Dinge stehen nicht aufeinander', () => {
    expect(fromSlots(['bench', null, null, null, null, 'pullup'])).toEqual([{ id: 'bench', x: 12.5, y: 10, level: 0 }, { id: 'pullup', x: 37.5, y: 45, level: 0 }]);
    let g = { name: '', objects: [] as ReturnType<typeof fromSlots> };
    for (const id of ['a', 'b', 'c', 'd']) g = placeNew(g, id);
    const pos = g.objects.map((o) => `${o.x}/${o.y}`);
    expect(new Set(pos).size).toBe(4);
  });
  test('Deko-Preise passen zum Server (schema.sql)', () => {
    const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
    const block = sql.slice(sql.indexOf('-- Gym-Deko'), sql.indexOf('on conflict', sql.indexOf('-- Gym-Deko')));
    const rows = [...block.matchAll(/\('([a-z_]+)',\s*'gymdeco',\s*'[^']+',\s*(\d+)\)/g)].map((m) => ({ id: m[1], price: Number(m[2]) }));
    expect(rows).toEqual(DECO_SHOP.map(({ id, price }) => ({ id, price })));
  });
});

describe('Ansicht & echte Größen', () => {
  test('übernimmt alte Spiegelung als Ansicht von rechts und prüft rot', () => {
    const g = cleanGym({ objects: [{ id: 'bench', x: 1, y: 2, level: 0, flip: true }, { id: 'pullup', x: 1, y: 2, level: 0, rot: 2 }, { id: 'dip', x: 1, y: 2, level: 0, rot: 7 }] }, new Set(), TIERS[0]);
    expect(g.objects.map((o) => o.rot ?? 0)).toEqual([3, 2, 0]);
  });
  test('alle Deko hat eine echte Höhe, alle Stufen eine Raumbreite', () => {
    for (const d of ALL_DECO) expect(d.h).toBeGreaterThan(0.1);
    for (const t of TIERS) expect(t.meters).toBeGreaterThan(3);
  });
  test('Geräte in echten Größenverhältnissen', () => {
    const h = (id: string) => { const b = propBounds(PATTERNS[GYM_ITEMS.find((i) => i.id === id)!.pattern]); return b.max[1] - b.min[1]; };
    expect(h('pullup')).toBeGreaterThan(h('bench') * 1.4);
    expect(h('pullup')).toBeGreaterThan(2);
    for (const it of GYM_ITEMS) { const v = h(it.id); expect(v, it.id).toBeGreaterThan(0.3); expect(v, it.id).toBeLessThan(2.8); }
  });
});

describe('Namensideen', () => {
  test('6 verschiedene, kurze, freundliche Vorschläge', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ideas = gymNameIdeas(seed, { firstName: 'Lukas', focus: 'beine', tier: 'garage' }, (s) => /schlecht/i.test(s));
      expect(ideas).toHaveLength(6);
      expect(new Set(ideas.map((i) => i.name)).size).toBe(6);
      for (const i of ideas) expect(i.name.length).toBeLessThanOrEqual(24);
      expect(ideas[0].personal).toBe(true);
    }
  });
  test('persönlich: Vorname mit Apostroph, Muskelgruppe', () => {
    const all = Array.from({ length: 30 }, (_, s) => gymNameIdeas(s, { firstName: 'Lukas', focus: 'beine' }).filter((i) => i.personal).map((i) => i.name)).flat();
    expect(all.some((n) => n.startsWith('Lukas’ '))).toBe(true);
    expect(all.some((n) => ['Leg Day Lab', 'Quad Factory', 'Squat Society'].includes(n))).toBe(true);
    expect(gymNameIdeas(1, { firstName: 'Anna' }).some((i) => i.name.startsWith('Annas '))).toBe(true);
  });
  test('anderer seed → andere Liste; ohne Kontext keine persönlichen', () => {
    expect(gymNameIdeas(1).map((i) => i.name)).not.toEqual(gymNameIdeas(2).map((i) => i.name));
    expect(gymNameIdeas(3).some((i) => i.personal)).toBe(false);
  });
  test('Vorname aus Anzeigename', () => {
    expect(firstNameOf('lukas.brunotte')).toBe('Lukas');
    expect(firstNameOf('Du')).toBe('');
    expect(firstNameOf('x1')).toBe('');
  });
});

describe('Vintage Holz-Gym', () => {
  test('Stil wird geprüft und gespeichert', () => {
    expect(cleanGym({ style: 'vintage', objects: [] }, new Set(), TIERS[0]).style).toBe('vintage');
    expect(cleanGym({ style: 'quatsch', objects: [] }, new Set(), TIERS[0]).style).toBeUndefined();
  });
  test('Vintage-Deko im Laden, mit Höhe', () => {
    const v = ALL_DECO.filter((d) => d.vintage);
    expect(v.length).toBe(8);
    for (const d of v) { expect(d.id.startsWith('gym_v_')).toBe(true); expect(d.price).toBeGreaterThan(0); }
  });
});
