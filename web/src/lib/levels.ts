// Stufen für Muskeln und den eigenen Titel: Beginner → Fortgeschritten → Profi → Elite → Ultra.
// Farben: Weiß (untrainiert) → Gelb → Orange → Rot → Blau → Lila; innerhalb einer Stufe von hell nach dunkel.
import type { MuscleLevel } from './muscles';
import type { ISODate, MuscleId, Workout } from './types';

export interface StrengthLevel { level: number; name: string; light: string; dark: string; from: number; to: number }
/** from/to: Fortschritt seit dem ersten Training (0,05 = +5 %) – dieselben Grenzen wie LEVELS in lib/muscles.ts */
export const STRENGTH_LEVELS: StrengthLevel[] = [
  { level: 0, name: 'Untrainiert', light: '#ffffff', dark: '#ece6e1', from: -Infinity, to: -Infinity },
  { level: 1, name: 'Beginner', light: '#fff4b0', dark: '#f2c200', from: -Infinity, to: 0.05 },
  { level: 2, name: 'Fortgeschritten', light: '#ffd29e', dark: '#ef7a00', from: 0.05, to: 0.15 },
  { level: 3, name: 'Profi', light: '#ffa3a3', dark: '#d21f1f', from: 0.15, to: 0.3 },
  { level: 4, name: 'Elite', light: '#a9caff', dark: '#1d58d4', from: 0.3, to: 0.5 },
  { level: 5, name: 'Ultra', light: '#dcbcff', dark: '#6f22c4', from: 0.5, to: 1 },
];
export const levelInfo = (level: number) => STRENGTH_LEVELS[Math.max(0, Math.min(5, Math.round(level)))];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => `#${v.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')}`;
export const mixHex = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };

/** Wie weit innerhalb der Stufe (0 = gerade erreicht, 1 = kurz vor der nächsten) */
export function levelProgress(level: number, gain: number | null): number {
  const l = levelInfo(level);
  if (level <= 0 || gain === null) return 0;
  if (level === 1) return Math.max(0, Math.min(1, gain / 0.05)); // auch Rückschritte bleiben „Beginner, hell“
  return Math.max(0, Math.min(1, (gain - l.from) / (l.to - l.from)));
}
/** Füllfarbe eines Muskels: Stufenfarbe, je weiter in der Stufe, desto dunkler */
export function muscleColor(level: number, gain: number | null): string {
  const l = levelInfo(level);
  if (level <= 0) return l.light;
  return mixHex(l.light, l.dark, 0.3 + 0.7 * levelProgress(level, gain));
}

// ---- Dein Titel: wie oft + wie gut -----------------------------------------------------------
export interface TrainingTitle {
  level: number; name: string; color: string;
  /** Teilwerte 1–5 */
  often: number; good: number;
  /** Trainings pro Woche (letzte 8 Wochen) */
  perWeek: number;
  /** Was fürs nächste Level fehlt (null = Ultra erreicht) */
  next: string | null;
}
const WEEKS = 8;
/** Trainings pro Woche → Punkte 1–5 */
export const oftenScore = (perWeek: number) => (perWeek >= 4 ? 5 : perWeek >= 3 ? 4 : perWeek >= 2 ? 3 : perWeek >= 1 ? 2 : 1);

export function trainingTitle(workouts: Workout[], levels: Map<MuscleId, MuscleLevel>, today: ISODate): TrainingTitle {
  const since = new Date(Date.parse(today) - WEEKS * 7 * 86400000).toISOString().slice(0, 10);
  const recent = new Set(workouts.filter((w) => w.date > since && w.date <= today).map((w) => w.date)).size;
  const perWeek = recent / WEEKS;
  const often = oftenScore(perWeek);
  const trained = [...levels.values()].filter((l) => l.level > 0);
  // wie gut: Durchschnitt der trainierten Muskeln; wer wenige Muskeln trainiert, kommt nicht ganz nach oben
  const avg = trained.length ? trained.reduce((s, l) => s + l.level, 0) / trained.length : 1;
  const breadth = Math.min(1, trained.length / 8);
  const good = Math.max(1, Math.round(avg * (0.6 + 0.4 * breadth)));
  const level = workouts.length === 0 ? 1 : Math.max(1, Math.min(5, Math.round((often + good) / 2 - 0.01)));
  const info = levelInfo(level);
  let next: string | null = null;
  if (level < 5) {
    const target = levelInfo(level + 1).name;
    next = often <= good
      ? `Für „${target}“: öfter trainieren – Ziel ${Math.min(4, often)}+ Trainings pro Woche (gerade ${perWeek.toLocaleString('de-DE', { maximumFractionDigits: 1 })}).`
      : `Für „${target}“: stärker werden – bring mehr Muskelgruppen auf „${levelInfo(Math.min(5, good + 1)).name}“.`;
  }
  return { level, name: info.name, color: info.dark, often, good, perWeek, next };
}
