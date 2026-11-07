// Eigene Mahlzeiten: Zutaten mit Gramm und Nährwerten pro 100 g; im Konto gespeichert.
import { scale, type FoodEntry, type FoodItem, type Nutrients } from './food';
import { FOOD_BY_KEY } from './foodDb';
import type { Dish } from './dishes';

export interface MealItem { n: string; b?: string | null; g: number; p: Nutrients }
export interface MyMeal { id: number; name: string; items: MealItem[]; updated_at?: string }

const r1 = (v: number) => Math.round(v * 10) / 10;
export const itemNutrients = (it: MealItem, factor = 1) => scale(it.p, it.g * factor);
export function mealTotals(items: MealItem[], factor = 1): Nutrients & { grams: number } {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
  for (const it of items) {
    const n = itemNutrients(it, factor);
    t.kcal += n.kcal; t.protein += n.protein; t.carbs += n.carbs; t.fat += n.fat; t.grams += it.g * factor;
  }
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), grams: Math.round(t.grams) };
}
export const itemFromFood = (f: FoodItem, grams: number): MealItem => ({ n: f.name, b: f.brand ?? null, g: grams, p: { ...f.per100 } });
/** eingebautes Gericht als Vorlage */
export function itemsFromDish(d: Dish): MealItem[] {
  return d.ingredients.flatMap(([key, grams]) => {
    const f = FOOD_BY_KEY.get(key);
    return f ? [{ n: f.name, b: null, g: grams, p: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat } }] : [];
  });
}
/** Einträge aus dem Tagebuch (ohne Gramm: als 100 g mit den Gesamtwerten) */
export function itemsFromEntries(list: FoodEntry[]): MealItem[] {
  return list.map((e) => {
    const g = e.amount_g && e.amount_g > 0 ? e.amount_g : 100;
    const k = 100 / g;
    return { n: e.name, b: e.brand, g, p: { kcal: r1(e.kcal * k), protein: r1(e.protein * k), carbs: r1(e.carbs * k), fat: r1(e.fat * k) } };
  });
}
