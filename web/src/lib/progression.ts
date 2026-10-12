// Gewichtsvorschlag für das nächste Training („Doppelte Progression“):
// Schaffst du bei allen Arbeitssätzen die obere Wiederholungszahl, steigt das Gewicht; sonst bleibt es und du versuchst eine Wiederholung mehr.
import type { Feedback } from './feedback';

export interface PrevSet { weight_kg?: number | string | null; reps?: number | string | null; is_warmup?: boolean }

export interface Suggestion {
  action: 'up' | 'same' | 'down';
  weight: number;
  repsFrom: number;
  repsTo: number;
  /** Ziel-Wiederholungen (obere Grenze) */
  hi: number;
  /** Kurzer Satz zur Begründung */
  why: string;
  /** Was beim letzten Mal war, z. B. „60 kg × 10, 10, 9“ */
  last: string;
  /** Höchstes Arbeitsgewicht beim letzten Mal */
  top: number;
  /** Rückmeldung vom letzten Training, falls sie den Vorschlag verändert hat */
  feedback?: Feedback;
}

/** Schrittweite je nach Gewicht (kleine Hanteln 1 kg, Stange und Maschinen 2,5 bzw. 5 kg) */
export const stepFor = (kg: number) => (kg < 20 ? 1 : kg < 100 ? 2.5 : 5);
const roundTo = (kg: number, step: number) => Math.round(kg / step) * step;
const de = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** `targetReps`: obere Wiederholungszahl laut Plan/Vorlage (falls bekannt) */
export function suggestProgress(prev: PrevSet[] | undefined, targetReps?: number | null, feedback?: Feedback | null): Suggestion | null {
  const base = baseSuggestion(prev, targetReps);
  return base && feedback ? withFeedback(base, feedback) : base;
}

/** Rückmeldung „zu leicht“ → größerer Schritt, „zu schwer“ → einen Schritt weniger */
function withFeedback(s: Suggestion, fb: Feedback): Suggestion {
  if (fb === 'ok') return s;
  const step = stepFor(s.weight);
  const r = step < 2.5 ? 1 : 2.5;
  if (fb === 'easy') {
    if (s.action === 'down') return { ...s, action: 'same', weight: Math.round((s.weight + step) / r) * r, feedback: fb, why: 'Du fandest es zu leicht – wir bleiben beim letzten Gewicht.' };
    const weight = s.action === 'up' ? s.weight + step : Math.round((s.weight + step) / r) * r;
    return { ...s, action: 'up', weight, feedback: fb, why: s.action === 'up' ? 'Du fandest es zu leicht und hast alles geschafft – diesmal ein größerer Schritt.' : 'Du fandest es zu leicht – deshalb gibt es mehr Gewicht.' };
  }
  if (s.action === 'down') return { ...s, feedback: fb, why: 'Du fandest es zu schwer und die Wiederholungen waren niedrig – etwas weniger Gewicht, saubere Technik.' };
  if (s.action === 'up') return { ...s, action: 'same', weight: Math.max(step, s.weight - step), feedback: fb, why: 'Du fandest es zu schwer – wir bleiben beim letzten Gewicht und halten die Wiederholungen.' };
  return { ...s, action: 'down', weight: Math.max(step, Math.round((s.weight - step) / r) * r), feedback: fb, why: 'Du fandest es zu schwer – etwas weniger Gewicht, saubere Technik.' };
}

function baseSuggestion(prev: PrevSet[] | undefined, targetReps?: number | null): Suggestion | null {
  const work = (prev ?? []).map((s) => ({ ...s, w: Number(s.weight_kg), r: Number(s.reps) })).filter((s) => !s.is_warmup && s.w > 0 && s.r > 0);
  if (!work.length) return null;
  const top = Math.max(...work.map((s) => s.w));
  const atTop = work.filter((s) => s.w === top);
  const reps = atTop.map((s) => s.r);
  const maxReps = Math.max(...reps);
  const hi = targetReps && targetReps > 0 ? targetReps : maxReps >= 13 ? 15 : maxReps >= 10 ? 12 : maxReps >= 7 ? 10 : maxReps >= 5 ? 8 : 5;
  const lo = hi >= 8 ? Math.max(5, hi - 4) : Math.max(3, hi - 2);
  const step = stepFor(top);
  const last = `${de(top)} kg × ${reps.join(', ')}`;
  if (Math.min(...reps) >= hi) {
    return { top, action: 'up', weight: roundTo(top + step, step < 2.5 ? 1 : 2.5), repsFrom: lo, repsTo: Math.min(hi, lo + 2), hi, last, why: `Du hast letztes Mal überall mindestens ${hi} Wiederholungen geschafft – Zeit für mehr Gewicht.` };
  }
  if (Math.min(...reps) < lo - 1) {
    return { top, action: 'down', weight: Math.max(step, roundTo(top - step, step < 2.5 ? 1 : 2.5)), repsFrom: lo, repsTo: hi, hi, last, why: 'Letztes Mal waren die Wiederholungen zu niedrig – etwas weniger Gewicht, saubere Technik.' };
  }
  const from = Math.min(hi, Math.min(...reps) + 1);
  return { top, action: 'same', weight: top, repsFrom: from, repsTo: hi, hi, last, why: `Gleiches Gewicht, versuche ${from === hi ? hi : `${from}–${hi}`} Wiederholungen – bei ${hi} in allen Sätzen geht es hoch.` };
}

export const suggestionText = (s: Suggestion) =>
  `${de(s.weight)} kg × ${s.repsFrom === s.repsTo ? s.repsTo : `${s.repsFrom}–${s.repsTo}`}`;
