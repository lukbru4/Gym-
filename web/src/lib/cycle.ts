// Wochen-Zyklus („Mesozyklus“): einige Aufbauwochen, dann eine Entlastungswoche mit leichterem Training; danach beginnt der nächste Zyklus.
// Der Start wird in den Plan-Antworten gespeichert (cycleStart/cycleWeeks) und mit dem Konto synchronisiert.
import { loadQuiz, saveQuiz, type Answers } from './plan';
import { stepFor, type Suggestion } from './progression';
import { todayISO } from './stats';

export interface CycleInfo {
  /** Woche im Zyklus (1 …) */
  week: number;
  /** Wochen pro Zyklus */
  total: number;
  /** Wievielter Zyklus (1 …) */
  cycleNo: number;
  /** Letzte Woche des Zyklus = Entlastung */
  deload: boolean;
}

/** Zykluslänge nach Trainingserfahrung: Anfänger vertragen weniger Aufbauwochen am Stück */
export const cycleLength = (exp?: string | string[]): number => (exp === 'mittel' ? 5 : exp === 'profi' ? 6 : 4);

const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

export function cycleInfo(startISO: string, today: string, weeks: number): CycleInfo {
  const total = Math.max(2, Math.round(weeks));
  const idx = Math.max(0, Math.floor((dayNum(today) - dayNum(startISO)) / 7));
  const week = (idx % total) + 1;
  return { week, total, cycleNo: Math.floor(idx / total) + 1, deload: week === total };
}

/** Antworten mit neuem Zyklus-Start (heute) */
export const withNewCycle = (a: Answers, today = todayISO()): Answers => ({ ...a, cycleStart: today, cycleWeeks: String(cycleLength(a.exp)) });

/** Zyklus für ein Datum; null, wenn es keinen Plan oder noch keinen Zyklus gibt */
export function getCycle(today = todayISO()): CycleInfo | null {
  const a = loadQuiz()?.answers;
  const start = a?.cycleStart;
  if (typeof start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const weeks = Number(a?.cycleWeeks) || cycleLength(a?.exp);
  return cycleInfo(start, today, weeks);
}

/** Gibt es einen Plan, aber noch keinen Zyklus (älterer Plan)? */
export const hasPlanWithoutCycle = (): boolean => {
  const q = loadQuiz();
  return Boolean(q?.plan?.week.length) && typeof q?.answers.cycleStart !== 'string';
};

export function startCycle(today = todayISO()) {
  const q = loadQuiz();
  if (!q) return;
  saveQuiz({ ...q, answers: withNewCycle(q.answers, today), savedAt: new Date().toISOString() });
}

const roundTo = (kg: number, step: number) => Math.round(kg / step) * step;
const de = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Entlastungswoche: etwa 10 % weniger als das letzte Arbeitsgewicht, Wiederholungen im oberen Bereich */
export function deloadAdjust(s: Suggestion): Suggestion {
  const step = stepFor(s.top);
  const weight = Math.max(step, roundTo(s.top * 0.9, step < 2.5 ? 1 : 2.5));
  return {
    ...s,
    action: 'down',
    weight,
    repsFrom: Math.max(3, s.hi - 2),
    repsTo: s.hi,
    feedback: undefined,
    why: `Entlastungswoche: etwa 10 % weniger als zuletzt (${de(s.top)} kg), saubere Technik und gute Erholung.`,
  };
}

/** Arbeitssätze in der Entlastungswoche: einer weniger, mindestens zwei (bei weniger bleibt es) */
export const deloadSetCount = (n: number) => (n <= 2 ? n : n - 1);
