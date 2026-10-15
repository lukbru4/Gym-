// „Abenteuer“: Ein Begleiter schlüpft aus einem Ei, wird durch dein Training stärker und reist mit dir um die Welt –
// mit Gipfel-Etappen (bewegte Kilos = Höhenmeter) und Postkarten fürs Album. Alles wird aus den Trainingsdaten berechnet.
import { exerciseCategories } from './muscles';
import { isWorkingSet } from './stats';
import type { Exercise, ExerciseMap, ISODate, Workout, WorkoutSet } from './types';

// ---- Begleiter ---------------------------------------------------------------------------
export type Species = 'drache' | 'wolf' | 'gorilla';
export const SPECIES: { id: Species; name: string; egg: [string, string] }[] = [
  { id: 'drache', name: 'Drache', egg: ['#7bd389', '#2f9e44'] },
  { id: 'wolf', name: 'Wolf', egg: ['#c9d1da', '#6c7a89'] },
  { id: 'gorilla', name: 'Gorilla', egg: ['#c8a27a', '#6b4a2b'] },
];
export interface Stage { id: 'ei' | 'baby' | 'junior' | 'kraftpaket' | 'legende'; name: string; min: number }
/** Entwicklung nach Anzahl Trainings */
export const STAGES: Stage[] = [
  { id: 'ei', name: 'Ei', min: 0 },
  { id: 'baby', name: 'Baby', min: 3 },
  { id: 'junior', name: 'Junior', min: 15 },
  { id: 'kraftpaket', name: 'Kraftpaket', min: 40 },
  { id: 'legende', name: 'Legende', min: 100 },
];
export const stageIndex = (workouts: number) => STAGES.reduce((acc, s, i) => (workouts >= s.min ? i : acc), 0);
export const nextStage = (workouts: number) => STAGES.find((s) => s.min > workouts) ?? null;

export type Mood = 'froh' | 'muede' | 'traurig';
/** Stimmung nach Tagen ohne Training (nur Aussehen, keine Strafe) */
export function moodFor(daysSince: number | null): Mood {
  if (daysSince === null || daysSince <= 2) return 'froh';
  return daysSince <= 6 ? 'muede' : 'traurig';
}
export const MOOD_TEXT: Record<Mood, string> = {
  froh: 'ist topfit und freut sich aufs nächste Training! 💪',
  muede: 'wird langsam müde – Zeit für ein Training?',
  traurig: 'vermisst dich … ein kurzes Training macht es wieder froh.',
};

export type Group = 'arme' | 'brust' | 'ruecken' | 'schultern' | 'bauch' | 'beine';
export const GROUPS: Group[] = ['arme', 'brust', 'ruecken', 'schultern', 'bauch', 'beine'];

const dayMs = 86400000;
const daysBetween = (a: ISODate, b: ISODate) => Math.round((Date.parse(b) - Date.parse(a)) / dayMs);

/** Muskelanteile der letzten Tage (0–1, stärkste Gruppe = 1) – dort wachsen die Muskeln des Begleiters */
export function muscleShares(workouts: Workout[], sets: WorkoutSet[], ex: ExerciseMap, today: ISODate, days = 30): Record<Group, number> {
  const dateOf = new Map(workouts.map((w) => [w.id, w.date]));
  const count: Record<Group, number> = { arme: 0, brust: 0, ruecken: 0, schultern: 0, bauch: 0, beine: 0 };
  for (const s of sets) {
    const d = dateOf.get(s.workout_id);
    if (!d || daysBetween(d, today) > days || !isWorkingSet(s)) continue;
    const e = ex.get(s.exercise_id);
    if (!e) continue;
    for (const c of exerciseCategories({ id: s.exercise_id, ...e } as Exercise)) if (c in count) count[c as Group]++;
  }
  const max = Math.max(1, ...Object.values(count));
  return Object.fromEntries(GROUPS.map((g) => [g, count[g] / max])) as Record<Group, number>;
}

// ---- Weltreise mit Gipfeln ---------------------------------------------------------------
/** 1 Satz = 25 Reise-km, 1 Cardio-km = 50 Reise-km; am Berg: bewegte kg / 10 + 15 je Satz = Höhenmeter */
export const KM_PER_SET = 25, KM_PER_CARDIO_KM = 50, HM_PER_KG = 0.1, HM_PER_SET = 15, HM_PER_CARDIO_KM = 60;

export interface Stop {
  id: string; name: string; country: string; lat: number; lon: number;
  /** Strecke vom vorigen Halt (km) */
  km: number;
  /** Gipfel: Start- und Gipfelhöhe in Metern */
  peak?: { from: number; to: number };
}
export const ROUTE: Stop[] = [
  { id: 'berlin', name: 'Berlin', country: 'Deutschland', lat: 52.5, lon: 13.4, km: 0 },
  { id: 'paris', name: 'Paris', country: 'Frankreich', lat: 48.9, lon: 2.35, km: 880 },
  { id: 'montblanc', name: 'Mont Blanc', country: 'Frankreich', lat: 45.8, lon: 6.86, km: 600, peak: { from: 1035, to: 4808 } },
  { id: 'rom', name: 'Rom', country: 'Italien', lat: 41.9, lon: 12.5, km: 750 },
  { id: 'athen', name: 'Athen', country: 'Griechenland', lat: 37.98, lon: 23.7, km: 1050 },
  { id: 'kairo', name: 'Kairo', country: 'Ägypten', lat: 30.0, lon: 31.2, km: 1120 },
  { id: 'kilimandscharo', name: 'Kilimandscharo', country: 'Tansania', lat: -3.07, lon: 37.35, km: 3500, peak: { from: 1800, to: 5895 } },
  { id: 'kapstadt', name: 'Kapstadt', country: 'Südafrika', lat: -33.9, lon: 18.4, km: 3800 },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brasilien', lat: -22.9, lon: -43.2, km: 6100 },
  { id: 'aconcagua', name: 'Aconcagua', country: 'Argentinien', lat: -32.65, lon: -70.0, km: 3000, peak: { from: 2950, to: 6961 } },
  { id: 'newyork', name: 'New York', country: 'USA', lat: 40.7, lon: -74.0, km: 8500 },
  { id: 'losangeles', name: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.2, km: 3940 },
  { id: 'tokio', name: 'Tokio', country: 'Japan', lat: 35.7, lon: 139.7, km: 8800 },
  { id: 'fuji', name: 'Fuji', country: 'Japan', lat: 35.36, lon: 138.73, km: 100, peak: { from: 2305, to: 3776 } },
  { id: 'peking', name: 'Peking', country: 'China', lat: 39.9, lon: 116.4, km: 2100 },
  { id: 'everest', name: 'Mount Everest', country: 'Nepal', lat: 27.99, lon: 86.93, km: 3000, peak: { from: 5364, to: 8849 } },
  { id: 'dubai', name: 'Dubai', country: 'VAE', lat: 25.2, lon: 55.3, km: 2900 },
  { id: 'istanbul', name: 'Istanbul', country: 'Türkei', lat: 41.0, lon: 28.98, km: 3000 },
  { id: 'heimkehr', name: 'Berlin (Heimkehr)', country: 'Deutschland', lat: 52.5, lon: 13.4, km: 1740 },
];

export interface Journey {
  /** Index des zuletzt erreichten Halts */
  at: number;
  /** Runde (nach der Heimkehr geht es von vorne los) */
  round: number;
  /** unterwegs zum nächsten Halt: geschaffte und gesamte km */
  legDone: number; legKm: number;
  /** am Berg: geschaffte und nötige Höhenmeter (null = kein Aufstieg gerade) */
  climb: { done: number; need: number } | null;
  /** erreichte Halte insgesamt (über alle Runden) – für Postkarten */
  reached: number;
  totalKm: number;
}

/** Beitrag eines Trainings: Reise-km und Höhenmeter */
export function workoutGain(sets: WorkoutSet[], ex: ExerciseMap): { km: number; hm: number } {
  let km = 0, hm = 0;
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const cardio = ex.get(s.exercise_id)?.type === 'cardio';
    const dist = Number(s.distance_km) || 0;
    if (cardio) {
      // Cardio ohne Kilometer zählt wie ein Satz
      km += dist > 0 ? dist * KM_PER_CARDIO_KM : KM_PER_SET;
      hm += dist > 0 ? dist * HM_PER_CARDIO_KM : HM_PER_SET;
    } else {
      km += KM_PER_SET;
      hm += HM_PER_SET + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0) * HM_PER_KG;
    }
  }
  return { km, hm };
}

/** Reise Training für Training nachspielen: unterwegs zählen km, am Berg zählen Höhenmeter */
export function journeyFrom(workouts: Workout[], sets: WorkoutSet[], ex: ExerciseMap): Journey {
  const byW = new Map<number, WorkoutSet[]>();
  for (const s of sets) byW.set(s.workout_id, [...(byW.get(s.workout_id) ?? []), s]);
  const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  let at = 0, round = 1, legDone = 0, reached = 0, totalKm = 0;
  let climb: { done: number; need: number } | null = null;
  for (const w of ordered) {
    const { km: kmAll, hm: hmAll } = workoutGain(byW.get(w.id) ?? [], ex);
    // r = noch nicht verbrauchter Anteil dieses Trainings: unterwegs zählt er als km, am Berg als Höhenmeter
    let r = kmAll > 0 || hmAll > 0 ? 1 : 0;
    for (let guard = 0; guard < 60 && r > 1e-6; guard++) {
      if (climb) {
        if (hmAll <= 0) break;
        const use = Math.min(hmAll * r, climb.need - climb.done);
        climb.done += use; r -= use / hmAll;
        if (climb.done >= climb.need - 0.001) climb = null;
        continue;
      }
      if (kmAll <= 0) break;
      const nextIdx = at + 1 < ROUTE.length ? at + 1 : 1;
      const legKm = ROUTE[nextIdx].km;
      const use = Math.min(kmAll * r, legKm - legDone);
      legDone += use; r -= use / kmAll; totalKm += use;
      if (legDone >= legKm - 0.001) {
        if (at + 1 >= ROUTE.length) round++;
        at = nextIdx; legDone = 0; reached++;
        const pk = ROUTE[at].peak;
        if (pk) climb = { done: 0, need: pk.to - pk.from };
      }
    }
  }
  const nextIdx = at + 1 < ROUTE.length ? at + 1 : 1;
  return { at, round, legDone, legKm: ROUTE[nextIdx].km, climb, reached, totalKm };
}
export const nextStopIndex = (j: Journey) => (j.at + 1 < ROUTE.length ? j.at + 1 : 1);

/** Postkarten: jeder erreichte Halt (ohne Start) einmal fürs Album – Gipfel erst, wenn sie bestiegen sind */
export function postcards(j: Journey): Stop[] {
  const seen = new Set<string>();
  const out: Stop[] = [];
  for (let i = 1; i <= Math.min(j.reached - (j.climb ? 1 : 0), ROUTE.length - 1); i++) {
    const s = ROUTE[i];
    if (!seen.has(s.id)) { seen.add(s.id); out.push(s); }
  }
  return out;
}

// ---- Zusammenfassung für Seite, Startseite und Freunde ------------------------------------
export interface Companion {
  workouts: number; stage: Stage; stageIdx: number; next: Stage | null;
  daysSince: number | null; mood: Mood; shares: Record<Group, number>; journey: Journey;
}
export function companionFrom(workouts: Workout[], sets: WorkoutSet[], ex: ExerciseMap, today: ISODate): Companion {
  // nur Trainings mit mindestens einem Arbeitssatz zählen
  const active = new Set(sets.filter(isWorkingSet).map((s) => s.workout_id));
  const done = workouts.filter((w) => active.has(w.id));
  const last = done.map((w) => w.date).sort().pop() ?? null;
  const daysSince = last ? Math.max(0, daysBetween(last, today)) : null;
  const n = done.length, idx = stageIndex(n);
  return {
    workouts: n, stage: STAGES[idx], stageIdx: idx, next: nextStage(n), daysSince, mood: moodFor(daysSince),
    shares: muscleShares(done, sets, ex, today), journey: journeyFrom(done, sets, ex),
  };
}

// ---- Gespeichert: Art und Name ------------------------------------------------------------
export interface AdventureState { species: Species; name: string }
export const MAX_PET_NAME = 16;
export function cleanAdventure(raw: unknown): AdventureState | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const species = SPECIES.find((s) => s.id === r.species)?.id;
  if (!species) return null;
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, MAX_PET_NAME) : '';
  return { species, name: name || SPECIES.find((s) => s.id === species)!.name };
}
const key = (uid: string) => `gym-tracker-adventure:${uid}`;
export function loadAdventureLocal(uid: string): unknown {
  try {
    const v = localStorage.getItem(key(uid));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
export function saveAdventureLocal(uid: string, a: AdventureState) {
  try {
    localStorage.setItem(key(uid), JSON.stringify(a));
  } catch {
    /* nur Komfort */
  }
}
/** Was schon gezeigt wurde (Entwicklungsstufe, Anzahl Postkarten) – für die Enthüllungs-Animation */
const seenKey = (uid: string) => `gym-tracker-adventure-seen:${uid}`;
export function loadSeen(uid: string): { stage: number; cards: number } | null {
  try {
    const v = localStorage.getItem(seenKey(uid));
    return v ? (JSON.parse(v) as { stage: number; cards: number }) : null;
  } catch {
    return null;
  }
}
export function saveSeen(uid: string, s: { stage: number; cards: number }) {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify(s));
  } catch {
    /* nur Komfort */
  }
}

/** Namensideen für den Begleiter */
export const PET_NAMES: Record<Species, string[]> = {
  drache: ['Blaze', 'Smaug', 'Ignis', 'Feuerzahn', 'Draco', 'Ember', 'Glut', 'Pyro'],
  wolf: ['Luna', 'Shadow', 'Fenrir', 'Grauwolf', 'Storm', 'Ghost', 'Akira', 'Blitz'],
  gorilla: ['Kong', 'Bruno', 'Titan', 'Bongo', 'Rocky', 'Hulk', 'Banana Joe', 'Atlas'],
};
