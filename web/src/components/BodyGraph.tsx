// Körpergraph: Neon-Drahtgitter von vorne und hinten; trainierte Muskeln leuchten je nach Stufe.
import { BACK, BACK_LINES, BACK_NEUTRAL, EAR, FACE_FRONT, FRONT, FRONT_LINES, FRONT_NEUTRAL, HEAD_BACK, HEAD_PATH, OUTLINE } from '../lib/bodyShapes';
import { useCosmetics } from '../lib/cosmetics';
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
    <linearGradient id="body-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--neon) 24%, var(--neon-bg))' }} />
      <stop offset="1" style={{ stopColor: 'var(--neon-bg)' }} />
    </linearGradient>
    {/* Plastische Wirkung: weiches Licht von links oben macht aus den flachen Flächen gewölbte Muskeln */}
    <filter id="vol" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="bump" />
      <feSpecularLighting in="bump" surfaceScale="4" specularConstant="0.6" specularExponent="14" lightingColor="#f3e9e9" result="spec">
        <feDistantLight azimuth="235" elevation="52" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="lit" />
      <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1="0" k2="1" k3="0.42" k4="0" />
    </filter>
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
  /** Gesichtslinien (vorne) bzw. Hinterkopf (hinten) */
  face: string;
  onSelect?: (m: MuscleId) => void;
}

function Figure({ parts, neutral, lines, levels, offsetX, face, onSelect }: FigureProps) {
  return (
    <g transform={`translate(${offsetX} 0)`}>
      <g className="body-base">
        <Both d={OUTLINE} />
        <path d={HEAD_PATH} />
        <path d={EAR} />
        <path d={EAR} transform={MIRROR} />
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
        <path d={face} className="face-lines" />
      </g>
    </g>
  );
}

/** skin: Shop-Look; ohne Angabe der eigene ausgerüstete Look */
export function BodyGraph({ levels, onSelect, skin }: { levels: Map<MuscleId, MuscleLevel>; onSelect?: (m: MuscleId) => void; skin?: string | null }) {
  const own = useCosmetics().equipped.skin;
  return (
    <div className="bodygraph-panel" data-skin={skin === undefined ? own : skin ?? undefined}>
      <svg
        className="bodygraph"
        viewBox="0 6 470 454"
        role="group"
        aria-label="Körpergraph: Kraft-Stufe pro Muskel, links von vorne, rechts von hinten"
      >
        <GlowFilter />
        <Figure parts={FRONT} neutral={FRONT_NEUTRAL} lines={FRONT_LINES} levels={levels} offsetX={0} face={FACE_FRONT} onSelect={onSelect} />
        <Figure parts={BACK} neutral={BACK_NEUTRAL} lines={BACK_LINES} levels={levels} offsetX={270} face={HEAD_BACK} onSelect={onSelect} />
      </svg>
    </div>
  );
}

