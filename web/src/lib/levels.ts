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

// ---- Dein Titel: jede Stufe hat 3 Unterstufen (Beginner 1, 2, 3 …), man steigt durchs Trainieren auf -----------
// Am Anfang geht es schnell (nach 3, 8, 15 Trainings), weiter oben dauert jede Unterstufe länger. Man fällt nie zurück.
export interface TrainingTitle {
  /** Stufe 1–5 (Beginner … Ultra), für die Farbe */
  level: number;
  /** Unterstufe 1–3 */
  step: number;
  /** z. B. „Beginner 2“ */
  name: string;
  color: string;
  /** gezählte Trainings (Tage mit Training) */
  trainings: number;
  /** Trainings pro Woche (letzte 8 Wochen) */
  perWeek: number;
  /** Fortschritt bis zur nächsten Unterstufe (0–1) */
  progress: number;
  /** Trainings bis zur nächsten Unterstufe (null = ganz oben) */
  toNext: number | null;
  /** Name der nächsten Unterstufe */
  nextName: string | null;
  /** Hinweis, was fürs nächste Level fehlt (null = Ultra 3 erreicht) */
  next: string | null;
}
/** Ab so vielen Trainings beginnt die Unterstufe (15 Einträge: 5 Stufen × 3) */
export const TITLE_STEPS = [0, 3, 8, 15, 25, 40, 60, 85, 115, 150, 200, 260, 330, 420, 520];
const WEEKS = 8;
/** Trainings pro Woche → Punkte 1–5 */
export const oftenScore = (perWeek: number) => (perWeek >= 4 ? 5 : perWeek >= 3 ? 4 : perWeek >= 2 ? 3 : perWeek >= 1 ? 2 : 1);
export const stepName = (i: number) => `${levelInfo(Math.floor(i / 3) + 1).name} ${(i % 3) + 1}`;

export function titleFromTrainings(trainings: number): Pick<TrainingTitle, 'level' | 'step' | 'name' | 'color' | 'progress' | 'toNext' | 'nextName'> {
  const i = Math.max(0, TITLE_STEPS.findLastIndex((t) => trainings >= t));
  const level = Math.floor(i / 3) + 1, step = (i % 3) + 1;
  const top = i === TITLE_STEPS.length - 1;
  const from = TITLE_STEPS[i], to = top ? from : TITLE_STEPS[i + 1];
  return {
    level, step, name: stepName(i), color: levelInfo(level).dark,
    progress: top ? 1 : (trainings - from) / (to - from), toNext: top ? null : to - trainings, nextName: top ? null : stepName(i + 1),
  };
}

export function trainingTitle(workouts: Workout[], _levels: Map<MuscleId, MuscleLevel>, today: ISODate): TrainingTitle {
  const days = new Set(workouts.filter((w) => w.date <= today).map((w) => w.date));
  const since = new Date(Date.parse(today) - WEEKS * 7 * 86400000).toISOString().slice(0, 10);
  const perWeek = [...days].filter((d) => d > since).length / WEEKS;
  const t = titleFromTrainings(days.size);
  const next = t.toNext === null ? null : `Noch ${t.toNext} ${t.toNext === 1 ? 'Training' : 'Trainings'} bis „${t.nextName}“.`;
  return { ...t, trainings: days.size, perWeek, next };
}
