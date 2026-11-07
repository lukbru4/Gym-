// Abzeichen im Neon-Stil: leuchtendes Schild in der Stufenfarbe, darin die Unterstufe (III, II, I).
// Ab Platin kommt ein zweiter äußerer Rahmen dazu.
import { TIERS, type Rank } from '../lib/ranks';

export function RankBadge({ rank, size = 72 }: { rank: Rank; size?: number }) {
  const c = rank.tier.color;
  const tierIndex = TIERS.indexOf(rank.tier);
  const small = rank.division === 'III';
  return (
    <svg
      className="rank-badge"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Rang ${rank.label}`}
      style={{ overflow: 'visible', filter: `drop-shadow(0 0 4px ${c})` }}
    >
      {tierIndex >= 3 && (
        <path d="M50 1 L93 15 V48 C93 76 74 92 50 99 C26 92 7 76 7 48 V15 Z" fill="none" stroke={c} strokeWidth="1.6" opacity="0.7" />
      )}
      <path d="M50 8 L86 19 V48 C86 71 70 85 50 92 C30 85 14 71 14 48 V19 Z" fill="#0b0d10" stroke={c} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 18 L77 26 V48 C77 65 65 76 50 82 C35 76 23 65 23 48 V26 Z" fill="none" stroke={c} strokeWidth="1.2" opacity="0.45" />
      <text x="50" y={small ? 61 : 62} textAnchor="middle" fontSize={small ? 25 : 29} fontWeight="900" fontFamily="system-ui, sans-serif" fill={c}>
        {rank.division}
      </text>
    </svg>
  );
}
