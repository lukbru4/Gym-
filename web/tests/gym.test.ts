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
import {
  firstNameOf, gymNameIdeas, ALL_DECO, BUILD_ITEMS, canBuild, chestsEarned, cleanGym, CHEST_DECO, DECO_SHOP, emptyGym, fromSlots, HANGING,
  MACHINE_PRICE, machineShopId, migrateGym, NPCS, ownedFrom, placeNew, roomFor, TIERS,
} from '../src/lib/gym';

describe('Neues Gym: vom Boden zum Studio', () => {
  test('Start: nur Boden, kleiner Raum ohne 2. Stock', () => {
    const r = roomFor([]);
    expect(r).toMatchObject({ id: 's', max: 8, empore: false, meters: 5 });
    expect(roomFor(['b_size_m']).max).toBe(16);
    expect(roomFor(['b_size_m', 'b_size_l', 'b_floor2'])).toMatchObject({ id: 'l', max: 40, empore: true, meters: 9 });
  });
  test('Bauteile bauen aufeinander auf', () => {
    const side = BUILD_ITEMS.find((b) => b.id === 'b_wall_sides')!;
    expect(canBuild(side, [])).toBe(false);
    expect(canBuild(side, ['b_wall_back'])).toBe(true);
    expect(canBuild(BUILD_ITEMS.find((b) => b.id === 'b_floor2')!, ['b_wall_back'])).toBe(false);
    // ungültige Reihenfolge wird beim Prüfen entfernt
    expect(cleanGym({ v: 2, build: ['b_wall_sides', 'b_window_1', 'quatsch'] }, new Set()).build).toEqual([]);
    expect(cleanGym({ v: 2, build: ['b_wall_back', 'b_window_1', 'b_window_2'] }, new Set()).build).toEqual(['b_wall_back', 'b_window_1', 'b_window_2']);
  });
  test('Geräte kosten je nach Seltenheit, Kauf-ID m_<gerät>', () => {
    expect(MACHINE_PRICE).toEqual({ 'gewöhnlich': 150, 'selten': 300, 'episch': 500, 'legendär': 800 });
    expect(machineShopId('bench')).toBe('m_bench');
    const o = ownedFrom(['m_bench', 'gym_plant'], ['m_pullup']);
    expect(o.has('bench') && o.has('pullup') && o.has('gym_plant') && !o.has('dip')).toBe(true);
  });
  test('Keine hängende Deko mehr', () => {
    expect(DECO_SHOP.some((d) => HANGING.has(d.id))).toBe(false);
    expect(cleanGym({ v: 2, objects: [{ id: 'gym_bag', x: 5, y: 5, level: 0 }] }, new Set(['gym_bag'])).objects).toEqual([]);
  });
  test('Leute: nur du und Freunde, frei im Gym, je Person einmal; Etage nur mit 2. Etage', () => {
    const g = cleanGym({ v: 2, objects: [{ id: 'bench', x: 10, y: 10, level: 0 }], people: [
      { who: 'me', id: 'me', on: 'bench' }, { who: 'npc', id: 'p_anna', on: 'bench' }, { who: 'me', id: 'me' },
      { who: 'friend', id: 'u1', name: 'Ben', level: 1 }, { who: 'alien', id: 'x' },
    ] }, new Set(['bench']));
    expect(g.people).toEqual([{ who: 'me', id: 'me' }, { who: 'friend', id: 'u1', name: 'Ben' }]);
    const up = cleanGym({ v: 2, build: ['b_size_m', 'b_wall_back', 'b_floor2'], people: [{ who: 'friend', id: 'u1', name: 'Ben', level: 1 }] }, new Set());
    expect(up.people).toEqual([{ who: 'friend', id: 'u1', name: 'Ben', level: 1 }]);
  });
  test('Geräte: Größe 0,6–1,8 und gerade Ansicht', () => {
    const g = cleanGym({ v: 2, objects: [{ id: 'bench', x: 10, y: 10, level: 0, size: 5, straight: true }, { id: 'pullup', x: 1, y: 1, level: 0, size: 'x' }, { id: 'dip', x: 1, y: 1, level: 0, size: 1.25 }] }, new Set(['bench', 'pullup', 'dip']));
    expect(g.objects.map((o) => [o.size, o.straight])).toEqual([[1.8, true], [undefined, undefined], [1.25, undefined]]);
  });
  test('Neues Objekt landet auf der gewählten Etage', () => {
    expect(placeNew(emptyGym(), 'bench', 1).objects[0].level).toBe(1);
  });
  test('Daten werden geprüft: Fremdes, Doppeltes, zu viel und 2. Stock ohne Ausbau fallen raus', () => {
    const owned = new Set(['bench', 'pullup']);
    const g = cleanGym({ name: 'X'.repeat(40), objects: [
      { id: 'bench', x: 150, y: -5, level: 1 }, { id: 'bench', x: 1, y: 1, level: 0 }, { id: 'hack-evil', x: 1, y: 1 }, { id: 'pullup', x: '1', y: 2 },
      ...Array.from({ length: 20 }, () => ({ id: 'gym_plant', x: 5, y: 5, level: 0 })),
    ] }, owned);
    expect(g.name).toHaveLength(24);
    expect(g.objects).toEqual([{ id: 'bench', x: 100, y: 0, level: 0 }, { id: 'gym_plant', x: 5, y: 5, level: 0 }]);
    expect(cleanGym(null, owned)).toEqual(emptyGym());
    expect(cleanGym({ v: 2, build: ['b_wall_back', 'b_size_m', 'b_floor2'], objects: [{ id: 'bench', x: 5, y: 5, level: 1 }] }, owned).objects[0].level).toBe(1);
  });
  test('Umstieg: altes Gym behält Geräte, Kisten-Deko und bekommt Wände geschenkt; neue Nutzer starten leer', () => {
    // 9 Steine (Studio) → 9 Geräte, Pokal (ab 5), Rückwand, Seitenwände, 2 Fenster, Spiegel
    let hits = 0;
    for (let n = 0; n < 9; n++) hits += 15 + 8 * n;
    const m = migrateGym({ name: 'Iron', objects: [{ id: 'bench', x: 10, y: 10, level: 0 }] }, true, hits);
    expect(m.v).toBe(2);
    expect(m.name).toBe('Iron');
    expect(m.legacy.filter((x) => x.startsWith('m_'))).toHaveLength(9);
    expect(m.legacy).toContain('chest_trophy');
    expect(m.build).toEqual(expect.arrayContaining(['b_wall_back', 'b_wall_sides', 'b_window_1', 'b_window_2', 'b_mirror']));
    expect(migrateGym(null, false, hits)).toEqual(emptyGym());
    const v2 = { ...emptyGym(), name: 'Neu' };
    expect(migrateGym(v2, true, hits)).toBe(v2);
  });
  test('Kisten nach Stein 5, 10, …, 28 (nur noch für den Umstieg)', () => {
    expect(chestsEarned(4)).toEqual([]);
    expect(chestsEarned(28)).toHaveLength(CHEST_DECO.length);
    expect(TIERS.map((t) => t.max)).toEqual([8, 16, 28, 40]);
  });
  test('alte 12-Platz-Aufstellung wird übernommen, neue Dinge stehen nicht aufeinander', () => {
    expect(fromSlots(['bench', null, null, null, null, 'pullup'])).toEqual([{ id: 'bench', x: 12.5, y: 10, level: 0 }, { id: 'pullup', x: 37.5, y: 45, level: 0 }]);
    let g = emptyGym();
    for (const id of ['a', 'b', 'c', 'd']) g = placeNew(g, id);
    expect(new Set(g.objects.map((o) => `${o.x}/${o.y}`)).size).toBe(4);
  });
  const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
  const rowsOf = (marker: string, kinds: string) => {
    const block = sql.slice(sql.indexOf(marker), sql.indexOf('on conflict', sql.indexOf(marker)));
    return [...block.matchAll(new RegExp(`\\('([a-z0-9_-]+)',\\s*'(${kinds})',\\s*'[^']+',\\s*(\\d+)\\)`, 'g'))].map((m) => ({ id: m[1], price: Number(m[3]) }));
  };
  test('Deko-Preise passen zum Server (schema.sql), hängende Deko wird nicht mehr verkauft', () => {
    expect(rowsOf('-- Gym-Deko', 'gymdeco').filter((r) => !HANGING.has(r.id))).toEqual(DECO_SHOP.map(({ id, price }) => ({ id, price })));
    expect(sql).toMatch(/update public\.shop_items set active = false where id in \('gym_bag', 'gym_lamp', 'gym_rings'\)/);
  });
  test('Bauteile, Geräte und Leute: Preise passen zum Server', () => {
    const rows = rowsOf('-- Gym-Bau', 'gympart|gymmachine|gymnpc');
    const want = [
      ...BUILD_ITEMS.map((b) => ({ id: b.id, price: b.price })),
      ...['bench', 'pullup'].map((id) => ({ id: machineShopId(id), price: 150 })),
    ];
    for (const w of want) expect(rows).toContainEqual(w);
    for (const n of NPCS) expect(rows).toContainEqual({ id: n.id, price: n.price });
    expect(rows.filter((r) => r.id.startsWith('m_'))).toHaveLength(28);
  });
});

describe('Ansicht & echte Größen', () => {
  test('übernimmt alte Spiegelung als Ansicht von rechts und prüft rot', () => {
    const g = cleanGym({ objects: [{ id: 'bench', x: 1, y: 2, level: 0, flip: true }, { id: 'pullup', x: 1, y: 2, level: 0, rot: 2 }, { id: 'dip', x: 1, y: 2, level: 0, rot: 7 }] }, new Set());
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

describe('Vintage entfernt', () => {
  test('Stil wird nicht mehr gespeichert, Vintage-Deko nicht mehr im Laden, aber noch aufstellbar', () => {
    expect(cleanGym({ style: 'vintage', objects: [] }, new Set(), TIERS[0])).toEqual(emptyGym());
    expect(DECO_SHOP.some((d) => d.id.startsWith('gym_v_'))).toBe(false);
    expect(cleanGym({ objects: [{ id: 'gym_v_clubs', x: 1, y: 1, level: 0 }] }, new Set(), TIERS[0]).objects).toHaveLength(1);
  });
});
