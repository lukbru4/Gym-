// Supplements: eigene Liste (z. B. Kreatin, Vitamin D), tägliche Erinnerung und Abhaken „heute genommen“ mit Serie.
// Gespeichert auf dem Gerät. Hinweis: allgemeine Erinnerung, keine medizinische Beratung.
import { useSyncExternalStore } from 'react';
import { DAYS, type Day } from './reminders';

export interface Supplement { id: string; name: string; dose: string; time: string; /** null = jeden Tag */ days: Day[] | null; icon: string; on: boolean }
export const PRESETS: Omit<Supplement, 'id' | 'on'>[] = [
  { name: 'Kreatin', dose: '5 g', time: '08:00', days: null, icon: 'bolt' },
  { name: 'Protein-Shake', dose: '1 Messlöffel', time: '17:00', days: null, icon: 'shaker' },
  { name: 'Vitamin D', dose: '1 Kapsel', time: '08:00', days: null, icon: 'sun' },
  { name: 'Magnesium', dose: '1 Tablette', time: '21:00', days: null, icon: 'moon' },
  { name: 'Omega-3', dose: '1 Kapsel', time: '12:30', days: null, icon: 'fish' },
  { name: 'Zink', dose: '1 Tablette', time: '21:00', days: null, icon: 'shield' },
  { name: 'Multivitamin', dose: '1 Tablette', time: '08:00', days: null, icon: 'pill' },
];
export const MAX_SUPPS = 12;

const listKey = (uid: string) => `gym-tracker-supps:${uid}`;
const takenKey = (uid: string) => `gym-tracker-supps-taken:${uid}`;
const subs = new Set<() => void>();
let tick = 0;
const notify = () => { tick++; for (const f of subs) f(); };
export const useSuppsTick = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => tick, () => tick);

const okTime = (t: unknown) => (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t) ? t : '08:00');
/** Gespeicherte Liste prüfen */
export function cleanSupps(raw: unknown): Supplement[] {
  if (!Array.isArray(raw)) return [];
  const out: Supplement[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const s = r as Record<string, unknown>;
    const name = typeof s.name === 'string' ? s.name.trim().slice(0, 30) : '';
    if (!name) continue;
    const days = Array.isArray(s.days) ? DAYS.filter((d) => (s.days as unknown[]).includes(d)) : null;
    out.push({
      id: typeof s.id === 'string' ? s.id.slice(0, 40) : `s${out.length}`, name,
      dose: typeof s.dose === 'string' ? s.dose.slice(0, 30) : '', time: okTime(s.time),
      days: days && days.length && days.length < 7 ? days : null, icon: typeof s.icon === 'string' ? s.icon.slice(0, 12) : 'pill', on: s.on !== false,
    });
    if (out.length >= MAX_SUPPS) break;
  }
  return out;
}
const read = (k: string) => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null');
  } catch {
    return null;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ohne Speicher: nur bis zum Neuladen */
  }
};
export const loadSupps = (uid: string) => cleanSupps(read(listKey(uid)));
export function saveSupps(uid: string, list: Supplement[]) { write(listKey(uid), cleanSupps(list)); notify(); }

/** Tag → genommene Supplement-IDs */
export type TakenLog = Record<string, string[]>;
export function loadTaken(uid: string): TakenLog {
  const v = read(takenKey(uid));
  return v && typeof v === 'object' ? (v as TakenLog) : {};
}
export function toggleTaken(uid: string, id: string, date: string) {
  const log = loadTaken(uid);
  const day = new Set(log[date] ?? []);
  if (day.has(id)) day.delete(id); else day.add(id);
  log[date] = [...day];
  // nur die letzten 120 Tage behalten
  const keep = Object.keys(log).sort().slice(-120);
  write(takenKey(uid), Object.fromEntries(keep.map((d) => [d, log[d]])));
  notify();
}

const dayOf = (iso: string): Day => DAYS[(new Date(`${iso}T12:00:00`).getDay() + 6) % 7];
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
/** Ist das Supplement an diesem Tag dran? */
export const dueOn = (s: Supplement, iso: string) => s.on && (!s.days || s.days.includes(dayOf(iso)));
/** Heute fällig, mit Haken-Status */
export function today(list: Supplement[], log: TakenLog, iso: string) {
  return list.filter((s) => dueOn(s, iso)).map((s) => ({ ...s, taken: (log[iso] ?? []).includes(s.id) }));
}
/** Serie: wie viele fällige Tage in Folge genommen (heute zählt mit, wenn schon abgehakt; sonst ab gestern) */
export function streak(s: Supplement, log: TakenLog, iso: string): number {
  let n = 0, d = iso;
  if (!(log[d] ?? []).includes(s.id)) d = addDays(d, -1);
  for (let i = 0; i < 365; i++, d = addDays(d, -1)) {
    if (!dueOn(s, d)) continue;
    if ((log[d] ?? []).includes(s.id)) n++; else break;
  }
  return n;
}
export const newId = () => `s${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
