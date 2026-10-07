import { describe, expect, test } from 'vitest';
import { parseDescription, findFood } from '../src/lib/describe';
import { FOODS } from '../src/lib/foodDb';

describe('Gericht beschreiben', () => {
  test('Gramm und Zutat, mit und ohne Leerzeichen', () => {
    for (const t of ['50g Joghurt', '50 g Joghurt', 'Joghurt 50g', '50 Gramm Naturjoghurt']) {
      const r = parseDescription(t);
      expect(r.unknown, t).toEqual([]);
      expect(r.items[0].grams, t).toBe(50);
      expect(r.items[0].key, t).toBe('joghurt');
      expect(r.items[0].kcal, t).toBe(33);
      expect(r.items[0].estimated, t).toBe(false);
    }
  });
  test('mehrere Zutaten, Stückzahlen und Zahlwörter', () => {
    const r = parseDescription('50g Joghurt, 2 Eier und eine Banane');
    expect(r.unknown).toEqual([]);
    expect(r.items.map((i) => [i.key, i.grams])).toEqual([['joghurt', 50], ['eier', 100], ['banane', 120]]);
    expect(r.items[1].estimated).toBe(true); // Stückgewicht geschätzt
  });
  test('Löffel, Milliliter, Dezimalkomma, Brüche', () => {
    expect(parseDescription('2 EL Olivenöl').items[0].grams).toBe(28); // 2 × 15 ml × 0,92
    expect(parseDescription('200 ml Milch').items[0].grams).toBe(206);
    expect(parseDescription('0,5 kg Hähnchenbrust').items[0].grams).toBe(500);
    expect(parseDescription('1/2 Avocado').items[0].grams).toBe(75);
    expect(parseDescription('2 Scheiben Vollkornbrot').items[0].grams).toBe(90);
  });
  test('längster Treffer gewinnt, kurze Aliase nur als ganzes Wort', () => {
    expect(findFood('Magerquark')?.key).toBe('magerquark');
    expect(findFood('Vollkornbrot')?.key).toBe('vollkornbrot');
    expect(findFood('Reis')?.key).toBe('reis');
    expect(findFood('Weizenmehl')?.key).toBe('mehl');
    expect(findFood('xyz')).toBeNull();
  });
  test('Unbekanntes landet in unknown, Rest wird trotzdem gelesen', () => {
    const r = parseDescription('100 g Reis, Zaubertrank, 2 Eier');
    expect(r.items.map((i) => i.key)).toEqual(['reis', 'eier']);
    expect(r.unknown).toEqual(['zaubertrank']);
  });
  test('Tabelle: eindeutige Schlüssel, Nährwerte plausibel', () => {
    const keys = new Set<string>();
    for (const f of FOODS) {
      expect(keys.has(f.key), f.key).toBe(false);
      keys.add(f.key);
      if (f.kcal > 50) expect(Math.abs(4 * f.protein + 4 * f.carbs + 9 * f.fat - f.kcal) / f.kcal, f.key).toBeLessThan(0.16);
    }
  });
});
