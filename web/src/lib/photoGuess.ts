// Gratis-Fotoerkennung fürs Essen: läuft komplett auf dem Gerät (kein Server, keine Kosten, das Foto bleibt auf dem Handy).
// Ein kleines Bild-Text-Modell (MobileCLIP) vergleicht das Foto mit einer festen Liste von Essensbeschreibungen.
// Jede Beschreibung zeigt auf ein Gericht (dishes.ts) oder Lebensmittel (foodDb.ts) – die Nährwerte kommen von dort.
// Das Modell wird beim ersten Gebrauch einmalig geladen (danach aus dem Browser-Speicher). Es erkennt WAS es ist, nicht wie viel.
import { DISH_BY_ID, dishNutrition } from './dishes';
import type { FoodItem } from './food';
import { FOOD_BY_KEY } from './foodDb';

/** [Beschreibung fürs Modell (englisch), Ziel: „dish:<id>“ oder „food:<key>“] */
export const PHOTO_LABELS: [string, string][] = [
  // Pasta, Reis, Pizza
  ['spaghetti bolognese with meat sauce', 'dish:spaghetti-bolognese'],
  ['spaghetti carbonara', 'dish:spaghetti-carbonara'],
  ['spaghetti with tomato sauce', 'dish:spaghetti-tomate'],
  ['pasta with pesto', 'dish:nudeln-pesto'],
  ['pasta with creamy sauce and ham', 'dish:nudeln-sahnesosse-schinken'],
  ['lasagna', 'dish:lasagne-teller'],
  ['tortellini in cream sauce', 'dish:tortellini-sahne'],
  ['gnocchi with tomato sauce', 'dish:gnocchi-tomate'],
  ['macaroni and cheese', 'dish:mac-and-cheese'],
  ['pasta salad', 'dish:nudelsalat'],
  ['cheese spaetzle with fried onions', 'dish:kaesespaetzle'],
  ['baked pasta casserole with cheese', 'dish:nudelauflauf'],
  ['mushroom risotto', 'dish:risotto-pilze'],
  ['fried rice with egg and vegetables', 'dish:reispfanne-gemuese'],
  ['rice pudding with cinnamon', 'dish:milchreis-zimt'],
  ['pizza margherita', 'dish:pizza-margherita'],
  ['salami pizza', 'dish:pizza-salami-ganz'],
  ['slice of pizza', 'dish:pizza-stueck'],
  ['tarte flambee', 'dish:flammkuchen-teller'],
  // Fleisch, Fisch, deutsche Küche
  ['schnitzel with french fries', 'dish:schnitzel-pommes'],
  ['schnitzel with potato salad', 'dish:schnitzel-kartoffelsalat'],
  ['beef roulade with mashed potatoes and red cabbage', 'dish:rouladen'],
  ['roast pork with dumplings', 'dish:schweinebraten'],
  ['goulash with noodles', 'dish:gulasch-nudeln'],
  ['bratwurst with potato salad', 'dish:bratwurst-kartoffelsalat'],
  ['currywurst with fries', 'dish:currywurst-pommes-teller'],
  ['fried potatoes with fried egg', 'dish:bratkartoffeln-ei'],
  ['potato pancakes with apple sauce', 'dish:kartoffelpuffer'],
  ['roast chicken leg with potatoes', 'dish:haehnchen-kartoffeln'],
  ['chicken curry with rice', 'dish:haehnchen-curry'],
  ['chicken and rice with broccoli', 'dish:haehnchen-reis'],
  ['stir fried chicken with vegetables', 'dish:haehnchen-gemuese-pfanne'],
  ['beef stir fry with rice', 'dish:rinderstreifen-wok'],
  ['steak with fries and salad', 'dish:steak-pommes'],
  ['steak with salad', 'dish:steak-salat'],
  ['salmon with rice and broccoli', 'dish:lachs-reis-brokkoli'],
  ['salmon fillet with potatoes and spinach', 'dish:lachs-kartoffeln'],
  ['fish sticks with mashed potatoes and peas', 'dish:fischstaebchen-pueree'],
  ['fried fish with chips', 'dish:backfisch-pommes'],
  ['shrimp stir fry with rice', 'dish:garnelen-reis'],
  ['meatloaf with mashed potatoes', 'dish:hackbraten'],
  ['stuffed bell peppers', 'dish:gefuellte-paprika'],
  ['chili con carne with rice', 'dish:chili-reis'],
  ['vegetable curry with rice', 'dish:gemuese-curry'],
  ['lentil dal with rice', 'dish:linsen-dal'],
  ['vegetable lasagna', 'dish:gemuse-lasagne'],
  ['creamed spinach with potatoes and egg', 'dish:rahmspinat-ei'],
  ['shakshuka eggs in tomato sauce', 'dish:tomaten-eier'],
  ['quiche', 'dish:gemuese-quiche'],
  ['roasted vegetables with feta', 'dish:ofengemuese-feta'],
  // Fast Food, international
  ['doner kebab sandwich', 'dish:doener-kebab'],
  ['durum wrap kebab', 'dish:durum-doener'],
  ['gyros plate with fries and tzatziki', 'dish:souvlaki-teller'],
  ['hamburger', 'dish:hamburger'],
  ['burger with fries', 'dish:burger-pommes'],
  ['chicken burger', 'dish:chicken-burger'],
  ['chicken nuggets with fries', 'dish:nuggets-pommes'],
  ['hot dog', 'dish:hotdog-teller'],
  ['french fries with ketchup and mayonnaise', 'dish:pommes-mayo'],
  ['sushi', 'dish:sushi-menue'],
  ['ramen noodle soup', 'dish:ramen-schale'],
  ['spring rolls', 'dish:fruehlingsrollen-teller'],
  ['fried noodles with chicken and vegetables', 'dish:asia-nudeln'],
  ['sweet and sour chicken with rice', 'dish:suess-sauer-haehnchen'],
  ['pad thai', 'dish:pad-thai'],
  ['bibimbap', 'dish:bibimbap-bowl'],
  ['burrito', 'dish:burrito'],
  ['burrito bowl', 'dish:burrito-bowl'],
  ['nachos with cheese', 'dish:nachos-käse'],
  ['falafel wrap', 'dish:wrap-falafel'],
  ['chicken wrap', 'dish:wrap-haehnchen'],
  ['poke bowl with salmon', 'dish:poke-bowl'],
  ['buddha bowl with sweet potato and chickpeas', 'dish:buddha-bowl'],
  ['veggie burger', 'dish:veggie-burger'],
  // Salate, Suppen
  ['caesar salad with chicken', 'dish:caesar-salad'],
  ['greek salad with feta', 'dish:griechischer-salat'],
  ['caprese salad tomato and mozzarella', 'dish:mozzarella-tomate'],
  ['green salad with chicken strips', 'dish:haehnchensalat'],
  ['potato salad with sausages', 'dish:kartoffelsalat-wuerstchen'],
  ['tomato soup', 'dish:tomatensuppe'],
  ['chicken noodle soup', 'dish:huehnersuppe'],
  ['pumpkin soup', 'dish:kuerbissuppe'],
  ['lentil soup', 'dish:linsensuppe'],
  ['goulash soup', 'dish:gulaschsuppe'],
  ['potato soup', 'dish:kartoffelsuppe'],
  ['broccoli cream soup', 'dish:broccolicremesuppe'],
  ['vegetable stew', 'dish:eintopf-teller'],
  // Frühstück, Brot
  ['oatmeal porridge with berries', 'dish:protein-porridge'],
  ['oatmeal with banana and blueberries', 'dish:hafer-beeren'],
  ['overnight oats', 'dish:overnight-oats'],
  ['muesli with yogurt', 'dish:muesli-joghurt'],
  ['cornflakes with milk', 'dish:cornflakes-milch'],
  ['scrambled eggs with toast', 'dish:ruehrei-toast'],
  ['fried eggs with bacon and toast', 'dish:bacon-eggs'],
  ['omelette', 'dish:omelett'],
  ['avocado toast with egg', 'dish:avocado-toast'],
  ['pancakes', 'dish:pancakes'],
  ['smoothie bowl', 'dish:smoothie-bowl'],
  ['yogurt bowl with fruit and nuts', 'dish:skyr-bowl'],
  ['bread roll with cheese', 'dish:broetchen-kaese'],
  ['bread roll with jam and butter', 'dish:broetchen-marmelade'],
  ['bread roll with ham', 'dish:broetchen-schinken'],
  ['bagel with cream cheese and salmon', 'dish:bagel-frischkaese'],
  ['croissant', 'food:croissant'],
  ['pretzel', 'food:brezel'],
  ['sandwich', 'dish:thunfisch-sandwich'],
  ['club sandwich', 'dish:club-sandwich'],
  ['slice of bread with cheese', 'dish:kaesebrot'],
  ['slice of bread with sausage', 'dish:wurstbrot'],
  // Snacks, Süßes, Getränke
  ['protein shake', 'dish:proteinshake-milch'],
  ['ice cream', 'dish:eis-kugeln'],
  ['chocolate bar', 'dish:schokolade-riegel'],
  ['piece of cake', 'dish:kuchenstueck'],
  ['piece of cream cake', 'dish:torte-stueck'],
  ['muffin', 'dish:muffin-teil'],
  ['donut', 'dish:donut-teil'],
  ['waffle', 'dish:waffel-puderzucker'],
  ['potato chips', 'dish:chips-tuete'],
  ['popcorn', 'dish:popcorn-kino'],
  ['gummy bears', 'dish:gummibaerchen-tuete'],
  ['cappuccino', 'dish:cappuccino-tasse'],
  ['glass of beer', 'dish:bier-glas'],
  ['glass of wine', 'dish:wein-glas'],
  ['fruit salad', 'dish:obstsalat-joghurt'],
  ['mixed nuts', 'dish:studentenfutter-handvoll'],
  // Einzelne Lebensmittel
  ['banana', 'food:banane'],
  ['apple', 'food:apfel'],
  ['orange', 'food:orange'],
  ['strawberries', 'food:erdbeeren'],
  ['blueberries', 'food:heidelbeeren'],
  ['grapes', 'food:weintrauben'],
  ['watermelon', 'food:wassermelone'],
  ['pineapple', 'food:ananas'],
  ['mango', 'food:mango'],
  ['kiwi fruit', 'food:kiwi'],
  ['avocado', 'food:avocado'],
  ['boiled eggs', 'dish:ei-snack'],
  ['yogurt', 'food:joghurt'],
  ['quark curd cheese', 'food:magerquark'],
  ['glass of milk', 'food:milch'],
  ['broccoli', 'food:brokkoli'],
  ['carrots', 'food:karotte'],
  ['cucumber', 'food:gurke'],
  ['tomatoes', 'food:tomate'],
  ['boiled potatoes', 'food:kartoffel'],
  ['cooked rice', 'food:reis-gekocht'],
  ['plain cooked pasta', 'food:nudeln-gekocht'],
  ['grilled chicken breast', 'food:haehnchenbrust-gebraten'],
  ['rice cakes', 'food:reiswaffel'],
  ['protein bar', 'food:proteinriegel'],
];

export interface PhotoGuess {
  /** „dish:…“ oder „food:…“ */
  target: string;
  /** Anzeigename aus unserer Datenbank */
  name: string;
  /** Wahrscheinlichkeit 0–1 */
  score: number;
  /** Übliche Portion */
  grams: number;
  kcal: number;
}

/** Ziel → Name, Portion und kcal (null, wenn es das Ziel nicht gibt) */
export function describeTarget(target: string): Omit<PhotoGuess, 'score'> | null {
  const [kind, id] = target.split(':');
  if (kind === 'dish') {
    const d = DISH_BY_ID.get(id);
    if (!d) return null;
    const n = dishNutrition(d);
    return { target, name: d.name, grams: n.grams, kcal: n.kcal };
  }
  const f = FOOD_BY_KEY.get(id);
  if (!f) return null;
  const grams = f.piece ?? 150;
  return { target, name: f.name, grams, kcal: Math.round((f.kcal * grams) / 100) };
}

/** Lebensmittel als FoodItem (für die Mengen-Auswahl) */
export function foodItemOf(target: string): FoodItem | null {
  const [kind, id] = target.split(':');
  if (kind !== 'food') return null;
  const f = FOOD_BY_KEY.get(id);
  if (!f) return null;
  return { name: f.name, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, serving_g: f.piece ?? 150 };
}

/** Wahrscheinlichkeiten je Beschreibung → die besten verschiedenen Treffer (gleiches Ziel zählt einmal) */
export function topGuesses(probs: number[], n = 3): PhotoGuess[] {
  const best = new Map<string, number>();
  probs.forEach((p, i) => {
    const t = PHOTO_LABELS[i]?.[1];
    if (t) best.set(t, (best.get(t) ?? 0) + p);
  });
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, score]) => {
      const d = describeTarget(t);
      return d ? { ...d, score } : null;
    })
    .filter((x): x is PhotoGuess => x !== null)
    .slice(0, n);
}

export const softmax = (xs: number[]) => {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
};

// ---- Modell (wird erst beim ersten Foto geladen) ----
export const PHOTO_MODEL = 'Xenova/mobileclip_s0';
const TEXT_CACHE_KEY = `gym-tracker-photo-text-${PHOTO_MODEL}-${PHOTO_LABELS.length}`;
export type Progress = (percent: number) => void;

interface Engine {
  embedImage(file: Blob): Promise<number[]>;
  textVectors: number[][];
}
let engine: Promise<Engine> | null = null;

const normalize = (v: number[]) => {
  const len = Math.hypot(...v) || 1;
  return v.map((x) => x / len);
};

async function loadEngine(onProgress?: Progress): Promise<Engine> {
  const T = await import('@huggingface/transformers');
  T.env.allowLocalModels = false;
  const files = new Map<string, [number, number]>();
  const progress_callback = (e: { status?: string; file?: string; loaded?: number; total?: number }) => {
    if (e.status !== 'progress' || !e.file || !e.total) return;
    files.set(e.file, [e.loaded ?? 0, e.total]);
    let done = 0;
    let all = 0;
    for (const [l, t] of files.values()) {
      done += l;
      all += t;
    }
    onProgress?.(Math.min(99, Math.round((done / all) * 100)));
  };
  const opts = { dtype: 'q8' as const, progress_callback };
  const [processor, vision] = await Promise.all([
    T.AutoProcessor.from_pretrained(PHOTO_MODEL, { progress_callback }),
    T.CLIPVisionModelWithProjection.from_pretrained(PHOTO_MODEL, opts),
  ]);
  // Text-Vektoren nur einmal berechnen und auf dem Gerät merken
  let textVectors: number[][] | null = null;
  try {
    const raw = localStorage.getItem(TEXT_CACHE_KEY);
    if (raw) textVectors = JSON.parse(raw) as number[][];
  } catch {
    textVectors = null;
  }
  if (!textVectors || textVectors.length !== PHOTO_LABELS.length) {
    const [tokenizer, textModel] = await Promise.all([
      T.AutoTokenizer.from_pretrained(PHOTO_MODEL, { progress_callback }),
      T.CLIPTextModelWithProjection.from_pretrained(PHOTO_MODEL, opts),
    ]);
    const inputs = tokenizer(PHOTO_LABELS.map(([p]) => `a photo of ${p}, food`), { padding: 'max_length', truncation: true });
    const { text_embeds } = await textModel(inputs);
    textVectors = (text_embeds.tolist() as number[][]).map((v) => normalize(v).map((x) => Math.round(x * 1e5) / 1e5));
    try {
      localStorage.setItem(TEXT_CACHE_KEY, JSON.stringify(textVectors));
    } catch {
      /* zu groß oder blockiert: beim nächsten Mal neu berechnen */
    }
  }
  onProgress?.(100);
  return {
    textVectors,
    async embedImage(file: Blob) {
      const image = await T.RawImage.fromBlob(file);
      const inputs = await processor(image);
      const { image_embeds } = await vision(inputs);
      return normalize((image_embeds.tolist() as number[][])[0]);
    },
  };
}

/** Foto → die 3 wahrscheinlichsten Gerichte/Lebensmittel. Lädt beim ersten Mal das Modell (Fortschritt in %). */
export async function guessFood(file: Blob, onProgress?: Progress): Promise<PhotoGuess[]> {
  // Tests setzen hier eine Attrappe ein (window.__photoGuess)
  const mock = (globalThis as { __photoGuess?: (f: Blob) => Promise<PhotoGuess[]> }).__photoGuess;
  if (mock) return mock(file);
  engine ??= loadEngine(onProgress).catch((err) => {
    engine = null;
    throw err;
  });
  const e = await engine;
  const img = await e.embedImage(file);
  const probs = softmax(e.textVectors.map((t) => 100 * t.reduce((s, x, i) => s + x * img[i], 0)));
  return topGuesses(probs, 3);
}

/** Wurde das Modell auf diesem Gerät schon einmal geladen? (dann kein Download-Hinweis mehr) */
export const photoModelReady = () => {
  try {
    return localStorage.getItem(TEXT_CACHE_KEY) !== null;
  } catch {
    return false;
  }
};
