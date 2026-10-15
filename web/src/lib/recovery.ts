// Erholungsabfrage vor dem Training: Schlaf, Energie, Muskelkater → Tagesform.
// Bei schlechter Tagesform wird heute leichter trainiert (ein Satz weniger, etwa 10 % weniger Gewicht).
import { stepFor, type Suggestion } from './progression';

/** 0 = schlecht, 1 = mittel, 2 = gut (bei Muskelkater: 2 = keiner, 1 = leicht, 0 = stark) */
export type Score = 0 | 1 | 2;
export interface Recovery { sleep: Score; energy: Score; soreness: Score }
export type Readiness = 'low' | 'normal' | 'high';

export const RECOVERY_QUESTIONS: { id: keyof Recovery; q: string; options: [Score, string][] }[] = [
  { id: 'sleep', q: 'Wie hast du geschlafen?', options: [[0, 'Schlecht'], [1, 'Okay'], [2, 'Gut']] },
  { id: 'energy', q: 'Wie fit fühlst du dich?', options: [[0, 'Müde'], [1, 'Normal'], [2, 'Voller Energie']] },
  { id: 'soreness', q: 'Muskelkater?', options: [[0, 'Stark'], [1, 'Leicht'], [2, 'Keiner']] },
];

/** Tagesform aus den drei Antworten (0–6 Punkte); starker Muskelkater oder sehr wenig Schlaf zählt immer als „niedrig“ bei schwacher Gesamtform */
export function readiness(r: Recovery): Readiness {
  const pts = r.sleep + r.energy + r.soreness;
  if (pts <= 2 || (pts === 3 && (r.sleep === 0 || r.soreness === 0))) return 'low';
  if (pts >= 5) return 'high';
  return 'normal';
}

export const READINESS_TEXT: Record<Readiness, { title: string; text: string }> = {
  low: { title: 'Heute leichter', text: 'Ein Satz weniger je Übung und etwa 10 % weniger Gewicht. Saubere Technik, kein Satz bis zum Versagen.' },
  normal: { title: 'Normal trainieren', text: 'Trainiere wie geplant und achte auf saubere Wiederholungen.' },
  high: { title: 'Gute Tagesform', text: 'Trainiere wie geplant – wenn es sich leicht anfühlt, schaff eine Wiederholung mehr.' },
};

const roundTo = (kg: number, step: number) => Math.round(kg / step) * step;
const de = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Gewichtsvorschlag bei niedriger Tagesform: etwa 10 % unter dem letzten Arbeitsgewicht */
export function recoveryAdjust(s: Suggestion): Suggestion {
  const step = stepFor(s.top);
  const weight = Math.max(step, roundTo(Math.min(s.weight, s.top) * 0.9, step < 2.5 ? 1 : 2.5));
  return { ...s, action: 'down', weight, repsFrom: Math.max(3, s.hi - 3), repsTo: s.hi, feedback: undefined, why: `Heute weniger erholt: etwa 10 % unter deinem letzten Gewicht (${de(s.top)} kg), saubere Technik.` };
}

/** Arbeitssätze bei niedriger Tagesform: einer weniger, mindestens zwei */
export const recoverySetCount = (n: number) => (n <= 2 ? n : n - 1);

// ---- Verlauf (gerätelokal) ----
const key = (uid: string) => `gym-tracker-recovery-${uid}`;
export function saveRecovery(uid: string, date: string, r: Recovery) {
  try {
    const all = JSON.parse(localStorage.getItem(key(uid)) ?? '{}') as Record<string, Recovery & { readiness: Readiness }>;
    all[date] = { ...r, readiness: readiness(r) };
    localStorage.setItem(key(uid), JSON.stringify(all));
  } catch {
    /* ignorieren */
  }
}
