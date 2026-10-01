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
    expect(getCosmetics()).toEqual({ owned: [], equipped: {} });
    setCosmetics(null);
    expect(getCosmetics()).toEqual({ owned: [], equipped: {} });
    setCosmetics({ owned: ['acc_band'], equipped: { accessory: 'acc_band' } });
    expect(getCosmetics().equipped.accessory).toBe('acc_band');
  });
});
