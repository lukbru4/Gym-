// Ränge pro Übung: Bronze → Titan, jeweils III (unten) bis I (oben).
// Rang-Punkte (RP) = Übungs-XP aus js/xp.js: pro Training 10, Steigerung +10, Rekord +15.
// Der Rang zeigt also den eigenen Fortschritt (Training, Steigerungen, Rekorde) –
// keinen Vergleich mit Kraftnormen anderer Leute.

export const TIERS = [
  { id: 'bronze', name: 'Bronze', from: 0, division: 50, color: '#c8834a' },
  { id: 'silber', name: 'Silber', from: 150, division: 80, color: '#aab4c3' },
  { id: 'gold', name: 'Gold', from: 390, division: 120, color: '#f2c14e' },
  { id: 'platin', name: 'Platin', from: 750, division: 150, color: '#3fd0b6' },
  { id: 'diamant', name: 'Diamant', from: 1200, division: 200, color: '#8f86ff' },
  { id: 'titan', name: 'Titan', from: 1800, division: 300, color: '#ff4d5a' },
];
const ROMAN = ['III', 'II', 'I'];

// → { tier, division: 'III'|'II'|'I', label, lp, needed, next }
export function rankFromPoints(points) {
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

// Gesamt-Rang: Durchschnitt der 5 besten Übungen (so zählt Breite, aber einzelne
// selten trainierte Übungen ziehen nicht nach unten).
export function overallPoints(exercisePoints) {
  const top = [...exercisePoints].sort((a, b) => b - a).slice(0, 5);
  return top.length ? Math.round(top.reduce((s, x) => s + x, 0) / top.length) : 0;
}

// Eigenes Abzeichen: Sechseck in der Stufenfarbe, Stern, ab Platin Flügel,
// Anzahl der Punkte unten = Unterstufe (III = 1, II = 2, I = 3).
export function badgeSvg(rank, size = 72) {
  const c = rank.tier.color;
  const tierIndex = TIERS.indexOf(rank.tier);
  const n = ['III', 'II', 'I'].indexOf(rank.division) + 1; // Punkte unten: III = 1, II = 2, I = 3
  const wings = tierIndex >= 3
    ? `<path d="M22 44 C8 40 3 30 4 20 C10 28 16 31 24 32 Z M78 44 C92 40 97 30 96 20 C90 28 84 31 76 32 Z" fill="${c}" opacity="0.75"/>`
    : '';
  const dots = Array.from({ length: n }, (_, i) => `<circle cx="${50 + (i - (n - 1) / 2) * 9}" cy="93" r="3" fill="${c}"/>`).join('');
  return `<svg class="rank-badge" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Rang ${rank.label}">
    ${wings}
    <path d="M50 8 L84 27 L84 65 L50 84 L16 65 L16 27 Z" fill="${c}"/>
    <path d="M50 17 L76 32 L76 60 L50 75 L24 60 L24 32 Z" fill="#ffffff" opacity="0.28"/>
    <path d="M50 30 L55.9 42.1 L69 43.9 L59.5 53.1 L61.8 66.2 L50 60 L38.2 66.2 L40.5 53.1 L31 43.9 L44.1 42.1 Z" fill="#ffffff" opacity="0.95"/>
    ${dots}
  </svg>`;
}
