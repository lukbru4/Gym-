import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isNight, resolveTheme } from '../src/lib/theme';

const at = (h, m = 0) => new Date(2026, 8, 25, h, m);

test('Dunkel von 18:00 bis 6:00 Uhr', () => {
  assert.equal(isNight(at(17, 59)), false);
  assert.equal(isNight(at(18, 0)), true);
  assert.equal(isNight(at(23, 30)), true);
  assert.equal(isNight(at(0, 0)), true);
  assert.equal(isNight(at(5, 59)), true);
  assert.equal(isNight(at(6, 0)), false);
  assert.equal(isNight(at(12, 0)), false);
});

test('Modi: Uhrzeit, fest, Gerät', () => {
  assert.equal(resolveTheme('time', at(20)), 'dark');
  assert.equal(resolveTheme('time', at(9)), 'light');
  assert.equal(resolveTheme('dark', at(9)), 'dark');
  assert.equal(resolveTheme('light', at(22)), 'light');
  assert.equal(resolveTheme('system', at(22)), null);
});

test('Eigene Dunkel-Zeiten, auch tagsüber und über Mitternacht', async () => {
  const { isNight } = await import('../src/lib/theme');
  const at = (h) => new Date(2026, 9, 1, h, 0);
  assert.equal(isNight(at(20), { from: 21, until: 7 }), false);
  assert.equal(isNight(at(22), { from: 21, until: 7 }), true);
  assert.equal(isNight(at(6), { from: 21, until: 7 }), true);
  assert.equal(isNight(at(14), { from: 13, until: 15 }), true);
  assert.equal(isNight(at(15), { from: 13, until: 15 }), false);
});

test('Akzentfarbe wird für Hell und Dunkel lesbar gemacht', async () => {
  const { accentVariants, contrast, ACCENT_PRESETS } = await import('../src/lib/theme');
  for (const [c] of [...ACCENT_PRESETS, ['#ffffff'], ['#000000']]) {
    const v = accentVariants(c);
    assert.ok(contrast(v.light, '#ffffff') >= 3, `${c} hell`);
    assert.ok(contrast(v.dark, '#121212') >= 3, `${c} dunkel`);
    assert.ok(contrast(v.light, v.lightText) >= 3 && contrast(v.dark, v.darkText) >= 3, `${c} Schrift`);
  }
  assert.equal(accentVariants('#1f6fd1').light, '#1f6fd1'); // schon lesbar → unverändert
});
