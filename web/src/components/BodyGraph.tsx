// Körpergraph: Neon-Drahtgitter von vorne und hinten; trainierte Muskeln leuchten je nach Stufe.
import { useLayoutEffect, useRef, useState } from 'react';
import { BACK, BACK_LINES, BACK_NEUTRAL, EAR, FACE_FRONT, FRONT, FRONT_LINES, FRONT_NEUTRAL, HEAD_BACK, HEAD_PATH, OUTLINE } from '../lib/bodyShapes';
import { FIGURE_BOTTOM, stretchPath } from '../lib/bodyScale';
import { useCosmetics } from '../lib/cosmetics';
import { MUSCLE_NAMES, type MuscleLevel } from '../lib/muscles';
import type { MuscleId } from '../lib/types';

const MIRROR = 'matrix(-1 0 0 1 200 0)';

/** Pfad links + gespiegelt rechts */
const Both = ({ d }: { d: string }) => {
  const e = stretchPath(d); // Beine verlängert
  return (
    <>
      <path d={e} />
      <path d={e} transform={MIRROR} />
    </>
  );
};
/** Größerer Kopf: vom Hals (y ≈ 64) aus vergrößern */
const HEAD_T = 'translate(100 64) scale(1.24) translate(-100 -64)';
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
    {/* Muskelfarbe wie auf einer Anatomietafel: Verlauf von hell nach dunkel gibt den Muskeln Rundung */}
    <linearGradient id="mus-base" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" style={{ stopColor: 'var(--mus-hi)' }} />
      <stop offset="0.55" style={{ stopColor: 'var(--mus-mid)' }} />
      <stop offset="1" style={{ stopColor: 'var(--mus-lo)' }} />
    </linearGradient>
    <linearGradient id="mus-p" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stopColor="#ff8a6b" />
      <stop offset="0.5" stopColor="#f0343c" />
      <stop offset="1" stopColor="#a8101c" />
    </linearGradient>
    <linearGradient id="mus-s" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stopColor="#ffd27a" />
      <stop offset="0.55" stopColor="#f5a524" />
      <stop offset="1" stopColor="#b8701a" />
    </linearGradient>
    {/* Muskelfasern */}
    <pattern id="fibers" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
      <line x1="0" y1="0" x2="0" y2="3.2" stroke="rgba(255,255,255,0.20)" strokeWidth="0.7" />
    </pattern>
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

/** Kurznamen für die Beschriftung auf dem Körper */
const SHORT: Record<MuscleId, string> = {
  brust: 'Brust', schultern: 'Schultern', bizeps: 'Bizeps', trizeps: 'Trizeps', bauch: 'Bauch', oberer_ruecken: 'Oberer Rücken', lat: 'Lat',
  unterer_ruecken: 'Unt. Rücken', gesaess: 'Gesäß', quadrizeps: 'Quadrizeps', beinbeuger: 'Beinbeuger', waden: 'Waden',
};
export type Focus = Map<MuscleId, 'p' | 's'>;

interface FigureProps {
  parts: Partial<Record<MuscleId, string[]>>;
  neutral: string[];
  lines: string[];
  levels: Map<MuscleId, MuscleLevel>;
  focus?: Focus;
  labels?: boolean;
  offsetX: number;
  /** Gesichtslinien (vorne) bzw. Hinterkopf (hinten) */
  face: string;
  onSelect?: (m: MuscleId) => void;
}

function Figure({ parts, neutral, lines, levels, focus, labels, offsetX, face, onSelect }: FigureProps) {
  const ref = useRef<SVGGElement>(null);
  const [pos, setPos] = useState<Partial<Record<MuscleId, [number, number]>>>({});
  // Beschriftung: Mitte der linken Muskelfläche messen (die rechte ist gespiegelt)
  useLayoutEffect(() => {
    if (!labels || !ref.current) return;
    const next: Partial<Record<MuscleId, [number, number]>> = {};
    for (const m of Object.keys(parts) as MuscleId[]) {
      // mittige Muskeln (Brust, Bauch, Rücken, Gesäß) über beide Hälften, sonst die linke Fläche
      const centered = ['brust', 'bauch', 'oberer_ruecken', 'unterer_ruecken', 'gesaess'].includes(m);
      const el = ref.current.querySelector<SVGGraphicsElement>(centered ? `[data-muscle="${m}"]` : `[data-muscle="${m}"] path`);
      if (!el) continue;
      const b = el.getBBox();
      next[m] = [b.x + b.width / 2, b.y + b.height / 2];
    }
    setPos(next);
  }, [labels, parts]);
  return (
    <g transform={`translate(${offsetX} 0)`} ref={ref}>
      <g className="body-base">
        <Both d={OUTLINE} />
        <path d={HEAD_PATH} transform={HEAD_T} />
        <path d={EAR} transform={HEAD_T} />
        <path d={EAR} transform={`${HEAD_T} ${MIRROR}`} />
      </g>
      <g className="body-neutral">
        <Paths list={neutral} />
      </g>
      {(Object.entries(parts) as [MuscleId, string[]][]).map(([m, list]) => {
        const r = levels.get(m) ?? { level: 0, gain: null, exercises: [] };
        const role = focus?.get(m);
        const title = focus ? `${MUSCLE_NAMES.get(m)}${role === 'p' ? ': Hauptmuskel' : role === 's' ? ': Hilfsmuskel' : ''}` : `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
        const cls = focus ? `muscle focus-${role ?? 'off'}` : `muscle lv-${r.level}`;
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
      <g className="muscle-fibers" aria-hidden="true">
        {(Object.entries(parts) as [MuscleId, string[]][]).map(([m, list]) => (
          <g key={m}>
            <Paths list={list} />
          </g>
        ))}
        <Paths list={neutral} />
      </g>
      <g className="body-lines">
        <Paths list={lines} />
        <path d={face} className="face-lines" transform={HEAD_T} />
      </g>
      {labels && (
        <g className="muscle-labels" aria-hidden="true">
          {(Object.keys(pos) as MuscleId[]).map((m) => {
            const role = focus?.get(m);
            const lv = levels.get(m)?.level ?? 0;
            const on = focus ? Boolean(role) : lv > 0;
            return (
              <text key={m} x={pos[m]![0]} y={pos[m]![1]} textAnchor="middle" dominantBaseline="middle" className={on ? 'on' : ''}>
                {SHORT[m]}
              </text>
            );
          })}
        </g>
      )}
    </g>
  );
}

/** skin: Shop-Look; ohne Angabe der eigene ausgerüstete Look */
export function BodyGraph({ levels = new Map(), onSelect, skin, focus, labels = false }: { levels?: Map<MuscleId, MuscleLevel>; onSelect?: (m: MuscleId) => void; skin?: string | null; /** Übungs-/Trainingsansicht: Hauptmuskel (p) und Hilfsmuskel (s) statt Kraft-Stufen */ focus?: Focus; labels?: boolean }) {
  const own = useCosmetics().equipped.skin;
  return (
    <div className="bodygraph-panel" data-skin={skin === undefined ? own : skin ?? undefined}>
      <svg
        className="bodygraph"
        viewBox={`0 -6 470 ${Math.ceil(FIGURE_BOTTOM) + 10}`}
        role="group"
        aria-label={focus ? 'Körper: beanspruchte Muskeln, links von vorne, rechts von hinten' : 'Körpergraph: Kraft-Stufe pro Muskel, links von vorne, rechts von hinten'}
      >
        <GlowFilter />
        <Figure parts={FRONT} neutral={FRONT_NEUTRAL} lines={FRONT_LINES} levels={levels} focus={focus} labels={labels} offsetX={0} face={FACE_FRONT} onSelect={onSelect} />
        <Figure parts={BACK} neutral={BACK_NEUTRAL} lines={BACK_LINES} levels={levels} focus={focus} labels={labels} offsetX={270} face={HEAD_BACK} onSelect={onSelect} />
      </svg>
    </div>
  );
}

