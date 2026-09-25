import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNight, resolveTheme } from '../js/theme.js';

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
