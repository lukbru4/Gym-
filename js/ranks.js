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

// Abzeichen im Neon-Stil: leuchtendes Schild in der Stufenfarbe, darin die Unterstufe (III, II, I).
// Ab Platin kommt ein zweiter äußerer Rahmen dazu.
export function badgeSvg(rank, size = 72) {
  const c = rank.tier.color;
  const tierIndex = TIERS.indexOf(rank.tier);
  const outer = tierIndex >= 3
    ? `<path d="M50 1 L93 15 V48 C93 76 74 92 50 99 C26 92 7 76 7 48 V15 Z" fill="none" stroke="${c}" stroke-width="1.6" opacity="0.7"/>`
    : '';
  return `<svg class="rank-badge" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Rang ${rank.label}"
    style="overflow:visible;filter:drop-shadow(0 0 4px ${c})">
    ${outer}
    <path d="M50 8 L86 19 V48 C86 71 70 85 50 92 C30 85 14 71 14 48 V19 Z" fill="#0b0d10" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M50 18 L77 26 V48 C77 65 65 76 50 82 C35 76 23 65 23 48 V26 Z" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.45"/>
    <text x="50" y="${rank.division === 'III' ? 61 : 62}" text-anchor="middle" font-size="${rank.division === 'III' ? 25 : 29}" font-weight="900"
      font-family="system-ui, sans-serif" fill="${c}">${rank.division}</text>
  </svg>`;
}
