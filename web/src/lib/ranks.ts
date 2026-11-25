// Ränge pro Übung: Bronze → Titan, jeweils III (unten) bis I (oben).
// Rang-Punkte (RP) = Übungs-XP aus xp.ts: pro Training 10, Steigerung +10, Rekord +15.
// Der Rang zeigt also den eigenen Fortschritt (Training, Steigerungen, Rekorde) –
// keinen Vergleich mit Kraftnormen anderer Leute.

export interface Tier { id: string; name: string; from: number; division: number; color: string }

export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze', from: 0, division: 50, color: '#c8834a' },
  { id: 'silber', name: 'Silber', from: 150, division: 80, color: '#aab4c3' },
  { id: 'gold', name: 'Gold', from: 390, division: 120, color: '#f2c14e' },
  { id: 'platin', name: 'Platin', from: 750, division: 150, color: '#3fd0b6' },
  { id: 'diamant', name: 'Diamant', from: 1200, division: 200, color: '#8f86ff' },
  { id: 'titan', name: 'Titan', from: 1800, division: 300, color: '#ff4d5a' },
];
const ROMAN = ['III', 'II', 'I'] as const;
export type Division = (typeof ROMAN)[number];

export interface Rank {
  tier: Tier;
  division: Division;
  label: string;
  lp: number;
  needed: number;
  progress: number;
  max: boolean;
  points: number;
}

export function rankFromPoints(points: number | null | undefined): Rank {
  const rp = Math.max(0, Math.floor(points || 0));
  const i = TIERS.findLastIndex((t) => rp >= t.from);
  const tier = TIERS[i];
  const step = Math.min(2, Math.floor((rp - tier.from) / tier.division));
  const start = tier.from + step * tier.division;
  const top = i === TIERS.length - 1 && step === 2; // Titan I: nach oben offen
  const needed = tier.division;
  const lp = rp - start;
  return {
    tier,
    division: ROMAN[step],
    label: `${tier.name} ${ROMAN[step]}`,
    lp,
    needed,
    progress: top ? 1 : Math.min(1, lp / needed),
    max: top,
    points: rp,
  };
}

/**
 * Gesamt-Rang: Durchschnitt der 5 besten Übungen (so zählt Breite, aber einzelne
 * selten trainierte Übungen ziehen nicht nach unten).
 */
export function overallPoints(exercisePoints: number[]): number {
  const top = [...exercisePoints].sort((a, b) => b - a).slice(0, 5);
  return top.length ? Math.round(top.reduce((s, x) => s + x, 0) / top.length) : 0;
}
