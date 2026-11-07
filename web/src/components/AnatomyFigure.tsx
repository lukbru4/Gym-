// Realistische Anatomie-Figur (dieselben Muskel-Umrisse wie im Körpergraph), mit markierten Muskeln
// (z. B. Push/Pull) oder als Körperfett-Figur: je mehr Körperfett, desto breiter und weicher (Muskeln weniger sichtbar).
import { useId } from 'react';
import { ANATOMY } from '../lib/anatomy';

export type Side = 'front' | 'back';
/** Teil → 0 = Hauptmuskel, 1 = Hilfsmuskel */
export type PartMarks = Partial<Record<Side, Record<string, 0 | 1>>>;
const LEGS = new Set(['adductors', 'quadriceps', 'knees', 'tibialis', 'calves', 'ankles', 'feet', 'hamstring', 'gluteal']);
const CX: Record<Side, number> = { front: 362, back: 1086 };
type Part = { l?: string[]; r?: string[]; c?: string[] };
const paths = (p: Part) => [...(p.l ?? []), ...(p.r ?? []), ...(p.c ?? [])];

const mix = (a: string, b: string, t: number) => {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const x = h(a), y = h(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

export function AnatomyFigure({ side = 'front', marks, colors = ['#ff6a1a', '#ffc14d'], upper = false, bf, height = 260, className = '' }: {
  side?: Side; marks?: PartMarks; colors?: [string, string];
  /** nur Oberkörper (bis zur Hüfte) */
  upper?: boolean;
  /** Körperfett in % (5–45): Figur wird breiter, Muskeln verschwimmen */
  bf?: number;
  height?: number; className?: string;
}) {
  const parts = Object.entries(ANATOMY[side] as Record<string, Part>).filter(([k]) => !upper || !LEGS.has(k));
  const t = bf === undefined ? 0 : Math.min(1, Math.max(0, (bf - 6) / 38));
  const x0 = side === 'front' ? 0 : 724;
  const wide = bf !== undefined;
  const vb = upper ? `${x0 + 150} 140 424 610` : wide ? `${x0 + 22} 110 680 1280` : `${x0 + 92} 120 540 1260`;
  const [w, h] = upper ? [424, 610] : wide ? [680, 1280] : [540, 1260];
  // Körperfett: Umriss mit dickerem Rand (= mehr Masse), Muskeln gleichen sich der Hautfarbe an, Linien verblassen
  // Haut wie am Kopf: Muskeln in Hautton, Umriss etwas dunkler, Muskel-Linien als leichte Schatten
  const outlineCol = '#c48e6b', muscle = '#e6b796';
  const fill = mix(muscle, '#d9a582', Math.min(1, t * 1.3));
  const line = `rgba(120, 70, 40, ${Math.max(0.08, 0.75 - t * 0.9)})`;
  const sx = bf === undefined ? 1.04 : 0.97 + t * 0.32;
  const cx = CX[side];
  // halbe Breite der Hose (nur Rumpf/Beine, nicht die Hände)
  const hw = (118 + t * 40) * sx;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg viewBox={vb} height={height} width={(height * w) / h} className={`anat-fig ${className}`} aria-hidden="true">
      {upper && (
        <defs>
          <linearGradient id={`anat-fade-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.86" stopColor="var(--surface)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--surface)" />
          </linearGradient>
        </defs>
      )}
      <g transform={`translate(${cx} 0) scale(${sx} 1) translate(${-cx} 0)`}>
        <path d={ANATOMY.outline[side]} fill={outlineCol} stroke={outlineCol} strokeWidth={t * 70} strokeLinejoin="round" />
        {parts.map(([k, p]) => {
          const m = marks?.[side]?.[k];
          const base = k === 'hair' ? '#3b2a20' : k === 'head' || k === 'hands' || k === 'neck' ? '#e9bd9c' : fill;
          const c = m === undefined ? base : colors[m];
          return paths(p).map((d, i) => <path key={`${k}${i}`} d={d} fill={c} stroke={line} strokeWidth="1.6" data-part={m !== undefined ? k : undefined} />);
        })}
        {/* Bauch bei mehr Körperfett */}
        {bf !== undefined && side === 'front' && t > 0.15 && (
          <>
            <ellipse cx={cx} cy={600} rx={50 + t * 95} ry={60 + t * 70} fill={fill} opacity={Math.min(1, (t - 0.15) * 2)} />
            <ellipse cx={cx} cy={455} rx={60 + t * 60} ry={30 + t * 25} fill={fill} opacity={Math.min(0.85, (t - 0.3) * 1.5)} />
          </>
        )}
      </g>
      {!upper && !marks && (
        <>
          <defs><clipPath id={`anat-body-${side}-${uid}`}><path d={ANATOMY.outline[side]} transform={`translate(${cx} 0) scale(${sx} 1) translate(${-cx} 0)`} stroke="#000" strokeWidth={t * 70} /></clipPath></defs>
          <g clipPath={`url(#anat-body-${side}-${uid})`}>
            <rect x={cx - hw} y={side === 'front' ? 668 : 640} width={hw * 2} height={side === 'front' ? 150 : 175} fill="#24272d" />
            <rect x={cx - hw} y={side === 'front' ? 668 : 640} width={hw * 2} height={10} fill="#ff6a1a" />
          </g>
        </>
      )}
      {upper && <rect x={x0} y={140} width={724} height={610} fill={`url(#anat-fade-${side})`} />}
    </svg>
  );
}
