import { describe, expect, test } from 'vitest';
import { DISHES } from '../src/lib/dishes';
import { dishSvg, unknownKeys } from '../src/lib/dishArt';
import { dishPhotoFile } from '../src/lib/dishPhotos';

// Ganze Gerichte (Pizza, Burger, Getränke …) werden über ihren Namen gezeichnet, nicht als Zutat
const WHOLE = new Set(['baguette-belegt', 'brezel', 'currywurst-pommes', 'lasagne', 'eintopf', 'doener', 'burger', 'pizza-salami', 'pizza', 'flammkuchen', 'hotdog', 'sushi', 'fruehlingsrolle', 'chips', 'eis', 'schokoriegel', 'kuchen', 'torte', 'muffin', 'donut', 'waffel', 'pudding', 'gruetze', 'popcorn', 'gummibaerchen', 'cappuccino', 'bier', 'wein']);

describe('Gezeichnete Gerichte', () => {
  test('jede Zutat hat eine Form oder ist bewusst unsichtbar', () => {
    const keys = [...new Set(DISHES.flatMap((d) => d.ingredients.map(([k]) => k)))];
    expect(unknownKeys(keys).filter((k) => !WHOLE.has(k))).toEqual([]);
  });
  test('jedes Gericht ergibt ein gültiges, nicht leeres SVG', () => {
    for (const d of DISHES) {
      const s = dishSvg(d);
      expect(s.startsWith('<svg'), d.id).toBe(true);
      expect(s, d.id).not.toMatch(/NaN|undefined/);
      // genug gezeichnet
      expect((s.match(/<(path|circle|ellipse|rect)/g) ?? []).length, d.name).toBeGreaterThanOrEqual(4);
      // Tags sind ausgeglichen
      expect((s.match(/<g[ >]/g) ?? []).length, d.id).toBe((s.match(/<\/g>/g) ?? []).length);
    }
  });
  test('immer gleiches Bild für dasselbe Gericht', () => {
    expect(dishSvg(DISHES[5])).toBe(dishSvg(DISHES[5]));
  });
  test('Dateinamen für Fotos sind einfach (ohne Umlaute)', () => {
    expect(dishPhotoFile('rührei-tomate')).toBe('ruehrei-tomate.jpg');
    for (const d of DISHES) expect(dishPhotoFile(d.id), d.id).toMatch(/^[a-z0-9-]{1,90}\.jpg$/);
  });
});
