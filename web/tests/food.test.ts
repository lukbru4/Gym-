import { describe, expect, test } from 'vitest';
import { nutritionScore, suggestCalories, isBarcode, lookupBarcode, parseProduct, scale, searchFood, totals } from '../src/lib/food';

const nutella = { code: '3017620422003', product_name: 'Nutella', brands: 'Ferrero, Nutella', serving_quantity: '15', nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 } };
const fakeFetch = (body: unknown, ok = true) => async () => ({ ok, json: async () => body });

describe('Essen tracken', () => {
  test('Nährwerte für eine Menge umrechnen', () => {
    expect(scale({ kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 }, 15)).toEqual({ kcal: 80.9, protein: 0.9, carbs: 8.6, fat: 4.6 });
    expect(scale({ kcal: 100, protein: 10, carbs: 20, fat: 5 }, 250)).toEqual({ kcal: 250, protein: 25, carbs: 50, fat: 12.5 });
  });
  test('Tagessumme', () => {
    expect(totals([{ kcal: 195.4, protein: 4, carbs: 42, fat: 0.5 }, { kcal: 300, protein: 20.4, carbs: 10, fat: 12 }])).toEqual({ kcal: 495, protein: 24, carbs: 52, fat: 13 });
    expect(totals([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
  test('Barcode-Format', () => {
    expect(isBarcode('3017620422003')).toBe(true);
    expect(isBarcode(' 40123455 ')).toBe(true);
    expect(isBarcode('12345')).toBe(false);
    expect(isBarcode('abc12345678')).toBe(false);
  });
  test('Produkt von Open Food Facts lesen', () => {
    const p = parseProduct(nutella)!;
    expect(p).toMatchObject({ code: '3017620422003', name: 'Nutella', brand: 'Ferrero', serving_g: 15 });
    expect(p.per100).toEqual({ kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 });
  });
  test('Kilojoule werden in Kalorien umgerechnet; ohne Name oder Energie kein Produkt', () => {
    expect(parseProduct({ product_name: 'Saft', nutriments: { energy_100g: 184 } })!.per100.kcal).toBe(44);
    expect(parseProduct({ product_name: '', nutriments: { 'energy-kcal_100g': 50 } })).toBeNull();
    expect(parseProduct({ product_name: 'Etwas', nutriments: {} })).toBeNull();
    expect(parseProduct(null)).toBeNull();
    expect(parseProduct({ product_name: 'Neg', nutriments: { 'energy-kcal_100g': -5 } })).toBeNull();
  });
  test('Barcode suchen: gefunden, unbekannt, Fehler', async () => {
    expect((await lookupBarcode('3017620422003', fakeFetch({ status: 1, product: nutella })))?.name).toBe('Nutella');
    expect(await lookupBarcode('3017620422003', fakeFetch({ status: 0 }))).toBeNull();
    await expect(lookupBarcode('3017620422003', fakeFetch({}, false))).rejects.toThrow(/nicht erreichbar/);
    await expect(lookupBarcode('abc', fakeFetch({}))).rejects.toThrow(/8 bis 14 Ziffern/);
  });
  test('Suche: nur brauchbare Treffer, zu kurze Suche macht keine Anfrage', async () => {
    let calls = 0;
    const f = async (url: string) => { calls++; expect(url).toContain('search_terms=hafer%20flocken'); return { ok: true, json: async () => ({ products: [nutella, { product_name: 'Ohne Energie', nutriments: {} }] }) }; };
    const r = await searchFood('hafer flocken', f);
    expect(r.map((x) => x.name)).toEqual(['Nutella']);
    expect(await searchFood('a', f)).toEqual([]);
    expect(calls).toBe(1);
  });
  test('Kalorienziel aus den Antworten schätzen', () => {
    // Mann, 30 J., 180 cm, 80 kg: Grundumsatz 1780, 3× pro Woche → ×1,55
    const s = suggestCalories({ sex: 'm', age: '30', height: '180', weight: '80', days: '3', goal: 'muskel' })!;
    expect(s.bmr).toBe(1780);
    expect(s.tdee).toBe(2759);
    expect(s.kcal).toBe(3000);
    expect(suggestCalories({ sex: 'w', age: '30', height: '165', weight: '60', days: '2', goal: 'abnehmen' })!.kcal).toBe(1400);
    expect(suggestCalories({ age: '30', height: '180' })).toBeNull();
    expect(suggestCalories({ sex: 'w', age: '70', height: '140', weight: '35', days: '1', goal: 'abnehmen' })!.kcal).toBe(1200); // nie unter 1.200
  });
});

describe('nutritionScore', () => {
  test('gibt ohne Einträge keinen Score', () => {
    expect(nutritionScore({ kcal: 0, protein: 0, carbs: 0, fat: 0 }, 2500)).toBeNull();
  });
  test('bewertet ausgewogene Tage mit „Sehr gut“', () => {
    // 2000 kcal: 125 g Eiweiß (25 %), 225 g KH (45 %), 67 g Fett (30 %)
    expect(nutritionScore({ kcal: 2000, protein: 125, carbs: 225, fat: 67 }, 2500)).toEqual({ level: 4, label: 'Sehr gut' });
  });
  test('bewertet einseitiges Essen schwächer und mindestens mit einem Segment', () => {
    const s = nutritionScore({ kcal: 3000, protein: 0, carbs: 100, fat: 267 }, 2000)!;
    expect(s.level).toBe(1);
    expect(s.label).toBe('Schwach');
  });
});
