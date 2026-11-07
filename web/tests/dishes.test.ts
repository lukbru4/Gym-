import { describe, expect, it } from 'vitest';
import { DISHES, DISH_BY_ID, dishNutrition, findDishExact, searchDishes, sumIngredients } from '../src/lib/dishes';
import { FOOD_BY_KEY } from '../src/lib/foodDb';

describe('dishes', () => {
  it('es gibt mindestens 200 Gerichte mit eindeutiger ID', () => {
    expect(DISHES.length).toBeGreaterThanOrEqual(200);
    expect(DISH_BY_ID.size).toBe(DISHES.length);
  });
  it('jede Zutat verweist auf ein vorhandenes Lebensmittel', () => {
    const missing = DISHES.flatMap((d) => d.ingredients.filter(([k]) => !FOOD_BY_KEY.has(k)).map(([k]) => `${d.id}:${k}`));
    expect(missing).toEqual([]);
  });
  it('Portionen sind plausibel (Kalorien aus Makros ±20 %, 40–1500 kcal)', () => {
    const alcohol = new Set(['bier-glas', 'wein-glas']); // Alkohol liefert zusätzlich Energie
    const bad = DISHES.filter((d) => {
      if (alcohol.has(d.id)) return false;
      const n = dishNutrition(d);
      const est = n.protein * 4 + n.carbs * 4 + n.fat * 9;
      return n.kcal < 40 || n.kcal > 1500 || Math.abs(est - n.kcal) > Math.max(25, n.kcal * 0.2);
    }).map((d) => `${d.id} ${dishNutrition(d).kcal}`);
    expect(bad).toEqual([]);
  });
  it('Nährwerte = Summe der Zutaten', () => {
    const d = DISH_BY_ID.get('spaghetti-bolognese')!;
    expect(dishNutrition(d)).toEqual(sumIngredients(d.ingredients.map(([key, grams]) => ({ key, grams }))));
    expect(dishNutrition(d).kcal).toBeGreaterThan(450);
  });
  it('Suche findet Gerichte per Name, Alias und Zutat', () => {
    expect(searchDishes('bolognese')[0].id).toBe('spaghetti-bolognese');
    expect(searchDishes('döner').some((d) => d.id === 'doener-kebab')).toBe(true);
    expect(searchDishes('feta').length).toBeGreaterThan(2);
    expect(searchDishes('xyzabc')).toEqual([]);
    expect(searchDishes('', 'suppe').every((d) => d.cat === 'suppe')).toBe(true);
  });
  it('findDishExact erkennt ganze Gerichtnamen', () => {
    expect(findDishExact('Spaghetti Bolognese')?.id).toBe('spaghetti-bolognese');
    expect(findDishExact('2 Eier und Brot')).toBeNull();
  });
});
