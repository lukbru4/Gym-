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
