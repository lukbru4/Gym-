// Körpergraph: Neon-Drahtgitter von vorne und hinten; trainierte Muskeln leuchten je nach Stufe.
import { BACK, BACK_LINES, BACK_NEUTRAL, FRONT, FRONT_LINES, FRONT_NEUTRAL, HEAD, OUTLINE } from '../lib/bodyShapes';
import { MUSCLE_NAMES, type MuscleLevel } from '../lib/muscles';
import type { MuscleId } from '../lib/types';

const MIRROR = 'matrix(-1 0 0 1 200 0)';

/** Pfad links + gespiegelt rechts */
const Both = ({ d }: { d: string }) => (
  <>
    <path d={d} />
    <path d={d} transform={MIRROR} />
  </>
);
const Paths = ({ list }: { list: string[] }) => (
  <>
    {list.map((d, i) => (
      <Both key={i} d={d} />
    ))}
  </>
);

export const GlowFilter = () => (
  <defs>
    <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.6" result="b" />
      <feMerge>
        <feMergeNode in="b" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

interface FigureProps {
  parts: Partial<Record<MuscleId, string[]>>;
  neutral: string[];
  lines: string[];
  levels: Map<MuscleId, MuscleLevel>;
  offsetX: number;
  onSelect?: (m: MuscleId) => void;
}

function Figure({ parts, neutral, lines, levels, offsetX, onSelect }: FigureProps) {
  return (
    <g transform={`translate(${offsetX} 0)`}>
      <g className="body-base">
        <Both d={OUTLINE} />
        <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
      </g>
      <g className="body-neutral">
        <Paths list={neutral} />
      </g>
      {(Object.entries(parts) as [MuscleId, string[]][]).map(([m, list]) => {
        const r = levels.get(m)!;
        const title = `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
        const cls = `muscle lv-${r.level}`;
        if (!onSelect) {
          return (
            <g key={m} className={`${cls} static`} data-muscle={m}>
              <Paths list={list} />
            </g>
          );
        }
        return (
          <g
            key={m}
            className={cls}
            data-muscle={m}
            tabIndex={0}
            role="img"
            aria-label={title}
            onClick={() => onSelect(m)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(m)}
          >
            <title>{title}</title>
            <Paths list={list} />
          </g>
        );
      })}
      <g className="body-lines">
        <Paths list={lines} />
      </g>
    </g>
  );
}

export function BodyGraph({ levels, onSelect }: { levels: Map<MuscleId, MuscleLevel>; onSelect?: (m: MuscleId) => void }) {
  return (
    <div className="bodygraph-panel">
      <svg
        className="bodygraph"
        viewBox="0 6 470 454"
        role="group"
        aria-label="Körpergraph: Kraft-Stufe pro Muskel, links von vorne, rechts von hinten"
      >
        <GlowFilter />
        <Figure parts={FRONT} neutral={FRONT_NEUTRAL} lines={FRONT_LINES} levels={levels} offsetX={0} onSelect={onSelect} />
        <Figure parts={BACK} neutral={BACK_NEUTRAL} lines={BACK_LINES} levels={levels} offsetX={270} onSelect={onSelect} />
      </svg>
    </div>
  );
}

