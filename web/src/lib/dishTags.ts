// Merkmale der Gerichte für die Entdecken-Seite (Ernährungsart, Zubereitung, Kalorien).
// Alles wird aus Zutaten, Name und Nährwerten berechnet – Richtwerte, keine Garantie (z. B. bei Allergien).
import { DISHES, dishNutrition, type Dish, type DishMeal } from './dishes';

const MEAT = new Set(['haehnchenbrust', 'haehnchenbrust-gebraten', 'putenbrust', 'haehnchenkeule', 'entenbrust', 'rindersteak', 'lamm', 'schweinefilet', 'schweinenacken', 'kassler', 'schweinebauch', 'schnitzel-paniert', 'rinderhack', 'hackfleisch-gemischt', 'frikadelle', 'bratwurst', 'gefluegelwurst', 'leberkaese', 'schinken', 'salami', 'bacon', 'gulasch', 'bolognese', 'chili-con-carne', 'doener', 'burger', 'chicken-nuggets', 'currywurst-pommes', 'hotdog', 'pizza-salami', 'lasagne', 'carbonara', 'flammkuchen']);
const FISH = new Set(['lachs', 'raeucherlachs', 'forelle', 'kabeljau', 'thunfisch', 'hering', 'fischstaebchen', 'fischfilet-paniert', 'garnelen', 'sushi']);
const DAIRY = new Set(['milch', 'vollmilch', 'joghurt', 'joghurt-fettarm', 'griechischer-joghurt', 'magerquark', 'speisequark', 'skyr', 'kefir', 'frischkaese', 'koerniger-frischkaese', 'mozzarella', 'feta', 'gouda', 'parmesan', 'sahne', 'cheddar', 'emmentaler', 'kaese-reibe', 'ziegenkaese', 'halloumi', 'ricotta', 'butter', 'sahnesosse', 'carbonara', 'tzatziki', 'eis', 'pudding', 'milchreis', 'vanillejoghurt', 'cappuccino', 'pizza', 'pizza-salami', 'flammkuchen', 'lasagne', 'kartoffelpueree', 'rahmspinat', 'croissant', 'kuchen', 'torte', 'muffin', 'waffel', 'donut', 'schokoriegel', 'proteinpulver', 'burger', 'nuss-nougat-creme', 'kaesespaetzle', 'knuspermuesli-schoko']);
const OTHER_ANIMAL = new Set(['eier', 'honig', 'mayonnaise', 'spaetzle', 'pfannkuchen', 'gnocchi', 'remoulade', 'kuchen', 'torte', 'muffin', 'waffel', 'donut', 'gummibaerchen', 'sahnesosse', 'fruehlingsrolle']);
const SUGAR = new Set(['zucker', 'honig', 'marmelade', 'nuss-nougat-creme', 'schokoriegel', 'kuchen', 'torte', 'muffin', 'donut', 'waffel', 'pudding', 'gruetze', 'gummibaerchen', 'eis', 'knuspermuesli-schoko', 'vanillejoghurt', 'ketchup', 'milchreis', 'cornflakes']);
const MEAT_NAME = /h(ä|ae)hnchen|huhn|h(ü|ue)hner|pute|rind|schwein|speck|schinken|wurst|salami|hack|bolognese|gyros|d(ö|oe)ner|d(ü|ue)r(ü|ue)m|kebab|lamm|ente|kassler|bacon|chicken|burger|carbonara|braten|steak|schnitzel|roulade|gulasch|nugget|leberk|tafelspitz|fleisch|chili con carne|bibimbap/;
const VEG_NAME = /veggie|sin carne|vegan|linsen-bolognese|tofu|seitan|tempeh|vegetarisch|gem(ü|ue)se-?burger/;
const FISH_NAME = /lachs|thunfisch|fisch|forelle|kabeljau|garnele|sushi|matjes|hering|pad thai/;

export interface DishInfo {
  kcal: number; protein: number; carbs: number; fat: number;
  meat: boolean; fish: boolean; vegetarian: boolean; vegan: boolean;
  sugarFree: boolean; lactoseFree: boolean; visible: number;
}
const cache = new Map<string, DishInfo>();
export function dishInfo(d: Dish): DishInfo {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const n = d.name.toLowerCase();
  const keys = d.ingredients.map(([k]) => k);
  const veg = VEG_NAME.test(n);
  const meat = !veg && (keys.some((k) => MEAT.has(k)) || MEAT_NAME.test(n));
  const fish = keys.some((k) => FISH.has(k)) || FISH_NAME.test(n);
  const dairy = keys.some((k) => DAIRY.has(k));
  const vegetarian = !meat && !fish;
  const vegan = vegetarian && !dairy && !keys.some((k) => OTHER_ANIMAL.has(k)) && !/k(ä|ae)se|quark|joghurt|skyr|ei\b|eier|rührei|omelett|milch|sahne|mozzarella|feta|parmesan|halloumi|ricotta/.test(n.replace(/hafermilch|sojamilch|kokosmilch/g, ''));
  const nut = dishNutrition(d);
  const info: DishInfo = {
    ...nut, meat, fish, vegetarian, vegan,
    sugarFree: !keys.some((k) => SUGAR.has(k)),
    lactoseFree: !dairy && !/k(ä|ae)se|quark|joghurt|skyr|milch|sahne|pizza|mozzarella|feta|parmesan|halloumi|ricotta/.test(n.replace(/hafermilch|sojamilch|kokosmilch/g, '')),
    visible: keys.filter((k) => !['olivenoel', 'butter', 'sojasauce', 'knoblauch', 'zucker', 'mehl', 'salz', 'zwiebel'].includes(k)).length,
  };
  cache.set(d.id, info);
  return info;
}

export type GroupSection = 'popular' | 'meal' | 'prep' | 'diet' | 'kcal';
export interface DishGroup {
  id: string;
  title: string;
  emoji: string;
  section: GroupSection[];
  test: (d: Dish, i: DishInfo) => boolean;
  /** Gericht für das Kachelbild */
  cover?: string;
}
const meal = (m: DishMeal) => (d: Dish) => d.meals.includes(m);
const kcalPct = (i: DishInfo, g: number, per: number) => (i.kcal > 0 ? (g * per) / i.kcal : 0);

export const DISH_GROUPS: DishGroup[] = [
  { id: 'fruehstueck', title: 'Frühstück', emoji: '☕', section: ['meal'], test: meal('fruehstueck'), cover: 'hafer-beeren' },
  { id: 'mittag', title: 'Mittagessen', emoji: '🍲', section: ['meal'], test: meal('mittag'), cover: 'lachs-reis-brokkoli' },
  { id: 'abend', title: 'Abendessen', emoji: '🥗', section: ['meal'], test: meal('abend'), cover: 'tomaten-eier' },
  { id: 'snack', title: 'Snack', emoji: '🍎', section: ['meal'], test: meal('snack'), cover: 'apfel-erdnuss' },
  { id: 'schnell', title: 'Schnell', emoji: '⏱️', section: ['popular', 'prep'], test: (d, i) => (d.minutes ? d.minutes <= 15 : d.recipeTags?.includes('schnell') ?? (i.visible <= 3 && ['fruehstueck', 'brot', 'snack', 'salat'].includes(d.cat))), cover: 'skyr-bowl' },
  { id: 'wenig', title: 'Wenig Zutaten', emoji: '🛒', section: ['popular', 'prep'], test: (_d, i) => i.visible >= 2 && i.visible <= 3, cover: 'kartoffel-quark' },
  { id: 'ofen', title: 'Aus dem Ofen', emoji: '🔥', section: ['prep'], test: (d) => /auflauf|lasagne|ofen|quiche|gratin|braten(?!e)|pizza|flammkuchen|gef(ü|ue)llte/i.test(d.name), cover: 'haehnchen-ofen' },
  { id: 'pfanne', title: 'Aus der Pfanne', emoji: '🍳', section: ['prep'], test: (d) => /pfanne|gebraten|r(ü|ue)hr|omelett|spiegel|bratkartoffel|shakshuka|wok|puffer|pfannkuchen|pancake/i.test(d.name), cover: 'tomaten-eier' },
  { id: 'suppe', title: 'Suppen & Eintöpfe', emoji: '🥣', section: ['prep'], test: (d) => d.cat === 'suppe' || /suppe|eintopf|chili|dal\b|curry/i.test(d.name), cover: 'tomatensuppe' },
  { id: 'salat', title: 'Salate & Bowls', emoji: '🥙', section: ['prep'], test: (d) => d.cat === 'salat' || /salat|bowl/i.test(d.name), cover: 'griechischer-salat' },
  { id: 'kalt', title: 'Ohne Kochen', emoji: '🧊', section: ['prep'], test: (d) => ['brot', 'snack'].includes(d.cat) && !/toast hawaii|pfannkuchen|waffel|eier mit|spiegel/i.test(d.name) || /overnight|m(ü|ue)sli|quark|skyr|joghurt|salat|smoothie|cottage/i.test(d.name) && !/nudel|kartoffel|warm|gebacken/i.test(d.name), cover: 'overnight-oats' },
  { id: 'imbiss', title: 'Imbiss & Fast Food', emoji: '🍔', section: ['prep'], test: (d) => d.cat === 'imbiss', cover: 'burger-pommes' },
  { id: 'vegetarisch', title: 'Vegetarisch', emoji: '🧀', section: ['popular', 'diet'], test: (_d, i) => i.vegetarian },
  { id: 'vegan', title: 'Vegan', emoji: '🌱', section: ['popular', 'diet'], test: (_d, i) => i.vegan },
  { id: 'protein', title: 'High Protein', emoji: '💪', section: ['popular', 'diet'], test: (_d, i) => i.protein >= 25 || kcalPct(i, i.protein, 4) >= 0.3 },
  { id: 'lowcarb', title: 'Low Carb', emoji: '🥑', section: ['popular', 'diet'], test: (_d, i) => i.carbs <= 20 && i.kcal >= 150 && i.protein >= 10 },
  { id: 'lowfat', title: 'Low Fat', emoji: '🥒', section: ['diet'], test: (_d, i) => kcalPct(i, i.fat, 9) <= 0.25 },
  { id: 'kalorienarm', title: 'Kalorienarm', emoji: '🍏', section: ['popular', 'diet'], test: (_d, i) => i.kcal <= 400 && i.kcal >= 100 },
  { id: 'pescetarisch', title: 'Pescetarisch', emoji: '🐟', section: ['diet'], test: (_d, i) => !i.meat },
  { id: 'zuckerfrei', title: 'Ohne Zucker', emoji: '🚫', section: ['diet'], test: (_d, i) => i.sugarFree },
  { id: 'laktosefrei', title: 'Laktosefrei', emoji: '🥛', section: ['diet'], test: (_d, i) => i.lactoseFree },
  { id: 'k300', title: 'bis 300 kcal', emoji: '🍉', section: ['kcal'], test: (_d, i) => i.kcal < 300 },
  { id: 'k500', title: '300–500 kcal', emoji: '🥪', section: ['kcal'], test: (_d, i) => i.kcal >= 300 && i.kcal < 500 },
  { id: 'k700', title: '500–700 kcal', emoji: '🍛', section: ['kcal'], test: (_d, i) => i.kcal >= 500 && i.kcal < 700 },
  { id: 'k900', title: '700–900 kcal', emoji: '🍝', section: ['kcal'], test: (_d, i) => i.kcal >= 700 && i.kcal < 900 },
  { id: 'k900p', title: 'ab 900 kcal', emoji: '🍔', section: ['kcal'], test: (_d, i) => i.kcal >= 900 },
];
export const GROUP_BY_ID = new Map(DISH_GROUPS.map((g) => [g.id, g]));

const members = new Map<string, Dish[]>();
/** Gerichte einer Gruppe (Rezepte mit Zubereitung zuerst, dann nach Namen) */
export function dishesOf(g: DishGroup): Dish[] {
  let list = members.get(g.id);
  if (!list) {
    list = DISHES.filter((d) => g.test(d, dishInfo(d))).sort((a, b) => Number(b.steps.length > 0) - Number(a.steps.length > 0) || a.name.localeCompare(b.name, 'de'));
    members.set(g.id, list);
  }
  return list;
}
export const groupsIn = (s: GroupSection) => DISH_GROUPS.filter((g) => g.section.includes(s) && dishesOf(g).length > 0);
export const coverOf = (g: DishGroup): Dish | undefined => DISHES.find((d) => d.id === g.cover) ?? dishesOf(g)[0];
