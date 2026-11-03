// „Mein Gym“: Du startest mit einem leeren Boden und baust dir mit deinen Trainings-Credits dein eigenes Studio –
// Wände, Fenster, Licht, mehr Fläche, einen 2. Stock –, kaufst realistische Geräte und stellst Leute hinein,
// die dort trainieren. (Die alten Steine zählen nur noch für den Umstieg bestehender Gyms.)
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
export interface DecoItem { id: string; name: string; kind: DecoKind; price: number; h: number; text?: string; color?: string; chest?: number; vintage?: boolean }

/** Kaufbare Deko & Schilder (IDs/Preise passen zu public.shop_items, kind 'gymdeco') */
export const DECO_SHOP: DecoItem[] = [
  { id: 'gym_sign_cali', name: 'Schild „Calisthenics-Bereich“', kind: 'sign', price: 150, h: 1.5, text: 'CALISTHENICS', color: '#2f9e44' },
  { id: 'gym_sign_free', name: 'Schild „Free Weights“', kind: 'sign', price: 150, h: 1.5, text: 'FREE WEIGHTS', color: '#1971c2' },
  { id: 'gym_sign_cardio', name: 'Schild „Cardio-Zone“', kind: 'sign', price: 150, h: 1.5, text: 'CARDIO', color: '#e8590c' },
  { id: 'gym_sign_legday', name: 'Schild „Leg Day“', kind: 'sign', price: 120, h: 1.5, text: 'LEG DAY', color: '#c2255c' },
  { id: 'gym_sign_nopain', name: 'Schild „No Pain No Gain“', kind: 'sign', price: 200, h: 1.5, text: 'NO PAIN NO GAIN', color: '#212529' },
  { id: 'gym_neon_beast', name: 'Neon „Beast Mode“', kind: 'sign', price: 250, h: 1.0, text: 'BEAST MODE', color: '#ff3cac' },
  { id: 'gym_plant', name: 'Pflanze', kind: 'deco', price: 80, h: 1.2 },
  { id: 'gym_dbrack', name: 'Kurzhantel-Ständer', kind: 'deco', price: 260, h: 1.0 },
  { id: 'gym_kettle', name: 'Kettlebell-Reihe', kind: 'deco', price: 180, h: 0.5 },
  { id: 'gym_water', name: 'Wasserspender', kind: 'deco', price: 120, h: 1.3 },
  { id: 'gym_mat', name: 'Sportmatte', kind: 'deco', price: 90, h: 0.35 },
  { id: 'gym_chalk', name: 'Kreidebox', kind: 'deco', price: 80, h: 0.9 },
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
/** Hängende Deko gibt es nicht mehr (weder im Laden noch im Raum) */
export const HANGING = new Set(['gym_bag', 'gym_lamp', 'gym_rings']);
export const ALL_DECO = [...DECO_SHOP, ...CHEST_DECO, ...RETIRED_DECO];
export const DECO_BY_ID = new Map(ALL_DECO.map((d) => [d.id, d]));
const KNOWN = new Set([...GYM_ITEMS.map((i) => i.id), ...ALL_DECO.map((d) => d.id)]);

/** Kisten, die man mit n zerschlagenen Steinen verdient hat */
export const chestsEarned = (broken: number) => CHEST_DECO.filter((c) => broken >= (c.chest ?? 99));

/** Raum: echte Breite in Metern (gemeinsamer Maßstab), Platz für Objekte, 2. Stock */
export interface GymTier { id: string; name: string; min: number; max: number; empore: boolean; meters: number }
/** Alte Ausbaustufen (nur noch für den Übergang bestehender Gyms) */
export const TIERS: GymTier[] = [
  { id: 'garage', name: 'Garage', min: 0, max: 8, empore: false, meters: 5 },
  { id: 'studio', name: 'Studio', min: 6, max: 16, empore: false, meters: 6.5 },
  { id: 'halle', name: 'Halle', min: 14, max: 28, empore: false, meters: 8 },
  { id: 'elevation', name: 'Elevation Center', min: 22, max: 40, empore: true, meters: 9 },
];
export const tierFor = (machines: number) => [...TIERS].reverse().find((t) => machines >= t.min)!;

// ---- Bauen mit Credits: Boden → Wände → Fenster → Licht → Fläche → 2. Stock ----------------------
export type BuildGroup = 'wand' | 'fenster' | 'licht' | 'boden' | 'flaeche' | 'stock';
export interface BuildItem { id: string; name: string; price: number; group: BuildGroup; needs?: string[]; text: string }
/** IDs/Preise passen zu public.shop_items (kind 'gympart') */
export const BUILD_ITEMS: BuildItem[] = [
  { id: 'b_wall_back', name: 'Rückwand', price: 250, group: 'wand', text: 'Die erste Wand hinter deinem Gym – Platz für Fenster, Spiegel und dein Namensschild.' },
  { id: 'b_wall_sides', name: 'Seitenwände', price: 300, group: 'wand', needs: ['b_wall_back'], text: 'Links und rechts zu – jetzt ist es ein richtiger Raum.' },
  { id: 'b_style_brick', name: 'Backstein-Wände', price: 200, group: 'wand', needs: ['b_wall_back'], text: 'Rote Backsteine statt Beton.' },
  { id: 'b_style_wood', name: 'Holz-Verkleidung', price: 200, group: 'wand', needs: ['b_wall_back'], text: 'Warme Holzwände.' },
  { id: 'b_style_dark', name: 'Dunkel modern', price: 250, group: 'wand', needs: ['b_wall_back'], text: 'Schwarze Wände wie in einem Premium-Studio.' },
  { id: 'b_window_1', name: 'Fenster 1', price: 80, group: 'fenster', needs: ['b_wall_back'], text: 'Tageslicht für dein Gym.' },
  { id: 'b_window_2', name: 'Fenster 2', price: 80, group: 'fenster', needs: ['b_window_1'], text: 'Noch mehr Licht.' },
  { id: 'b_window_3', name: 'Fenster 3', price: 100, group: 'fenster', needs: ['b_window_2'], text: 'Große Fensterfront.' },
  { id: 'b_window_4', name: 'Fenster 4', price: 100, group: 'fenster', needs: ['b_window_3'], text: 'Rundum hell.' },
  { id: 'b_mirror', name: 'Spiegelwand', price: 200, group: 'fenster', needs: ['b_wall_back'], text: 'Ein großer Spiegel – Technik checken!' },
  { id: 'b_lights', name: 'Deckenstrahler', price: 150, group: 'licht', text: 'Helles Licht von oben.' },
  { id: 'b_floor_rubber', name: 'Gummimatten-Boden', price: 150, group: 'boden', text: 'Schwarze Matten wie im Studio.' },
  { id: 'b_floor_wood', name: 'Holzboden', price: 200, group: 'boden', text: 'Heller Parkettboden.' },
  { id: 'b_size_m', name: 'Größere Fläche', price: 500, group: 'flaeche', text: 'Mehr Platz: 7 m breit, bis zu 16 Dinge.' },
  { id: 'b_size_l', name: 'Große Halle', price: 1200, group: 'flaeche', needs: ['b_size_m'], text: '9 m breit, bis zu 28 Dinge.' },
  { id: 'b_floor2', name: '2. Stock', price: 1500, group: 'stock', needs: ['b_size_m', 'b_wall_back'], text: 'Eine Galerie mit Treppe – Geräte auch oben aufstellen, +12 Plätze.' },
];
export const BUILD_BY_ID = new Map(BUILD_ITEMS.map((b) => [b.id, b]));
export type WallStyle = 'beton' | 'brick' | 'wood' | 'dark';
export type FloorStyle = 'fliesen' | 'rubber' | 'wood';

/** Geräte gibt es nur noch per Kauf: Preis nach Seltenheit (shop_items kind 'gymmachine', ID m_<gerät>) */
export const MACHINE_PRICE: Record<Rarity, number> = { 'gewöhnlich': 150, 'selten': 300, 'episch': 500, 'legendär': 800 };
export const machineShopId = (id: string) => `m_${id}`;

/** Leute, die in deinem Gym trainieren: du, Freunde (gratis) und weitere Figuren (mit Credits, kind 'gymnpc') */
export interface Look { skin: string; shirt: string; shorts: string; hair: string }
export interface NpcItem { id: string; name: string; price: number; look: Look; text: string }
export const NPCS: NpcItem[] = [
  { id: 'p_anna', name: 'Anna', price: 200, look: { skin: '#f1c7a5', shirt: '#e64980', shorts: '#2b2d42', hair: '#8b5a2b' }, text: 'Liebt Beintag.' },
  { id: 'p_max', name: 'Max', price: 200, look: { skin: '#e0ac69', shirt: '#1c7ed6', shorts: '#1b1d21', hair: '#2b2b2b' }, text: 'Bankdrücken jeden Montag.' },
  { id: 'p_lea', name: 'Lea', price: 250, look: { skin: '#c68642', shirt: '#2f9e44', shorts: '#343a40', hair: '#1b1b1b' }, text: 'Cardio-Queen.' },
  { id: 'p_tom', name: 'Tom', price: 250, look: { skin: '#f6d5b8', shirt: '#f08c00', shorts: '#212529', hair: '#d9a441' }, text: 'Immer am Kabelturm.' },
  { id: 'p_kai', name: 'Trainer Kai', price: 400, look: { skin: '#8d5524', shirt: '#e8222f', shorts: '#111111', hair: '#111111' }, text: 'Zeigt allen die richtige Technik.' },
  { id: 'p_erna', name: 'Fitte Oma Erna', price: 300, look: { skin: '#f3d3bd', shirt: '#7950f2', shorts: '#495057', hair: '#dee2e6' }, text: 'Älter als das Gym, stärker als du denkst.' },
];
export const NPC_BY_ID = new Map(NPCS.map((n) => [n.id, n]));
export const ME_LOOK: Look = { skin: '#f0c9ad', shirt: '#3b4554', shorts: '#2a2d34', hair: '#4a3020' };
export const FRIEND_LOOK: Look = { skin: '#e8b996', shirt: '#0ca678', shorts: '#2a2d34', hair: '#2b2b2b' };

/** Raum aus den gebauten Teilen */
export function roomFor(build: string[]): GymTier {
  const has = (b: string) => build.includes(b);
  const size = has('b_size_l') ? 'l' : has('b_size_m') ? 'm' : 's';
  const base = { s: { name: 'Kleiner Raum', max: 8, meters: 5 }, m: { name: 'Studio', max: 16, meters: 7 }, l: { name: 'Halle', max: 28, meters: 9 } }[size];
  const empore = has('b_floor2');
  return { id: size, name: base.name + (empore ? ' mit 2. Stock' : ''), min: 0, max: base.max + (empore ? 12 : 0), empore, meters: base.meters };
}

/** Ansicht eines Objekts: 0 von vorne, 1 von links, 2 von hinten, 3 von rechts */
export type GymRot = 0 | 1 | 2 | 3;
export const VIEW_NAMES = ['von vorne', 'von links', 'von hinten', 'von rechts'] as const;
/** Ein aufgestelltes Objekt: x 0–100 (links→rechts), y 0–100 (hinten→vorne), level 1 = Empore, rot = Ansicht */
export interface GymObject { id: string; x: number; y: number; level: 0 | 1; rot?: GymRot }
/** Person im Gym: an einem aufgestellten Gerät (on = Objekt-ID) */
export interface GymPerson { who: 'me' | 'friend' | 'npc'; id: string; on: string; name?: string }
export interface GymState {
  name: string; objects: GymObject[];
  /** gebaute Teile (b_…) */
  build: string[];
  wall: WallStyle; floor: FloorStyle;
  people: GymPerson[];
  /** beim Umstieg geschenkt (Geräte aus Steinen, Kisten-Deko, Bauteile der alten Ausbaustufe) */
  legacy: string[];
  v: 2;
}
export const emptyGym = (): GymState => ({ name: '', objects: [], build: [], wall: 'beton', floor: 'fliesen', people: [], legacy: [], v: 2 });
export const MAX_NAME = 24;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const KNOWN_BUY = new Set([...BUILD_ITEMS.map((b) => b.id), ...NPCS.map((n) => n.id), ...GYM_ITEMS.map((i) => machineShopId(i.id)), ...ALL_DECO.map((d) => d.id)]);
const ids = (v: unknown, ok: (x: string) => boolean, max = 200) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok(x)))].slice(0, max) : []);
/** Daten (vom Server oder Gerät) prüfen und bereinigen. room: Raum aus den gebauten Teilen (ohne Angabe daraus berechnet) */
export function cleanGym(raw: unknown, owned: Set<string>, room?: GymTier): GymState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.slice(0, MAX_NAME) : '';
  const legacy = ids(r.legacy, (x) => KNOWN.has(x) || KNOWN_BUY.has(x));
  const built = ids(r.build, (x) => BUILD_BY_ID.has(x));
  const build = built.filter((b) => (BUILD_BY_ID.get(b)!.needs ?? []).every((n) => built.includes(n)));
  const tier = room ?? roomFor(build);
  const wall: WallStyle = r.wall === 'brick' || r.wall === 'wood' || r.wall === 'dark' ? r.wall : 'beton';
  const floor: FloorStyle = r.floor === 'rubber' || r.floor === 'wood' ? r.floor : 'fliesen';
  const seen = new Set<string>();
  const objects: GymObject[] = [];
  for (const o of Array.isArray(r.objects) ? r.objects : []) {
    if (!o || typeof o !== 'object') continue;
    const { id, x, y, level, rot, flip } = o as Record<string, unknown>;
    // bekannte Dinge erlauben (Besitz lädt evtl. erst später – fremde IDs werden verworfen); Hängendes gibt es nicht mehr
    if (typeof id !== 'string' || !(owned.has(id) || KNOWN.has(id)) || HANGING.has(id) || seen.has(id)) continue;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    seen.add(id);
    const lv = level === 1 && tier.empore ? 1 : 0;
    // früher gab es nur „Spiegeln“ (flip) – das entspricht jetzt der Ansicht von rechts
    const rr = rot === 1 || rot === 2 || rot === 3 ? rot : flip === true ? 3 : 0;
    objects.push({ id, x: clamp(x, 0, 100), y: clamp(y, 0, 100), level: lv, ...(rr ? { rot: rr } : {}) });
    if (objects.length >= tier.max) break;
  }
  const machineIds = new Set(objects.filter((o) => GYM_ITEMS.some((g) => g.id === o.id)).map((o) => o.id));
  const people: GymPerson[] = [];
  const takenSpot = new Set<string>(), takenWho = new Set<string>();
  for (const p of Array.isArray(r.people) ? r.people : []) {
    if (!p || typeof p !== 'object') continue;
    const { who, id, on, name: pn } = p as Record<string, unknown>;
    if ((who !== 'me' && who !== 'friend' && who !== 'npc') || typeof id !== 'string' || typeof on !== 'string') continue;
    if (who === 'npc' && !NPC_BY_ID.has(id)) continue;
    if (!machineIds.has(on) || takenSpot.has(on) || takenWho.has(`${who}:${id}`)) continue;
    takenSpot.add(on); takenWho.add(`${who}:${id}`);
    people.push({ who, id: id.slice(0, 40), on, ...(typeof pn === 'string' ? { name: pn.slice(0, 30) } : {}) });
    if (people.length >= 20) break;
  }
  return { name, objects, build, wall, floor, people, legacy, v: 2 };
}

/**
 * Umstieg vom alten Gym (Steine, Ausbaustufen): Wer schon ein Gym hatte, behält gefundene Geräte, Kisten-Deko
 * und bekommt die Wände/Fenster seiner alten Ausbaustufe geschenkt – so ist niemandes Gym plötzlich leer.
 */
export function migrateGym(raw: unknown, hadOldGym: boolean, hits: number): GymState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (r.v === 2) return raw as GymState;
  const base = { ...emptyGym(), name: typeof r.name === 'string' ? r.name : '', objects: Array.isArray(r.objects) ? (r.objects as GymObject[]) : [] };
  if (!hadOldGym) return base;
  const found = gymProgress(hits).unlocked.map((i) => i.id);
  const chests = chestsEarned(found.length).map((c) => c.id);
  const t = tierFor(found.length).id;
  const free = ['b_wall_back', 'b_wall_sides', 'b_window_1'];
  if (t !== 'garage') free.push('b_window_2', 'b_mirror');
  if (t === 'halle' || t === 'elevation') free.push('b_size_m', 'b_window_3', 'b_lights');
  if (t === 'elevation') free.push('b_size_l', 'b_floor2');
  return { ...base, build: free, legacy: [...found.map(machineShopId), ...chests, ...free] };
}

/** Besitz: gekauft (Konto bzw. Gerät) + beim Umstieg geschenkt. Liefert Geräte-IDs, Deko-IDs, Bauteile und Figuren */
export function ownedFrom(bought: string[], legacy: string[]): Set<string> {
  const all = new Set([...bought, ...legacy]);
  const out = new Set<string>();
  for (const x of all) {
    if (x.startsWith('m_')) out.add(x.slice(2)); // Geräte im Raum heißen ohne Vorsilbe
    out.add(x);
  }
  return out;
}
/** Kann man ein Bauteil kaufen? (Voraussetzungen gebaut) */
export const canBuild = (b: BuildItem, built: string[]) => (b.needs ?? []).every((n) => built.includes(n));

// ---- Käufe im lokalen Modus (ohne Konto): Kaufbuch auf dem Gerät ----
const buysKey = (uid: string) => `gym-tracker-gym-buys:${uid}`;
export function localBuys(uid: string): { id: string; price: number }[] {
  try {
    const v = JSON.parse(localStorage.getItem(buysKey(uid)) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === 'string' && typeof x.price === 'number') : [];
  } catch {
    return [];
  }
}
export function addLocalBuy(uid: string, id: string, price: number) {
  try {
    localStorage.setItem(buysKey(uid), JSON.stringify([...localBuys(uid), { id, price }]));
  } catch {
    /* nur Komfort */
  }
}
export const localSpent = (uid: string) => localBuys(uid).reduce((s, b) => s + b.price, 0);

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
  const old = fromSlots(loadLayout(uid));
  return old.length ? { name: '', objects: old } : null;
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
const TIER_SUFFIX: Record<string, string> = { s: 'Garage', m: 'Studio', l: 'Arena', garage: 'Garage', studio: 'Studio', halle: 'Arena', elevation: 'Center' };

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
