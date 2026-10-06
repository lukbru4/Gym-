// Rezepte mit Anleitung: Nährwerte werden aus den Zutaten berechnet (Richtwerte, Zutaten roh bzw. wie angegeben).
import type { Meal, Nutrients } from './food';

/** Nährwerte pro 100 g (ungefähre Durchschnittswerte, Quelle: übliche Nährwerttabellen) */
const BASE: Record<string, Nutrients> = {
  haferflocken: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 },
  milch: { kcal: 47, protein: 3.4, carbs: 4.9, fat: 1.5 },
  banane: { kcal: 90, protein: 1.1, carbs: 20.3, fat: 0.2 },
  heidelbeeren: { kcal: 42, protein: 0.6, carbs: 9, fat: 0.4 },
  honig: { kcal: 304, protein: 0.3, carbs: 75, fat: 0 },
  eier: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.9 },
  vollkornbrot: { kcal: 210, protein: 7, carbs: 38, fat: 1.5 },
  butter: { kcal: 741, protein: 0.7, carbs: 0.6, fat: 83 },
  tomate: { kcal: 18, protein: 0.9, carbs: 2.6, fat: 0.2 },
  magerquark: { kcal: 67, protein: 12, carbs: 4, fat: 0.3 },
  apfel: { kcal: 52, protein: 0.3, carbs: 12, fat: 0.2 },
  walnuesse: { kcal: 654, protein: 15, carbs: 7, fat: 65 },
  haehnchenbrust: { kcal: 106, protein: 23, carbs: 0, fat: 1.5 },
  reis: { kcal: 350, protein: 7, carbs: 78, fat: 0.6 },
  brokkoli: { kcal: 34, protein: 2.8, carbs: 2.7, fat: 0.4 },
  olivenoel: { kcal: 884, protein: 0, carbs: 0, fat: 100 },
  sojasauce: { kcal: 60, protein: 8, carbs: 5, fat: 0 },
  spaghetti: { kcal: 358, protein: 13, carbs: 71, fat: 1.5 },
  tomatensauce: { kcal: 28, protein: 1.4, carbs: 4.5, fat: 0.2 },
  parmesan: { kcal: 392, protein: 36, carbs: 0, fat: 28 },
  zwiebel: { kcal: 40, protein: 1.1, carbs: 9, fat: 0.1 },
  linsen: { kcal: 340, protein: 24, carbs: 50, fat: 1.5 },
  karotte: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  kartoffel: { kcal: 77, protein: 2, carbs: 17, fat: 0.1 },
  thunfisch: { kcal: 116, protein: 26, carbs: 0, fat: 1 },
  kichererbsen: { kcal: 120, protein: 7, carbs: 18, fat: 2 },
  gurke: { kcal: 15, protein: 0.7, carbs: 2.4, fat: 0.1 },
  lachs: { kcal: 208, protein: 20, carbs: 0, fat: 13 },
  spinat: { kcal: 23, protein: 2.9, carbs: 0.8, fat: 0.4 },
  paprika: { kcal: 31, protein: 1, carbs: 6, fat: 0.3 },
  champignons: { kcal: 22, protein: 3.1, carbs: 0.5, fat: 0.3 },
  gouda: { kcal: 356, protein: 25, carbs: 1, fat: 28 },
  tofu: { kcal: 120, protein: 13, carbs: 1.5, fat: 7 },
  zucchini: { kcal: 17, protein: 1.2, carbs: 2, fat: 0.3 },
  skyr: { kcal: 63, protein: 11, carbs: 4, fat: 0.2 },
  muesli: { kcal: 360, protein: 9.5, carbs: 64, fat: 5.5 },
  himbeeren: { kcal: 43, protein: 1.2, carbs: 4.9, fat: 0.4 },
};

export type Ingredient = [key: string, grams: number, label: string];
export interface Recipe {
  id: string;
  name: string;
  meal: Meal;
  minutes: number;
  tags: ('vegetarisch' | 'vegan' | 'schnell' | 'eiweiss')[];
  ingredients: Ingredient[];
  steps: string[];
}

export const RECIPES: Recipe[] = [
  {
    id: 'hafer-beeren', name: 'Haferflocken mit Banane und Heidelbeeren', meal: 'fruehstueck', minutes: 10, tags: ['vegetarisch', 'schnell'],
    ingredients: [['haferflocken', 60, '60 g Haferflocken'], ['milch', 200, '200 ml Milch (1,5 %)'], ['banane', 100, '1 kleine Banane'], ['heidelbeeren', 50, '50 g Heidelbeeren'], ['honig', 10, '1 TL Honig']],
    steps: ['Haferflocken mit der Milch in einem kleinen Topf unter Rühren 3–4 Minuten sanft erhitzen, bis es cremig ist.', 'Banane in Scheiben schneiden.', 'Haferbrei in eine Schüssel geben, Banane und Heidelbeeren darauf verteilen und mit Honig beträufeln.'],
  },
  {
    id: 'ruehrei-toast', name: 'Rührei mit Vollkornbrot und Tomate', meal: 'fruehstueck', minutes: 10, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['eier', 150, '3 Eier'], ['vollkornbrot', 70, '2 Scheiben Vollkornbrot'], ['butter', 5, '1 TL Butter'], ['tomate', 80, '1 Tomate']],
    steps: ['Eier in einer Schüssel mit etwas Salz und Pfeffer verquirlen.', 'Butter in einer Pfanne bei mittlerer Hitze zerlassen, Eier hineingeben und unter Rühren stocken lassen (ca. 2 Minuten).', 'Brot toasten, Tomate in Scheiben schneiden und alles zusammen anrichten.'],
  },
  {
    id: 'quark-obst', name: 'Magerquark mit Apfel und Walnüssen', meal: 'snack', minutes: 5, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['magerquark', 250, '250 g Magerquark'], ['apfel', 150, '1 Apfel'], ['walnuesse', 15, '15 g Walnüsse'], ['honig', 10, '1 TL Honig']],
    steps: ['Apfel waschen und in kleine Würfel schneiden, Walnüsse grob hacken.', 'Quark in eine Schüssel geben, Apfel und Nüsse daraufgeben und mit Honig beträufeln.'],
  },
  {
    id: 'skyr-muesli', name: 'Skyr mit Müsli und Himbeeren', meal: 'snack', minutes: 3, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['skyr', 250, '250 g Skyr'], ['muesli', 40, '40 g Müsli'], ['himbeeren', 80, '80 g Himbeeren']],
    steps: ['Skyr in eine Schüssel geben.', 'Himbeeren und Müsli darüber verteilen und sofort essen, damit das Müsli knusprig bleibt.'],
  },
  {
    id: 'pancakes', name: 'Protein-Pancakes mit Banane', meal: 'fruehstueck', minutes: 15, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['haferflocken', 50, '50 g Haferflocken'], ['eier', 100, '2 Eier'], ['banane', 100, '1 Banane'], ['magerquark', 100, '100 g Magerquark'], ['olivenoel', 5, '1 TL Öl zum Braten']],
    steps: ['Haferflocken, Eier, Quark und die halbe Banane mit einem Mixer oder Stabmixer zu einem glatten Teig verrühren.', 'Etwas Öl in einer beschichteten Pfanne erhitzen und aus dem Teig bei mittlerer Hitze kleine Pancakes backen (je Seite 2 Minuten).', 'Mit den restlichen Bananenscheiben servieren.'],
  },
  {
    id: 'haehnchen-reis', name: 'Hähnchen-Reis-Pfanne mit Brokkoli', meal: 'mittag', minutes: 25, tags: ['eiweiss'],
    ingredients: [['haehnchenbrust', 150, '150 g Hähnchenbrust'], ['reis', 70, '70 g Reis (ungekocht)'], ['brokkoli', 150, '150 g Brokkoli'], ['olivenoel', 10, '1 EL Olivenöl'], ['sojasauce', 15, '1 EL Sojasauce']],
    steps: ['Reis nach Packungsanleitung kochen.', 'Hähnchen in Streifen schneiden, Brokkoli in kleine Röschen teilen.', 'Öl in einer großen Pfanne erhitzen, Hähnchen 5 Minuten kräftig anbraten, dann Brokkoli und einen Schuss Wasser dazugeben und 5 Minuten garen.', 'Sojasauce und Reis untermischen, kurz durchschwenken und servieren.'],
  },
  {
    id: 'spaghetti-tomate', name: 'Spaghetti mit Tomatensoße und Parmesan', meal: 'mittag', minutes: 20, tags: ['vegetarisch'],
    ingredients: [['spaghetti', 90, '90 g Spaghetti (ungekocht)'], ['tomatensauce', 200, '200 g passierte Tomaten'], ['olivenoel', 8, '2 TL Olivenöl'], ['parmesan', 15, '15 g Parmesan'], ['zwiebel', 40, '½ Zwiebel']],
    steps: ['Spaghetti in Salzwasser nach Packungsanleitung bissfest kochen.', 'Zwiebel fein würfeln und im Öl glasig dünsten, passierte Tomaten dazugeben und 8 Minuten leise köcheln lassen. Mit Salz, Pfeffer und Oregano abschmecken.', 'Nudeln abgießen, mit der Soße mischen und mit Parmesan bestreuen.'],
  },
  {
    id: 'thunfisch-bowl', name: 'Thunfisch-Kichererbsen-Bowl', meal: 'mittag', minutes: 15, tags: ['schnell', 'eiweiss'],
    ingredients: [['thunfisch', 120, '1 Dose Thunfisch im eigenen Saft'], ['kichererbsen', 100, '100 g Kichererbsen (Dose, abgetropft)'], ['gurke', 100, '½ Gurke'], ['tomate', 100, '1 große Tomate'], ['olivenoel', 10, '1 EL Olivenöl']],
    steps: ['Thunfisch und Kichererbsen abtropfen lassen.', 'Gurke und Tomate würfeln.', 'Alles in einer Schüssel mit Olivenöl, Zitronensaft, Salz und Pfeffer vermengen.'],
  },
  {
    id: 'lachs-kartoffeln', name: 'Lachs mit Ofenkartoffeln und Spinat', meal: 'abend', minutes: 35, tags: ['eiweiss'],
    ingredients: [['lachs', 150, '150 g Lachsfilet'], ['kartoffel', 250, '250 g Kartoffeln'], ['spinat', 150, '150 g Blattspinat'], ['olivenoel', 8, '2 TL Olivenöl']],
    steps: ['Backofen auf 200 °C vorheizen. Kartoffeln in Spalten schneiden, mit der Hälfte des Öls, Salz und Pfeffer mischen und 20 Minuten backen.', 'Lachs würzen und für die letzten 12 Minuten auf das Blech legen.', 'Spinat im restlichen Öl in einer Pfanne 2 Minuten zusammenfallen lassen, mit Salz abschmecken und alles anrichten.'],
  },
  {
    id: 'linsen-eintopf', name: 'Roter Linsen-Eintopf mit Gemüse', meal: 'abend', minutes: 30, tags: ['vegan'],
    ingredients: [['linsen', 70, '70 g rote Linsen'], ['karotte', 100, '1 große Karotte'], ['kartoffel', 150, '2 kleine Kartoffeln'], ['zwiebel', 50, '1 kleine Zwiebel'], ['olivenoel', 8, '2 TL Olivenöl']],
    steps: ['Zwiebel würfeln, Karotte und Kartoffeln klein schneiden.', 'Zwiebel im Öl anschwitzen, Gemüse und Linsen dazugeben und mit etwa 500 ml Gemüsebrühe aufgießen.', '20 Minuten köcheln lassen, bis alles weich ist. Mit Salz, Pfeffer und Kreuzkümmel abschmecken.'],
  },
  {
    id: 'omelett', name: 'Gemüse-Omelett mit Käse', meal: 'abend', minutes: 15, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['eier', 150, '3 Eier'], ['paprika', 80, '½ Paprika'], ['champignons', 80, '4 Champignons'], ['gouda', 30, '30 g Gouda'], ['olivenoel', 5, '1 TL Öl']],
    steps: ['Paprika und Champignons klein schneiden und im Öl 4 Minuten anbraten.', 'Eier verquirlen, salzen und über das Gemüse gießen. Bei mittlerer Hitze stocken lassen.', 'Käse darüberstreuen, das Omelett zusammenklappen und servieren.'],
  },
  {
    id: 'tofu-pfanne', name: 'Tofu-Gemüse-Pfanne mit Reis', meal: 'abend', minutes: 25, tags: ['vegan', 'eiweiss'],
    ingredients: [['tofu', 150, '150 g Tofu'], ['reis', 70, '70 g Reis (ungekocht)'], ['paprika', 100, '1 Paprika'], ['zucchini', 100, '½ Zucchini'], ['sojasauce', 15, '1 EL Sojasauce'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Reis nach Packungsanleitung kochen.', 'Tofu in Würfel schneiden und im Öl rundherum goldbraun anbraten, dann herausnehmen.', 'Paprika und Zucchini in Stücken 5 Minuten braten, Tofu und Sojasauce zurückgeben und kurz durchschwenken.', 'Mit dem Reis servieren.'],
  },
];

export function nutrition(r: Recipe): Nutrients & { grams: number } {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
  for (const [key, grams] of r.ingredients) {
    const b = BASE[key];
    if (!b) throw new Error(`Zutat fehlt: ${key}`);
    t.kcal += (b.kcal * grams) / 100;
    t.protein += (b.protein * grams) / 100;
    t.carbs += (b.carbs * grams) / 100;
    t.fat += (b.fat * grams) / 100;
    t.grams += grams;
  }
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), grams: t.grams };
}

export type RecipeFilter = 'alle' | Meal | 'vegetarisch' | 'schnell' | 'eiweiss';
export const RECIPE_FILTERS: [RecipeFilter, string][] = [
  ['alle', 'Alle'], ['fruehstueck', 'Frühstück'], ['mittag', 'Mittag'], ['abend', 'Abend'], ['snack', 'Snack'],
  ['vegetarisch', 'Vegetarisch'], ['schnell', 'Schnell (≤ 20 Min.)'], ['eiweiss', 'Viel Eiweiß'],
];
const matches = (r: Recipe, f: RecipeFilter) =>
  f === 'alle' ? true : f === 'vegetarisch' ? r.tags.includes('vegetarisch') || r.tags.includes('vegan') : f === 'schnell' ? r.minutes <= 20 : f === 'eiweiss' ? r.tags.includes('eiweiss') : r.meal === f;

/** Was passt zu dem, was heute noch übrig ist? Passende zuerst (viel Eiweiß pro Kalorie), dann die größeren. */
export function suggestRecipes(left: { kcal: number; protein: number }, filter: RecipeFilter = 'alle'): { recipe: Recipe; n: ReturnType<typeof nutrition>; fits: boolean }[] {
  const rows = RECIPES.filter((r) => matches(r, filter)).map((recipe) => {
    const n = nutrition(recipe);
    return { recipe, n, fits: n.kcal <= left.kcal + 50 };
  });
  const density = (x: (typeof rows)[number]) => x.n.protein / Math.max(1, x.n.kcal);
  return rows.sort((a, b) => Number(b.fits) - Number(a.fits) || (a.fits ? density(b) - density(a) : a.n.kcal - b.n.kcal));
}
