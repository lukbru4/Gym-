// Die 5 Trainingspläne (Aufteilungen) zum Auswählen – mit den Muskeln je Trainingstag für den Körpergraph.
import type { PartMarks } from '../components/AnatomyFigure';
import { KIND_NAMES, type Kind } from './plan';

export interface SplitInfo { id: string; name: string; text: string; days: string; kinds: Kind[] }
export const SPLITS: SplitInfo[] = [
  { id: 'ganz', name: 'Ganzkörper', text: 'Jedes Training der ganze Körper. Ideal für Einsteiger und wenig Zeit.', days: '2–3 Tage', kinds: ['ganz'] },
  { id: 'ob', name: 'Oberkörper / Unterkörper', text: 'Abwechselnd Oberkörper und Beine. Gut für 4 Tage.', days: '4 Tage', kinds: ['oben', 'unten'] },
  { id: 'ppl', name: 'Push / Pull / Beine', text: 'Drücken, Ziehen, Beine – der Klassiker.', days: '3 oder 6 Tage', kinds: ['push', 'pull', 'beine'] },
  { id: 'arnold', name: 'Arnold-Split', text: 'Brust & Rücken, Schultern & Arme, Beine – wie Arnold Schwarzenegger trainiert hat.', days: '3 oder 6 Tage', kinds: ['br', 'sa', 'beine'] },
  { id: 'bro', name: 'Bro-Split', text: 'Ein Muskel pro Tag: Brust, Rücken, Schultern, Arme, Beine.', days: '5 Tage', kinds: ['brust', 'ruecken', 'schulter', 'arme', 'beine'] },
];
export const kindName = (k: Kind) => KIND_NAMES[k];

// Muskeln je Trainingstag (Anatomie-Teile, vorne/hinten; 0 = Hauptmuskel, 1 = Hilfsmuskel)
const PUSH = { front: { chest: 0, deltoids: 0, triceps: 0 }, back: { triceps: 0 } } as const;
const PULL = { front: { biceps: 0, forearm: 1, trapezius: 1 }, back: { 'upper-back': 0, trapezius: 0, deltoids: 0, forearm: 1, 'lower-back': 1 } } as const;
const LEGS = { front: { quadriceps: 0, adductors: 0, calves: 1, tibialis: 1 }, back: { gluteal: 0, hamstring: 0, calves: 1, 'lower-back': 1 } } as const;
const ABS = { front: { abs: 1, obliques: 1 } } as const;
const merge = (...m: PartMarks[]): PartMarks => {
  const out: PartMarks = { front: {}, back: {} };
  for (const x of m) for (const side of ['front', 'back'] as const) for (const [k, v] of Object.entries(x[side] ?? {})) {
    const cur = out[side]![k];
    out[side]![k] = cur === undefined ? v : (Math.min(cur, v) as 0 | 1);
  }
  return out;
};
export const KIND_MARKS: Record<Kind, PartMarks> = {
  push: merge(PUSH, ABS),
  pull: PULL,
  beine: merge(LEGS, ABS),
  oben: merge(PUSH, PULL),
  unten: merge(LEGS, ABS),
  ganz: merge(PUSH, PULL, LEGS, ABS),
  br: merge({ front: { chest: 0 } }, { back: { 'upper-back': 0, trapezius: 0, 'lower-back': 1 } }, { front: { deltoids: 1, triceps: 1, biceps: 1 } }),
  sa: merge({ front: { deltoids: 0, biceps: 0, triceps: 0, forearm: 1, trapezius: 1 }, back: { deltoids: 0, triceps: 0, forearm: 1 } }, ABS),
  brust: { front: { chest: 0, deltoids: 1, triceps: 1 }, back: { triceps: 1 } },
  ruecken: { front: { biceps: 1, forearm: 1, trapezius: 1 }, back: { 'upper-back': 0, trapezius: 0, 'lower-back': 0, deltoids: 1, forearm: 1 } },
  schulter: merge({ front: { deltoids: 0, trapezius: 1, triceps: 1 }, back: { deltoids: 0, trapezius: 1, triceps: 1 } }, ABS),
  arme: merge({ front: { biceps: 0, triceps: 0, forearm: 0 }, back: { triceps: 0, forearm: 0 } }, ABS),
};
/** Trainiert dieser Tag die Beine? (dann ganze Figur zeigen, sonst nur Oberkörper) */
export const hasLegs = (k: Kind) => k === 'beine' || k === 'unten' || k === 'ganz';
