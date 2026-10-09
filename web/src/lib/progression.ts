// Gewichtsvorschlag für das nächste Training („Doppelte Progression“):
// Schaffst du bei allen Arbeitssätzen die obere Wiederholungszahl, steigt das Gewicht; sonst bleibt es und du versuchst eine Wiederholung mehr.
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
}

/** Schrittweite je nach Gewicht (kleine Hanteln 1 kg, Stange und Maschinen 2,5 bzw. 5 kg) */
export const stepFor = (kg: number) => (kg < 20 ? 1 : kg < 100 ? 2.5 : 5);
const roundTo = (kg: number, step: number) => Math.round(kg / step) * step;
const de = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** `targetReps`: obere Wiederholungszahl laut Plan/Vorlage (falls bekannt) */
export function suggestProgress(prev: PrevSet[] | undefined, targetReps?: number | null): Suggestion | null {
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
    return { action: 'up', weight: roundTo(top + step, step < 2.5 ? 1 : 2.5), repsFrom: lo, repsTo: Math.min(hi, lo + 2), hi, last, why: `Du hast letztes Mal überall mindestens ${hi} Wiederholungen geschafft – Zeit für mehr Gewicht.` };
  }
  if (Math.min(...reps) < lo - 1) {
    return { action: 'down', weight: Math.max(step, roundTo(top - step, step < 2.5 ? 1 : 2.5)), repsFrom: lo, repsTo: hi, hi, last, why: 'Letztes Mal waren die Wiederholungen zu niedrig – etwas weniger Gewicht, saubere Technik.' };
  }
  const from = Math.min(hi, Math.min(...reps) + 1);
  return { action: 'same', weight: top, repsFrom: from, repsTo: hi, hi, last, why: `Gleiches Gewicht, versuche ${from === hi ? hi : `${from}–${hi}`} Wiederholungen – bei ${hi} in allen Sätzen geht es hoch.` };
}

export const suggestionText = (s: Suggestion) =>
  `${de(s.weight)} kg × ${s.repsFrom === s.repsTo ? s.repsTo : `${s.repsFrom}–${s.repsTo}`}`;
