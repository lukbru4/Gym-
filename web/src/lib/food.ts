// Essen tracken: Mahlzeiten, Nährwerte umrechnen und Produkte bei Open Food Facts (openfoodfacts.org) suchen.
// Reine Logik ohne React; der Netzwerkzugriff ist austauschbar, damit es testbar ist.

export type Meal = 'fruehstueck' | 'mittag' | 'abend' | 'snack';
export const MEALS: [Meal, string][] = [['fruehstueck', 'Frühstück'], ['mittag', 'Mittagessen'], ['abend', 'Abendessen'], ['snack', 'Snacks']];

export interface Nutrients { kcal: number; protein: number; carbs: number; fat: number }
export interface FoodItem {
  code?: string;
  name: string;
  brand?: string;
  /** Nährwerte pro 100 g bzw. 100 ml */
  per100: Nutrients;
  /** Portionsgröße in g, falls bekannt */
  serving_g?: number;
}
export interface FoodEntry extends Nutrients {
  id: number;
  meal: Meal;
  name: string;
  brand: string | null;
  amount_g: number | null;
  source: 'manual' | 'search' | 'barcode' | 'photo' | 'chat';
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Nährwerte für eine Menge in Gramm */
export function scale(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  return { kcal: round1(per100.kcal * f), protein: round1(per100.protein * f), carbs: round1(per100.carbs * f), fat: round1(per100.fat * f) };
}
export function totals(entries: Pick<FoodEntry, 'kcal' | 'protein' | 'carbs' | 'fat'>[]): Nutrients {
  const t = entries.reduce((s, e) => ({ kcal: s.kcal + Number(e.kcal), protein: s.protein + Number(e.protein), carbs: s.carbs + Number(e.carbs), fat: s.fat + Number(e.fat) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { kcal: Math.round(t.kcal), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat) };
}

/** EAN-8, UPC-A (12), EAN-13 und GTIN-14: nur Ziffern */
export const isBarcode = (s: string) => /^\d{8,14}$/.test(s.trim());

// ---- Open Food Facts --------------------------------------------------------------------
interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, unknown>;
}
/** Produkt von Open Food Facts → FoodItem (null, wenn Name oder Kalorien fehlen) */
export function parseProduct(p: OffProduct | null | undefined): FoodItem | null {
  if (!p || typeof p !== 'object') return null;
  const name = (p.product_name_de || p.product_name || '').trim();
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === null) {
    const kj = num(n['energy_100g']); // Kilojoule
    kcal = kj === null ? null : Math.round(kj / 4.184);
  }
  if (!name || kcal === null) return null;
  const serving = num(p.serving_quantity);
  return {
    code: p.code && /^\d{6,14}$/.test(String(p.code)) ? String(p.code) : undefined,
    name: name.slice(0, 120),
    brand: p.brands ? p.brands.split(',')[0].trim().slice(0, 120) || undefined : undefined,
    per100: { kcal: round1(kcal), protein: round1(num(n['proteins_100g']) ?? 0), carbs: round1(num(n['carbohydrates_100g']) ?? 0), fat: round1(num(n['fat_100g']) ?? 0) },
    serving_g: serving && serving > 0 && serving <= 5000 ? serving : undefined,
  };
}

const OFF = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_de,brands,nutriments,serving_quantity';
type Fetch = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export async function lookupBarcode(code: string, fetchImpl: Fetch = fetch): Promise<FoodItem | null> {
  const clean = code.trim();
  if (!isBarcode(clean)) throw new Error('Ein Barcode besteht aus 8 bis 14 Ziffern.');
  const res = await fetchImpl(`${OFF}/api/v2/product/${clean}.json?fields=${FIELDS}`);
  if (!res.ok) throw new Error('Open Food Facts ist gerade nicht erreichbar.');
  const data = (await res.json()) as { status?: number; product?: OffProduct };
  return data.status === 1 ? parseProduct({ ...data.product, code: data.product?.code ?? clean }) : null;
}

export async function searchFood(query: string, fetchImpl: Fetch = fetch): Promise<FoodItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetchImpl(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`);
  if (!res.ok) throw new Error('Open Food Facts ist gerade nicht erreichbar.');
  const data = (await res.json()) as { products?: OffProduct[] };
  return (data.products ?? []).map(parseProduct).filter((x): x is FoodItem => x !== null);
}

// ---- Kalorienziel schätzen ----------------------------------------------------------------
export interface CalorieSuggestion { kcal: number; bmr: number; tdee: number; note: string }
const toNum = (v: unknown) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** Grobe Schätzung aus den Antworten der Fragen (Mifflin-St-Jeor + Aktivität + Ziel). Nur ein Richtwert. */
export function suggestCalories(a: Record<string, string | string[] | undefined>): CalorieSuggestion | null {
  const weight = toNum(a.weight), height = toNum(a.height), age = toNum(a.age);
  if (!weight || !height || !age) return null;
  const offset = a.sex === 'm' ? 5 : a.sex === 'w' ? -161 : -78; // divers/keine Angabe: Mittelwert
  const bmr = 10 * weight + 6.25 * height - 5 * age + offset;
  const days = toNum(a.days) ?? 3;
  const factor = days <= 2 ? 1.375 : days <= 4 ? 1.55 : 1.725;
  const tdee = bmr * factor;
  const goal = String(a.goal ?? '');
  const adjust = goal === 'abnehmen' ? -400 : goal === 'muskel' ? 250 : goal === 'kraft' ? 150 : 0;
  const note = goal === 'abnehmen' ? 'zum Abnehmen etwa 400 kcal unter deinem Verbrauch' : goal === 'muskel' ? 'zum Muskelaufbau etwa 250 kcal über deinem Verbrauch' : goal === 'kraft' ? 'etwas über deinem Verbrauch für mehr Kraft' : 'etwa dein geschätzter Verbrauch';
  const kcal = Math.min(6000, Math.max(1200, Math.round((tdee + adjust) / 50) * 50));
  return { kcal, bmr: Math.round(bmr), tdee: Math.round(tdee), note };
}

// ---- Foto-KI ----------------------------------------------------------------------------
export interface PhotoItem extends Nutrients { name: string; grams: number }
export interface PhotoAnalysis { items: PhotoItem[]; confidence: 'low' | 'medium' | 'high'; note: string; remaining: number }
/** Fehler der Foto-Auswertung mit Code: pro | limit | not_configured | auth | bad_image | ai | network */
export class FoodAiError extends Error {
  constructor(public code: string, public limit?: number) {
    super(FOOD_AI_MESSAGES[code] ?? FOOD_AI_MESSAGES.ai);
  }
}
const FOOD_AI_MESSAGES: Record<string, string> = {
  pro: 'Die Foto-Auswertung gibt es mit Pro.',
  limit: 'Das Tageslimit für Foto-Auswertungen ist erreicht. Morgen geht es weiter – oder trage das Essen per Suche, Barcode oder manuell ein.',
  not_configured: 'Die Foto-Auswertung ist noch nicht eingerichtet.',
  auth: 'Bitte melde dich erneut an.',
  bad_image: 'Das Foto konnte nicht verarbeitet werden. Versuche ein anderes.',
  network: 'Keine Verbindung. Versuche es später noch einmal.',
  ai: 'Die Auswertung hat diesmal nicht geklappt. Versuche es noch einmal oder trage es manuell ein.',
};
/** Menge ändern: Nährwerte der Portion wachsen/schrumpfen im gleichen Verhältnis */
export function rescaleItem(item: PhotoItem, grams: number): PhotoItem {
  const f = item.grams > 0 ? grams / item.grams : 1;
  return { ...item, grams, kcal: round1(item.kcal * f), protein: round1(item.protein * f), carbs: round1(item.carbs * f), fat: round1(item.fat * f) };
}

// ---- Essens-Chat -------------------------------------------------------------------------
export interface ChatMsg { role: 'user' | 'assistant'; content: string }
export interface ChatTurn { reply: string; ready: boolean; items: PhotoItem[]; suggestions: string[]; remaining: number }
/** Standard-Mahlzeit nach Tageszeit (für den Eintragsvorschlag) */
export const mealForHour = (hour: number): Meal => (hour < 10 ? 'fruehstueck' : hour < 15 ? 'mittag' : hour < 18 ? 'snack' : 'abend');
