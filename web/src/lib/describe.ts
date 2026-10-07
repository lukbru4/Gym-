// „Beschreiben“: Aus einem Satz wie „50 g Joghurt, 2 Eier und 1 Banane“ werden Zutaten mit Gramm und Nährwerten.
// Läuft komplett auf dem Gerät mit der eingebauten Tabelle (foodDb.ts) – keine KI, Ergebnisse sind Richtwerte.
import { FOODS, type Food } from './foodDb';
import { scale, type Nutrients } from './food';

export interface ParsedItem extends Nutrients {
  key: string;
  name: string;
  grams: number;
  /** Menge nicht angegeben bzw. geschätzt (Stückgewicht, Standardportion) */
  estimated: boolean;
}
export interface ParseResult { items: ParsedItem[]; unknown: string[] }

export const norm = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();

const WORDS: Record<string, number> = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, halbe: 0.5, halber: 0.5, halbes: 0.5, halben: 0.5, eineinhalb: 1.5, anderthalb: 1.5 };

// Einheit → [Gramm bzw. Milliliter pro Einheit, Art]; Art: 'g' (Masse), 'ml' (Volumen, wird mit Dichte umgerechnet), 'el', 'tl', 'piece'
const UNITS: Record<string, [number, 'g' | 'ml' | 'el' | 'tl' | 'piece']> = {
  g: [1, 'g'], gr: [1, 'g'], gramm: [1, 'g'], kg: [1000, 'g'], kilo: [1000, 'g'],
  ml: [1, 'ml'], l: [1000, 'ml'], liter: [1000, 'ml'], cl: [10, 'ml'], dl: [100, 'ml'],
  el: [1, 'el'], essloeffel: [1, 'el'], tl: [1, 'tl'], teeloeffel: [1, 'tl'],
  tasse: [200, 'ml'], tassen: [200, 'ml'], glas: [200, 'ml'], glaeser: [200, 'ml'], becher: [150, 'g'], schale: [150, 'g'], portion: [150, 'g'], portionen: [150, 'g'],
  scheibe: [1, 'piece'], scheiben: [1, 'piece'], stueck: [1, 'piece'], stuecke: [1, 'piece'], stk: [1, 'piece'], handvoll: [30, 'g'], prise: [1, 'g'],
};

const NUM = '(\\d+(?:[.,]\\d+)?(?:\\s?/\\s?\\d+)?|½|¼|' + Object.keys(WORDS).join('|') + ')';
const UNIT_RE = '(' + Object.keys(UNITS).sort((a, b) => b.length - a.length).join('|') + ')';
const QTY = new RegExp(`(?:^|\\s)${NUM}\\s?${UNIT_RE}?(?=\\s|$|\\d)`);
const QTY_AFTER = new RegExp(`(?:^|\\s)(\\d+(?:[.,]\\d+)?)\\s?${UNIT_RE}(?=\\s|$)`);

function toNumber(s: string): number {
  if (s === '½') return 0.5;
  if (s === '¼') return 0.25;
  if (s in WORDS) return WORDS[s];
  const frac = s.match(/^(\d+)\s?\/\s?(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(s.replace(',', '.'));
}

// Index: normalisierte Aliase, längste zuerst (damit „vollkornbrot“ vor „brot“ und „magerquark“ vor „quark“ gewinnt)
const INDEX = FOODS.flatMap((f) => [...f.aliases, norm(f.name)].map((a) => [norm(a), f] as const)).sort((a, b) => b[0].length - a[0].length);

export function findFood(text: string): Food | null {
  const t = norm(text).replace(/[^a-z0-9 ,%]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  for (const [alias, f] of INDEX) if (alias === t) return f;
  const words = t.split(' ');
  for (const [alias, f] of INDEX) {
    // kurze Aliase (< 4 Zeichen, z. B. „ei“, „oel“) nur als ganzes Wort, längere auch als Wortanfang/Bestandteil
    if (alias.length < 4 ? words.includes(alias) : t.includes(alias)) return f;
  }
  return null;
}

const FILLER = /\b(von|vom|an|aus|mit|etwas|ca|circa|ungefaehr|gekochte?n?|frische?n?|bio)\b/g;

export function parseDescription(text: string): ParseResult {
  const items: ParsedItem[] = [];
  const unknown: string[] = [];
  const parts = text.replace(/(\d),(\d)/g, '$1.$2').split(/[,;\n+]|\bund\b|\bsowie\b|\bplus\b|\bdazu\b/i).map((p) => norm(p)).filter(Boolean);
  for (const part of parts) {
    let rest = part;
    let amount: number | null = null;
    let unit: [number, 'g' | 'ml' | 'el' | 'tl' | 'piece'] | null = null;
    // „Joghurt 50g“ – Menge nach dem Namen
    const m = rest.match(QTY_AFTER) ?? rest.match(QTY);
    if (m) {
      amount = toNumber(m[1]);
      if (m[2]) unit = UNITS[m[2]];
      rest = (rest.slice(0, m.index) + ' ' + rest.slice((m.index ?? 0) + m[0].length)).trim();
    }
    const name = rest.replace(FILLER, ' ').replace(/\s+/g, ' ').trim();
    const food = findFood(name);
    if (!food || !(amount === null || amount > 0)) {
      unknown.push(part);
      continue;
    }
    const density = food.density ?? 1;
    let grams: number;
    let estimated = false;
    if (amount !== null && unit) {
      const [per, kind] = unit;
      if (kind === 'g') grams = amount * per;
      else if (kind === 'ml') grams = amount * per * density;
      else if (kind === 'el') grams = amount * (food.el ?? 15 * density);
      else if (kind === 'tl') grams = amount * ((food.el ?? 15 * density) / 3);
      else {
        grams = amount * (food.piece ?? 100);
        estimated = !food.piece;
      }
      if (unit === UNITS.becher || unit === UNITS.schale || unit === UNITS.portion || unit === UNITS.portionen || unit === UNITS.handvoll) estimated = true;
    } else if (amount !== null) {
      // „2 Eier“, „1 Banane“: Anzahl Stück
      grams = amount * (food.piece ?? 100);
      estimated = true;
    } else {
      grams = food.piece ?? 100;
      estimated = true;
    }
    grams = Math.round(grams);
    items.push({ key: food.key, name: food.name, grams, estimated, ...scale(food, grams) });
  }
  return { items, unknown };
}
