// Gerichte mit Zutaten: Jedes Gericht besteht aus Lebensmitteln der eingebauten Tabelle (foodDb.ts) mit Gramm.
// Die Nährwerte werden aus den Zutaten berechnet (Richtwerte, typische Portionen) – keine Marken- oder Restaurantdaten.
import { CORE_RECIPES, type RawRecipe } from './dishRecipes';
import { MORE_RECIPES } from './dishRecipesMore';
import { MORE_DISHES } from './dishesMore';
import { FOOD_BY_KEY } from './foodDb';
import type { Nutrients } from './food';

export type DishCat = 'fruehstueck' | 'brot' | 'warm' | 'pasta' | 'veg' | 'salat' | 'suppe' | 'imbiss' | 'snack';
export const DISH_CATS: [DishCat | 'alle', string][] = [
  ['alle', 'Alle'], ['fruehstueck', 'Frühstück'], ['brot', 'Brot & Belegtes'], ['warm', 'Warme Küche'], ['pasta', 'Pasta & Reis'], ['veg', 'Vegetarisch & Vegan'],
  ['salat', 'Salate & Bowls'], ['suppe', 'Suppen'], ['imbiss', 'Imbiss & Fast Food'], ['snack', 'Snacks & Süßes'],
];

/** [Schlüssel aus foodDb.ts, Gramm, Anzeigetext?] */
export type DishIngredient = [key: string, grams: number, label?: string];
export interface Dish {
  id: string;
  name: string;
  /** weitere Schreibweisen (klein, ohne Umlaute) */
  aliases: string[];
  cat: DishCat;
  ingredients: [key: string, grams: number, label: string][];
  steps: string[];
  /** Zubereitungszeit in Minuten (nur bei Rezepten) */
  minutes?: number;
  /** Mahlzeit(en), zu denen das Gericht passt */
  meals: DishMeal[];
  /** Merkmale aus dem Rezept (schnell, eiweißreich …) */
  recipeTags?: RawRecipe['tags'];
}
export type DishMeal = 'fruehstueck' | 'mittag' | 'abend' | 'snack';
const mealsOfCat = (c: DishCat): DishMeal[] => (c === 'fruehstueck' ? ['fruehstueck'] : c === 'snack' ? ['snack'] : c === 'brot' ? ['fruehstueck', 'abend'] : ['mittag', 'abend']);

const norm = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
const labelOf = (key: string, grams: number) => `${grams} g ${FOOD_BY_KEY.get(key)?.name ?? key}`;
const fill = (list: DishIngredient[]) => list.map(([key, grams, label]): [string, number, string] => [key, grams, label ?? labelOf(key, grams)]);

const fromRecipe = (r: RawRecipe): Dish => ({
  id: r.id,
  name: r.name,
  aliases: [],
  cat: r.tags.includes('vegan') || (r.tags.includes('vegetarisch') && r.meal !== 'fruehstueck' && r.meal !== 'snack') ? 'veg' : r.meal === 'fruehstueck' ? 'fruehstueck' : r.meal === 'snack' ? 'snack' : 'warm',
  ingredients: fill(r.ingredients),
  steps: r.steps,
  minutes: r.minutes,
  meals: r.meal === 'mittag' || r.meal === 'abend' ? ['mittag', 'abend'] : [r.meal],
  recipeTags: r.tags,
});

export const DISHES: Dish[] = [
  ...[...CORE_RECIPES, ...MORE_RECIPES].map(fromRecipe),
  ...MORE_DISHES.map(([id, name, aliases, cat, ingredients, steps]): Dish => ({ id, name, aliases: aliases.split('|'), cat, ingredients: fill(ingredients), steps: steps ?? [], meals: mealsOfCat(cat) })),
];
export const DISH_BY_ID = new Map(DISHES.map((d) => [d.id, d]));

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Nährwerte einer Zutatenliste (Schlüssel + Gramm) */
export function sumIngredients(list: { key: string; grams: number }[]): Nutrients & { grams: number } {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
  for (const { key, grams } of list) {
    const f = FOOD_BY_KEY.get(key);
    if (!f) throw new Error(`Zutat fehlt: ${key}`);
    t.kcal += (f.kcal * grams) / 100;
    t.protein += (f.protein * grams) / 100;
    t.carbs += (f.carbs * grams) / 100;
    t.fat += (f.fat * grams) / 100;
    t.grams += grams;
  }
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), grams: Math.round(t.grams) };
}
/** Nährwerte eines Gerichts (Standardportion) */
export const dishNutrition = (d: Dish) => sumIngredients(d.ingredients.map(([key, grams]) => ({ key, grams })));

const INDEX = DISHES.flatMap((d) => [d.name, ...d.aliases].map((a) => [norm(a).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(), d] as const));

/** Gerichte suchen: Treffer im Namen/Alias, bessere Treffer (Wortanfang, ganzer Name) zuerst */
export function searchDishes(query: string, cat: DishCat | 'alle' = 'alle', limit = 60): Dish[] {
  const q = norm(query).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const pool = cat === 'alle' ? DISHES : DISHES.filter((d) => d.cat === cat);
  if (!q) return pool.slice(0, limit);
  const score = new Map<Dish, number>();
  for (const [alias, d] of INDEX) {
    if (cat !== 'alle' && d.cat !== cat) continue;
    const words = q.split(' ');
    const hit = alias === q ? 100 : alias.startsWith(q) ? 80 : alias.includes(q) ? 60 : words.every((w) => alias.includes(w)) ? 40 : 0;
    if (hit) score.set(d, Math.max(score.get(d) ?? 0, hit));
  }
  // Treffer über Zutaten („hackfleisch“) zuletzt
  for (const d of pool) if (!score.has(d) && d.ingredients.some(([key, , label]) => norm(label).includes(q) || norm(FOOD_BY_KEY.get(key)?.name ?? '').includes(q))) score.set(d, 20);
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name, 'de')).map(([d]) => d).slice(0, limit);
}

/** Ganzer Text ist (fast) genau ein Gerichtname → dieses Gericht */
export function findDishExact(text: string): Dish | null {
  const t = norm(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length < 4) return null;
  for (const [alias, d] of INDEX) if (alias === t) return d;
  return null;
}
