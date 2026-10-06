import { describe, expect, test } from 'vitest';
import { nutrition, RECIPES, suggestRecipes } from '../src/lib/recipes';

describe('Rezepte', () => {
  test('alle Zutaten sind bekannt, Nährwerte plausibel, Anleitung vorhanden', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(12);
    const ids = new Set<string>();
    for (const r of RECIPES) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
      const n = nutrition(r);
      expect(n.kcal, r.name).toBeGreaterThan(150);
      expect(n.kcal, r.name).toBeLessThan(1100);
      expect(n.protein, r.name).toBeGreaterThan(5);
      // grobe Plausibilität: Energie ≈ 4·Eiweiß + 4·Kohlenhydrate + 9·Fett
      const calc = 4 * n.protein + 4 * n.carbs + 9 * n.fat;
      expect(Math.abs(calc - n.kcal) / n.kcal, r.name).toBeLessThan(0.15);
      expect(r.steps.length, r.name).toBeGreaterThanOrEqual(2);
      expect(r.ingredients.length, r.name).toBeGreaterThanOrEqual(3);
    }
  });
  test('Beispielrechnung Rührei-Frühstück', () => {
    const n = nutrition(RECIPES.find((r) => r.id === 'ruehrei-toast')!);
    expect(n.grams).toBe(305);
    expect(n.kcal).toBe(413);
    expect(n.protein).toBe(24.6);
  });
  test('Vorschläge: passende zuerst, Filter wirken', () => {
    const s = suggestRecipes({ kcal: 450, protein: 40 });
    const firstNonFit = s.findIndex((x) => !x.fits);
    expect(s.slice(0, firstNonFit).every((x) => x.n.kcal <= 500)).toBe(true);
    expect(s.slice(firstNonFit).every((x) => !x.fits)).toBe(true);
    expect(suggestRecipes({ kcal: 2000, protein: 100 }, 'abend').every((x) => x.recipe.meal === 'abend')).toBe(true);
    expect(suggestRecipes({ kcal: 2000, protein: 100 }, 'vegetarisch').every((x) => x.recipe.tags.some((t) => t === 'vegetarisch' || t === 'vegan'))).toBe(true);
    expect(suggestRecipes({ kcal: 2000, protein: 100 }, 'schnell').every((x) => x.recipe.minutes <= 20)).toBe(true);
    expect(suggestRecipes({ kcal: 100, protein: 10 }).every((x) => !x.fits)).toBe(true);
  });
});
