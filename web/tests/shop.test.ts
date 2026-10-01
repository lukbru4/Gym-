import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { SHOP_ITEMS } from '../src/lib/shop';

test('Shop-Katalog in der App passt zu den Preisen auf dem Server (schema.sql)', () => {
  const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
  const block = sql.slice(sql.indexOf('insert into public.shop_items'), sql.indexOf('on conflict (id) do update set kind'));
  const rows = [...block.matchAll(/\('([a-z_]+)',\s*'(\w+)',\s*'[^']+',\s*(\d+)\)/g)].map((m) => ({ id: m[1], kind: m[2], price: Number(m[3]) }));
  expect(rows.length).toBe(SHOP_ITEMS.length);
  expect(rows).toEqual(SHOP_ITEMS.map(({ id, kind, price }) => ({ id, kind, price })));
});

describe('Shop-Status vom Server', async () => {
  const { getCosmetics, setCosmetics } = await import('../src/lib/cosmetics');
  test('unerwartete Antworten führen nicht zum Absturz', () => {
    setCosmetics([] as never);
    expect(getCosmetics()).toEqual({ owned: [], equipped: {}, admin: false });
    setCosmetics(null);
    expect(getCosmetics()).toEqual({ owned: [], equipped: {}, admin: false });
    setCosmetics({ owned: ['acc_band'], equipped: { accessory: 'acc_band' } });
    expect(getCosmetics().equipped.accessory).toBe('acc_band');
  });
});

describe('Admin & eigene Farbschemata', async () => {
  const { deriveVars, contrast, schemeAllowed, validPalette } = await import('../src/lib/theme');
  const { schemeIdFromName } = await import('../src/pages/Admin');
  test('Kennung aus dem Namen (wie der Server sie erlaubt)', () => {
    expect(schemeIdFromName('Kirsch Traum!')).toBe('scheme_c_kirsch_traum');
    expect(schemeIdFromName('Größe & Übung')).toBe('scheme_c_groesse_uebung');
    expect(schemeIdFromName('!!!')).toBe('scheme_c_schema');
    expect(/^scheme_c_[a-z0-9_]{1,30}$/.test(schemeIdFromName('x'.repeat(80)))).toBe(true);
  });
  test('abgeleitete Farben: Akzent wird lesbar gemacht', () => {
    const v = deriveVars({ bg: '#ffffff', surface: '#ffffff', text: '#000000', accent: '#ffff66' }, false);
    expect(contrast(v['--accent'], '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrast(v['--accent'], v['--accent-text'])).toBeGreaterThanOrEqual(3);
  });
  test('nur Standard + Gekauftes, Admin alles', () => {
    expect(schemeAllowed('standard', [], false)).toBe(true);
    expect(schemeAllowed('ozean', [], false)).toBe(false);
    expect(schemeAllowed('ozean', ['scheme_ozean'], false)).toBe(true);
    expect(schemeAllowed('custom:scheme_c_x', [], false)).toBe(false);
    expect(schemeAllowed('energie', [], true)).toBe(true);
  });
  test('Farbschema-Prüfung', () => {
    const ok = { light: { bg: '#ffffff', surface: '#ffffff', text: '#000000', accent: '#123456' }, dark: { bg: '#000000', surface: '#111111', text: '#ffffff', accent: '#abcdef' }, neon: '#00ff00' };
    expect(validPalette(ok)).toBe(true);
    expect(validPalette({ ...ok, neon: 'red' })).toBe(false);
    expect(validPalette(null)).toBe(false);
  });
});
