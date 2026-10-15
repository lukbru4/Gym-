// „Mein Gym“: Mit jedem Arbeitssatz schlägst du auf einen Stein. Ist er zerbrochen, liegt darunter ein neues
// Trainingsgerät, das du in dein eigenes Gym stellen kannst. Alles wird aus deinen Trainings berechnet –
// so sehen auch Freunde, wie weit du bist. Die Aufstellung im Gym wird auf dem Gerät gespeichert.
import type { WorkoutSet } from './types';

export type Rarity = 'gewöhnlich' | 'selten' | 'episch' | 'legendär';
export interface GymItem { id: string; name: string; pattern: string; rarity: Rarity }

/** Reihenfolge der Belohnungen (Muster-ID = gezeichnetes Gerät aus den Übungs-Animationen) */
export const GYM_ITEMS: GymItem[] = [
  ['bench', 'Hantelbank mit Ablage', 'bench', 'gewöhnlich'],
  ['pullup', 'Klimmzugstange', 'pullup', 'gewöhnlich'],
  ['dip', 'Dip-Barren', 'dip', 'gewöhnlich'],
  ['bike', 'Fahrradergometer', 'bike', 'gewöhnlich'],
  ['run', 'Laufband', 'run', 'gewöhnlich'],
  ['erg', 'Rudergerät', 'erg', 'gewöhnlich'],
  ['legext', 'Beinstrecker', 'legext', 'gewöhnlich'],
  ['legcurl', 'Beinbeuger (liegend)', 'legcurl', 'gewöhnlich'],
  ['pecdeck', 'Butterfly-Maschine', 'pecdeck', 'selten'],
  ['chestpress', 'Brustpresse', 'chestpress', 'selten'],
  ['pulldown', 'Latzug', 'pulldown', 'selten'],
  ['seatedrow', 'Kabelrudern', 'seatedrow', 'selten'],
  ['ohp-machine', 'Schulterpresse', 'ohp-machine', 'selten'],
  ['legcurl-seated', 'Beinbeuger (sitzend)', 'legcurl-seated', 'selten'],
  ['preacher', 'Scott-Bank', 'preacher', 'selten'],
  ['calf-machine', 'Wadenmaschine', 'calf-machine', 'selten'],
  ['abmachine', 'Bauchmaschine', 'abmachine', 'selten'],
  ['abductor', 'Abduktoren-Maschine', 'abductor', 'selten'],
  ['curl-machine', 'Bizepsmaschine', 'curl-machine', 'episch'],
  ['dipmachine', 'Dip-Maschine', 'dipmachine', 'episch'],
  ['assist-pullup', 'Klimmzug-Maschine', 'assist-pullup', 'episch'],
  ['rowmachine', 'Rudermaschine', 'rowmachine', 'episch'],
  ['hipthrust-machine', 'Hip-Thrust-Maschine', 'hipthrust-machine', 'episch'],
  ['hack', 'Hackenschmidt', 'hack', 'episch'],
  ['legpress', 'Beinpresse 45°', 'legpress', 'episch'],
  ['triceps', 'Kabelturm', 'triceps', 'legendär'],
  ['cablefly', 'Cable Crossover', 'cablefly', 'legendär'],
  ['smith', 'Smith-Maschine', 'squat-smith', 'legendär'],
].map(([id, name, pattern, rarity]) => ({ id, name, pattern, rarity: rarity as Rarity }));

/** Sätze, die Stein Nr. n (ab 0) braucht – wird langsam härter */
export const stoneHp = (n: number) => 15 + 8 * n;
/** Schläge = Arbeitssätze (ohne Aufwärmsätze) */
export const hitsFrom = (sets: Pick<WorkoutSet, 'is_warmup'>[]) => sets.filter((s) => !s.is_warmup).length;

export interface GymProgress {
  /** zerbrochene Steine = freigeschaltete Geräte */
  unlocked: GymItem[];
  /** aktueller Stein (null, wenn alles gesammelt) */
  stone: { index: number; hp: number; done: number; next: GymItem } | null;
  hits: number;
}
export function gymProgress(hits: number): GymProgress {
  let left = hits, n = 0;
  while (n < GYM_ITEMS.length && left >= stoneHp(n)) { left -= stoneHp(n); n++; }
  return {
    unlocked: GYM_ITEMS.slice(0, n),
    stone: n < GYM_ITEMS.length ? { index: n, hp: stoneHp(n), done: left, next: GYM_ITEMS[n] } : null,
    hits,
  };
}

// ---- Aufstellung (auf dem Gerät) ----
export const SLOTS = 12;
const layoutKey = (uid: string) => `gym-tracker-gym:${uid}`;
export function loadLayout(uid: string): (string | null)[] {
  try {
    const v = JSON.parse(localStorage.getItem(layoutKey(uid)) ?? 'null');
    if (Array.isArray(v)) return Array.from({ length: SLOTS }, (_, i) => (typeof v[i] === 'string' ? v[i] : null));
  } catch {
    /* leer starten */
  }
  return Array(SLOTS).fill(null);
}
export function saveLayout(uid: string, layout: (string | null)[]) {
  try {
    localStorage.setItem(layoutKey(uid), JSON.stringify(layout));
  } catch {
    /* nur Komfort */
  }
}
/** Neu gefundene Geräte automatisch auf freie Plätze stellen (Spieler kann umstellen) */
export function autoPlace(layout: (string | null)[], unlocked: GymItem[]): (string | null)[] {
  const out = [...layout];
  const placedOrStored = new Set(out.filter(Boolean));
  for (const it of unlocked) {
    if (placedOrStored.has(it.id)) continue;
    const free = out.indexOf(null);
    if (free < 0) break;
    out[free] = it.id;
  }
  return out;
}
const seenKey = (uid: string) => `gym-tracker-gym-seen:${uid}`;
/** Wie viele Steine hat die Person schon zerbrechen sehen (für die Enthüllungs-Animation) */
export function seenCount(uid: string): number | null {
  try {
    const v = localStorage.getItem(seenKey(uid));
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}
export function setSeenCount(uid: string, n: number) {
  try {
    localStorage.setItem(seenKey(uid), String(n));
  } catch {
    /* nur Komfort */
  }
}

// =========================================================================================
// Frei gestalten: Objekte (Geräte + Deko) mit Position, Ausbaustufen, Name, Kisten, Empore
// =========================================================================================
export type DecoKind = 'sign' | 'deco';
/** h = echte Höhe in Metern (für die Größenverhältnisse im Raum) */
export interface DecoItem { id: string; name: string; kind: DecoKind; price: number; h: number; text?: string; color?: string; chest?: number; vintage?: boolean; /** hängt an der Decke: Abstand zum Boden in Metern */ hang?: number }

/** Kaufbare Deko & Schilder (IDs/Preise passen zu public.shop_items, kind 'gymdeco') */
export const DECO_SHOP: DecoItem[] = [
  { id: 'gym_sign_cali', name: 'Schild „Calisthenics-Bereich“', kind: 'sign', price: 150, h: 1.5, text: 'CALISTHENICS', color: '#2f9e44' },
  { id: 'gym_sign_free', name: 'Schild „Free Weights“', kind: 'sign', price: 150, h: 1.5, text: 'FREE WEIGHTS', color: '#1971c2' },
  { id: 'gym_sign_cardio', name: 'Schild „Cardio-Zone“', kind: 'sign', price: 150, h: 1.5, text: 'CARDIO', color: '#e8590c' },
  { id: 'gym_sign_legday', name: 'Schild „Leg Day“', kind: 'sign', price: 120, h: 1.5, text: 'LEG DAY', color: '#c2255c' },
  { id: 'gym_sign_nopain', name: 'Schild „No Pain No Gain“', kind: 'sign', price: 200, h: 1.5, text: 'NO PAIN NO GAIN', color: '#212529' },
  { id: 'gym_neon_beast', name: 'Neon „Beast Mode“', kind: 'sign', price: 250, h: 1.0, text: 'BEAST MODE', color: '#ff3cac' },
  { id: 'gym_plant', name: 'Pflanze', kind: 'deco', price: 80, h: 1.2 },
  { id: 'gym_bag', name: 'Boxsack', kind: 'deco', price: 220, h: 1.4, hang: 0.4 },
  { id: 'gym_dbrack', name: 'Kurzhantel-Ständer', kind: 'deco', price: 260, h: 1.0 },
  { id: 'gym_kettle', name: 'Kettlebell-Reihe', kind: 'deco', price: 180, h: 0.5 },
  { id: 'gym_water', name: 'Wasserspender', kind: 'deco', price: 120, h: 1.3 },
  { id: 'gym_mat', name: 'Sportmatte', kind: 'deco', price: 90, h: 0.35 },
  { id: 'gym_lamp', name: 'Neonlampe', kind: 'deco', price: 140, h: 0.25, hang: 2.2 },
  { id: 'gym_chalk', name: 'Kreidebox', kind: 'deco', price: 80, h: 0.9 },
  { id: 'gym_rings', name: 'Turnringe', kind: 'deco', price: 160, h: 1.2, hang: 1.0 },
];
/** Nicht mehr im Laden (Vintage-Stil entfernt) – wer sie schon gekauft hat, behält sie im Lager */
export const RETIRED_DECO: DecoItem[] = [
  { id: 'gym_v_clubs', name: 'Holz-Keulen (Indian Clubs)', kind: 'deco', price: 120, h: 0.75, vintage: true },
  { id: 'gym_v_medball', name: 'Leder-Medizinball', kind: 'deco', price: 100, h: 0.45, vintage: true },
  { id: 'gym_v_ladder', name: 'Holz-Sprossenwand', kind: 'deco', price: 240, h: 2.4, vintage: true },
  { id: 'gym_v_scale', name: 'Alte Waage', kind: 'deco', price: 160, h: 1.6, vintage: true },
  { id: 'gym_v_rope', name: 'Kletterseil', kind: 'deco', price: 180, h: 2.8, vintage: true },
  { id: 'gym_v_poster', name: 'Poster „Strongman 1920“', kind: 'deco', price: 130, h: 1.3, vintage: true },
  { id: 'gym_v_dbrack', name: 'Holz-Hantelständer', kind: 'deco', price: 220, h: 0.95, vintage: true },
  { id: 'gym_v_ring', name: 'Boxring-Ecke', kind: 'deco', price: 300, h: 1.4, vintage: true },
];
/** Exklusive Deko aus Belohnungs-Kisten (nach Stein 5, 10, 15, 20, 25 und dem letzten) */
export const CHEST_DECO: DecoItem[] = [
  { id: 'chest_trophy', name: 'Pokal', kind: 'deco', price: 0, h: 0.8, chest: 5 },
  { id: 'chest_golddb', name: 'Goldene Hantel', kind: 'deco', price: 0, h: 0.5, chest: 10 },
  { id: 'chest_belt', name: 'Champion-Gürtel in Vitrine', kind: 'deco', price: 0, h: 1.6, chest: 15 },
  { id: 'chest_neon', name: 'Neon „LEVEL UP“', kind: 'sign', price: 0, h: 1.0, chest: 20, text: 'LEVEL UP', color: '#e8222f' },
  { id: 'chest_statue', name: 'Athleten-Statue', kind: 'deco', price: 0, h: 2.0, chest: 25 },
  { id: 'chest_crown', name: 'Goldene Krone', kind: 'deco', price: 0, h: 0.7, chest: 28 },
];
export const ALL_DECO = [...DECO_SHOP, ...CHEST_DECO, ...RETIRED_DECO];
export const DECO_BY_ID = new Map(ALL_DECO.map((d) => [d.id, d]));
const KNOWN = new Set([...GYM_ITEMS.map((i) => i.id), ...ALL_DECO.map((d) => d.id)]);

/** Kisten, die man mit n zerschlagenen Steinen verdient hat */
export const chestsEarned = (broken: number) => CHEST_DECO.filter((c) => broken >= (c.chest ?? 99));

/** meters = echte Raumbreite (daraus der gemeinsame Maßstab für alle Geräte) */
export interface GymTier { id: string; name: string; min: number; max: number; empore: boolean; meters: number }
export const TIERS: GymTier[] = [
  { id: 'garage', name: 'Garage', min: 0, max: 8, empore: false, meters: 5 },
  { id: 'studio', name: 'Studio', min: 6, max: 16, empore: false, meters: 6.5 },
  { id: 'halle', name: 'Halle', min: 14, max: 28, empore: false, meters: 8 },
  { id: 'elevation', name: 'Elevation Center', min: 22, max: 40, empore: true, meters: 9 },
];
export const tierFor = (machines: number) => [...TIERS].reverse().find((t) => machines >= t.min)!;
export const nextTier = (machines: number) => TIERS.find((t) => t.min > machines) ?? null;

/** Ansicht eines Objekts: 0 von vorne, 1 von links, 2 von hinten, 3 von rechts */
export type GymRot = 0 | 1 | 2 | 3;
export const VIEW_NAMES = ['von vorne', 'von links', 'von hinten', 'von rechts'] as const;
/** Ein aufgestelltes Objekt: x 0–100 (links→rechts), y 0–100 (hinten→vorne), level 1 = Empore, rot = Ansicht */
export interface GymObject { id: string; x: number; y: number; level: 0 | 1; rot?: GymRot }
export interface GymState { name: string; objects: GymObject[] }
export const MAX_NAME = 24;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Daten (vom Server oder Gerät) prüfen und bereinigen */
export function cleanGym(raw: unknown, owned: Set<string>, tier: GymTier): GymState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { name?: unknown; objects?: unknown };
  const name = typeof r.name === 'string' ? r.name.slice(0, MAX_NAME) : '';
  const seen = new Set<string>();
  const objects: GymObject[] = [];
  for (const o of Array.isArray(r.objects) ? r.objects : []) {
    if (!o || typeof o !== 'object') continue;
    const { id, x, y, level, rot, flip } = o as Record<string, unknown>;
    // bekannte Dinge erlauben (Besitz der Deko lädt evtl. erst später – fremde IDs werden verworfen)
    if (typeof id !== 'string' || !(owned.has(id) || KNOWN.has(id)) || seen.has(id)) continue;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    seen.add(id);
    const lv = level === 1 && tier.empore ? 1 : 0;
    // früher gab es nur „Spiegeln“ (flip) – das entspricht jetzt der Ansicht von rechts
    const r = rot === 1 || rot === 2 || rot === 3 ? rot : flip === true ? 3 : 0;
    objects.push({ id, x: clamp(x, 0, 100), y: clamp(y, 0, 100), level: lv, ...(r ? { rot: r } : {}) });
    if (objects.length >= tier.max) break;
  }
  return { name, objects };
}
/** Alte Aufstellung (12 feste Plätze in 3 Reihen) in freie Positionen umrechnen */
export function fromSlots(layout: (string | null)[]): GymObject[] {
  return layout.flatMap((id, i) => (id ? [{ id, x: 12.5 + (i % 4) * 25, y: [10, 45, 85][Math.floor(i / 4)] ?? 50, level: 0 as const }] : []));
}
/** Neues Objekt an einen freien Platz in der Mitte stellen */
export function placeNew(state: GymState, id: string): GymState {
  // freien Platz suchen: möglichst weit weg von allem, was schon auf dem Boden steht
  const floor = state.objects.filter((o) => o.level === 0);
  let best = { x: 50, y: 50 }, bestD = -1;
  for (const y of [12, 40, 68, 92]) for (const x of [12, 37, 62, 87]) {
    const d = floor.length ? Math.min(...floor.map((o) => Math.hypot(o.x - x, (o.y - y) * 1.3))) : 999;
    if (d > bestD + 0.01) { bestD = d; best = { x, y }; }
  }
  return { ...state, objects: [...state.objects, { id, ...best, level: 0 }] };
}

const gymKey = (uid: string) => `gym-tracker-gym2:${uid}`;
export function loadGymLocal(uid: string): unknown {
  try {
    const v = localStorage.getItem(gymKey(uid));
    if (v) return JSON.parse(v);
  } catch {
    /* leer */
  }
  return { name: '', objects: fromSlots(loadLayout(uid)) };
}
export function saveGymLocal(uid: string, state: GymState) {
  try {
    localStorage.setItem(gymKey(uid), JSON.stringify(state));
  } catch {
    /* nur Komfort */
  }
}
const chestKey = (uid: string) => `gym-tracker-chests:${uid}`;
export function chestsOpened(uid: string): number | null {
  try {
    const v = localStorage.getItem(chestKey(uid));
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}
export function setChestsOpened(uid: string, n: number) {
  try {
    localStorage.setItem(chestKey(uid), String(n));
  } catch {
    /* nur Komfort */
  }
}

// =========================================================================================
// Namensideen fürs eigene Gym (fest + Baukasten + persönlich aus Vorname, Lieblings-Muskelgruppe, Ausbaustufe)
// =========================================================================================
export const NAME_IDEAS = [
  'Elevations', 'Iron Temple', 'Beast Factory', 'Gainz Garage', 'Muscle Lab', 'Die Schmiede', 'Kraftwerk', 'Titan Club',
  'Pump House', 'Level Up Gym', 'Iron Paradise', 'Sweat Society', 'Eisenzeit', 'Muckibude Deluxe', 'No Excuses Club',
  'Gravity Zone', 'Steel Mill', 'Rep Republic', 'Barbell Bunker', 'Olymp', 'Hantelhimmel', 'Next Level Lab', 'Power Plant',
  'Grind House', 'Iron Kingdom', 'Comeback Club',
];
const PREFIX = ['Iron', 'Beast', 'Titan', 'Alpha', 'Steel', 'Gold', 'Power', 'Rebel', 'Spartan', 'Thunder', 'Phoenix', 'Atlas'];
const SUFFIX = ['Gym', 'Lab', 'Club', 'Factory', 'Zone', 'Temple', 'House', 'Arena', 'Forge', 'Den'];
/** Lieblings-Muskelgruppe → passende Namen */
const FOCUS_NAMES: Record<string, string[]> = {
  beine: ['Leg Day Lab', 'Quad Factory', 'Squat Society'],
  brust: ['Chest Club', 'Bench Temple', 'Press Paradise'],
  ruecken: ['Back Factory', 'Pull-Up Palace', 'Lat Lab'],
  schultern: ['Shoulder Summit', 'Boulder Club', 'Delt Den'],
  arme: ['Arm Armory', 'Biceps Bunker', 'Gun Show Gym'],
  bauch: ['Core Club', 'Sixpack Society', 'Abs Factory'],
  cardio: ['Cardio Kingdom', 'Run & Rise', 'Sweat Station'],
};
const TIER_SUFFIX: Record<string, string> = { garage: 'Garage', studio: 'Studio', halle: 'Arena', elevation: 'Center' };

export interface NameContext { firstName?: string; focus?: string; tier?: string }
/** Kleiner, reproduzierbarer Zufall (gleicher seed → gleiche Vorschläge) */
function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/** Vorname aus dem Anzeigenamen – nur Buchstaben, sonst leer (kein „Du“) */
export const firstNameOf = (display: string) => {
  const n = display.trim().split(/[\s._@-]+/)[0] ?? '';
  return /^\p{L}{2,12}$/u.test(n) && n.toLowerCase() !== 'du' ? n[0].toUpperCase() + n.slice(1) : '';
};
/**
 * 6 verschiedene Namensideen (≤ 24 Zeichen). Die erste ist persönlich (Vorname/Lieblings-Muskelgruppe), falls möglich.
 * blocked: Prüfung auf anstößige Wörter (aus lib/moderation)
 */
export function gymNameIdeas(seed: number, ctx: NameContext = {}, blocked: (s: string) => boolean = () => false): { name: string; personal: boolean }[] {
  const r = rng(seed + 1);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const personal: string[] = [];
  const focus = ctx.focus ? FOCUS_NAMES[ctx.focus] : undefined;
  const tierWord = ctx.tier ? TIER_SUFFIX[ctx.tier] : undefined;
  if (ctx.firstName) {
    const owner = /[sxzß]$/i.test(ctx.firstName) ? `${ctx.firstName}’` : `${ctx.firstName}s`;
    personal.push(`${owner} ${pick(['Iron Temple', 'Beast Factory', 'Kraftwerk', 'Muscle Lab', 'Power Plant'])}`);
    if (tierWord) personal.push(`${owner} ${pick(PREFIX)} ${tierWord}`);
  }
  if (focus) personal.push(pick(focus));
  if (tierWord) personal.push(`${pick(PREFIX)} ${tierWord}`);
  const out: { name: string; personal: boolean }[] = [];
  const add = (name: string, p: boolean) => {
    if (name.length <= MAX_NAME && !blocked(name) && !out.some((o) => o.name === name)) out.push({ name, personal: p });
  };
  // persönliche Idee zuerst (gemischt), dann feste Liste und Baukasten abwechselnd
  for (const n of personal.sort(() => r() - 0.5).slice(0, 2)) add(n, true);
  for (let i = 0; out.length < 6 && i < 60; i++) add(i % 2 ? `${pick(PREFIX)} ${pick(SUFFIX)}` : pick(NAME_IDEAS), false);
  return out;
}
