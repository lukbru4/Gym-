// Körpermaße (Umfänge in cm, Körperfett in %): Felder, Prüfung und Verlauf.
import type { ISODate } from './types';

export type MeasureKey = 'chest' | 'waist' | 'hips' | 'arm' | 'thigh' | 'calf' | 'neck' | 'bodyfat';
export interface MeasureDef { key: MeasureKey; name: string; unit: 'cm' | '%'; min: number; max: number; /** weniger ist besser (Taille, Körperfett) */ lessIsBetter?: boolean; how: string }
export const MEASURES: MeasureDef[] = [
  { key: 'chest', name: 'Brust', unit: 'cm', min: 10, max: 300, how: 'Auf Höhe der Brustwarzen, Arme locker, normal ausatmen.' },
  { key: 'waist', name: 'Taille', unit: 'cm', min: 10, max: 300, lessIsBetter: true, how: 'Auf Bauchnabelhöhe, morgens, Bauch nicht einziehen.' },
  { key: 'hips', name: 'Hüfte', unit: 'cm', min: 10, max: 300, how: 'An der breitesten Stelle des Gesäßes.' },
  { key: 'arm', name: 'Oberarm', unit: 'cm', min: 10, max: 300, how: 'Dickste Stelle, Arm angespannt (immer gleich messen).' },
  { key: 'thigh', name: 'Oberschenkel', unit: 'cm', min: 10, max: 300, how: 'Dickste Stelle, stehend, Gewicht auf beiden Beinen.' },
  { key: 'calf', name: 'Wade', unit: 'cm', min: 10, max: 300, how: 'Dickste Stelle, stehend.' },
  { key: 'neck', name: 'Nacken', unit: 'cm', min: 10, max: 300, how: 'Unterhalb des Kehlkopfs.' },
  { key: 'bodyfat', name: 'Körperfett', unit: '%', min: 2, max: 70, lessIsBetter: true, how: 'Von Waage oder Zange – immer mit demselben Gerät.' },
];
export const MEASURE_BY_KEY = new Map(MEASURES.map((m) => [m.key, m]));

export type MeasureValues = Partial<Record<MeasureKey, number | null>>;
export interface Measure extends MeasureValues { id: number; date: ISODate }

/** Werte prüfen: nur bekannte Felder, Zahl im erlaubten Bereich, auf 0,1 gerundet; leer → weggelassen */
export function cleanMeasure(raw: Record<string, unknown>): MeasureValues {
  const out: MeasureValues = {};
  for (const m of MEASURES) {
    const v = raw[m.key];
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(',', '.')) : NaN;
    if (Number.isFinite(n) && n >= m.min && n <= m.max) out[m.key] = Math.round(n * 10) / 10;
  }
  return out;
}
export const hasValues = (v: MeasureValues) => Object.values(v).some((x) => typeof x === 'number');

export interface Trend { first: { date: ISODate; value: number }; last: { date: ISODate; value: number }; change: number; good: boolean | null; points: { date: ISODate; value: number }[] }
/** Verlauf eines Maßes: erste und letzte Messung, Änderung, ob die Richtung gut ist */
export function measureTrend(list: Measure[], key: MeasureKey): Trend | null {
  const points = list.filter((m) => typeof m[key] === 'number').map((m) => ({ date: m.date, value: m[key] as number })).sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) return null;
  const first = points[0], last = points[points.length - 1];
  const change = Math.round((last.value - first.value) * 10) / 10;
  const less = MEASURE_BY_KEY.get(key)?.lessIsBetter;
  return { first, last, change, good: change === 0 ? null : less ? change < 0 : change > 0, points };
}
/** Letzter bekannter Wert je Maß (als Platzhalter im Formular) */
export function latestValues(list: Measure[]): MeasureValues {
  const out: MeasureValues = {};
  for (const m of [...list].sort((a, b) => a.date.localeCompare(b.date))) for (const d of MEASURES) if (typeof m[d.key] === 'number') out[d.key] = m[d.key];
  return out;
}
/** Kurzer Text für die Aktivitäten: „Taille 82 cm, Oberarm 38 cm“ */
export const measureSummary = (m: MeasureValues) => MEASURES.filter((d) => typeof m[d.key] === 'number').slice(0, 3)
  .map((d) => `${d.name} ${String(m[d.key]).replace('.', ',')} ${d.unit}`).join(', ');

export type Pose = 'front' | 'side' | 'back' | 'other';
export const POSES: { id: Pose; name: string }[] = [{ id: 'front', name: 'Vorne' }, { id: 'side', name: 'Seitlich' }, { id: 'back', name: 'Hinten' }, { id: 'other', name: 'Sonstiges' }];
export const poseName = (p: string) => POSES.find((x) => x.id === p)?.name ?? 'Sonstiges';
export interface ProgressPhoto { id: string; date: ISODate; pose: Pose; shared: boolean }
export const MAX_PHOTOS = 300;

// ---- Vorher/Nachher: nur gleiche Pose, mindestens einen Tag auseinander --------------------------
/** Posen, für die es Fotos an mindestens zwei verschiedenen Tagen gibt (neueste Pose zuerst) */
export function comparablePoses(list: ProgressPhoto[]): Pose[] {
  const days = new Map<Pose, Set<string>>();
  for (const p of list) days.set(p.pose, (days.get(p.pose) ?? new Set()).add(p.date));
  const latest = (pose: Pose) => [...list].filter((p) => p.pose === pose).map((p) => p.date).sort().pop() ?? '';
  return [...days.entries()].filter(([, d]) => d.size >= 2).map(([pose]) => pose).sort((a, b) => latest(b).localeCompare(latest(a)));
}
/** Standard-Paar einer Pose: erstes und neuestes Foto (verschiedene Tage) */
export function defaultPair(list: ProgressPhoto[], pose: Pose): [string, string] | null {
  const ps = list.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date));
  if (ps.length < 2 || ps[0].date === ps[ps.length - 1].date) return null;
  return [ps[0].id, ps[ps.length - 1].id];
}
