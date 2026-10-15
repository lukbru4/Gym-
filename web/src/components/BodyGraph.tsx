// Körpergraph: Anatomie-Zeichnung (hellgrauer Körper) von vorne und hinten; beanspruchte/trainierte Muskeln sind rot.
// Die Muskelflächen stammen aus einem MIT-lizenzierten Anatomie-Datensatz (siehe lib/anatomy.ts und THIRD_PARTY.md).
import { useLayoutEffect, useRef, useState } from 'react';
import { ANATOMY, type AnatomyPart } from '../lib/anatomy';
import { useCosmetics } from '../lib/cosmetics';
import { MUSCLE_NAMES, type MuscleLevel } from '../lib/muscles';
import type { MuscleId } from '../lib/types';

/** Welche Flächen der Zeichnung zu welcher unserer Muskelgruppen gehören (vorne/hinten) */
export const BODY_MAP: Record<MuscleId, { front?: string[]; back?: string[] }> = {
  brust: { front: ['chest'] },
  schultern: { front: ['deltoids'], back: ['deltoids'] },
  bizeps: { front: ['biceps'] },
  trizeps: { front: ['triceps'], back: ['triceps'] },
  bauch: { front: ['abs', 'obliques'] },
  oberer_ruecken: { front: ['trapezius'], back: ['trapezius'] },
  lat: { back: ['upper-back'] },
  unterer_ruecken: { back: ['lower-back'] },
  gesaess: { back: ['gluteal'] },
  quadrizeps: { front: ['quadriceps', 'adductors'] },
  beinbeuger: { back: ['hamstring'] },
  waden: { front: ['calves', 'tibialis'], back: ['calves'] },
};
/** Auf dem Körper nicht beschriften (Platz/Überschneidung) */
const NO_LABEL: Record<'front' | 'back', MuscleId[]> = { front: ['trizeps', 'oberer_ruecken'], back: [] };
/** Der Körper wird in der Breite leicht gestreckt: kräftigerer, muskulöserer Eindruck */
const BULK = 1.07;
const CX = { front: 362, back: 1086 };
const SHOW_LABELS = false;
const MUSCLE_ORDER = Object.keys(BODY_MAP) as MuscleId[];
const USED = (side: 'front' | 'back') => new Set(MUSCLE_ORDER.flatMap((m) => BODY_MAP[m][side] ?? []));

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
      <stop offset="0" stopColor="#d8323c" />
      <stop offset="0.5" stopColor="#a3121f" />
      <stop offset="1" stopColor="#5a0710" />
    </linearGradient>
    <linearGradient id="mus-s" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stopColor="#d98a2c" />
      <stop offset="0.55" stopColor="#a8560c" />
      <stop offset="1" stopColor="#5e2f05" />
    </linearGradient>
    {/* Muskelfasern */}
    <pattern id="fibers" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(72)">
      <line x1="0" y1="0" x2="0" y2="3.2" stroke="rgba(60,10,10,0.22)" strokeWidth="0.7" />
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
  brust: 'Brust', schultern: 'Schultern', bizeps: 'Bizeps', trizeps: 'Trizeps', bauch: 'Bauch', oberer_ruecken: 'Nacken', lat: 'Lat',
  unterer_ruecken: 'Unt. Rücken', gesaess: 'Gesäß', quadrizeps: 'Quadrizeps', beinbeuger: 'Beinbeuger', waden: 'Waden',
};
export type Focus = Map<MuscleId, 'p' | 's'>;

const PartPaths = ({ part }: { part: AnatomyPart }) => (
  <>
    {(part.c ?? []).map((d, i) => <path key={`c${i}`} d={d} className="c" />)}
    {(part.l ?? []).map((d, i) => <path key={`l${i}`} d={d} className="l" />)}
    {(part.r ?? []).map((d, i) => <path key={`r${i}`} d={d} className="r" />)}
  </>
);

interface FigureProps {
  side: 'front' | 'back';
  /** nur Umriss + hervorgehobene Muskeln zeichnen (kleine Vorschau) */
  simple?: boolean;
  levels: Map<MuscleId, MuscleLevel>;
  focus?: Focus;
  labels?: boolean;
  onSelect?: (m: MuscleId) => void;
}

function Figure({ side, simple, levels, focus, labels, onSelect }: FigureProps) {
  const ref = useRef<SVGGElement>(null);
  const [pos, setPos] = useState<Partial<Record<MuscleId, [number, number]>>>({});
  const data = ANATOMY[side];
  const muscles = MUSCLE_ORDER.filter((m) => BODY_MAP[m][side]);
  const used = USED(side);
  // Beschriftung: Mitte der linken Fläche messen; mittige Muskeln über die ganze Gruppe
  useLayoutEffect(() => {
    if (!labels || !ref.current) return;
    const next: Partial<Record<MuscleId, [number, number]>> = {};
    for (const m of muscles.filter((x) => !NO_LABEL[side].includes(x) && (!focus || focus.has(x)))) {
      const centered = ['brust', 'bauch', 'oberer_ruecken', 'unterer_ruecken', 'gesaess', 'lat'].includes(m);
      const g = ref.current.querySelector<SVGGraphicsElement>(`[data-muscle="${m}"]`);
      const el = centered ? g : g?.querySelector<SVGGraphicsElement>('path.l, path.c') ?? g;
      if (!el) continue;
      const b = el.getBBox();
      next[m] = [b.x + b.width / 2, b.y + b.height / 2];
    }
    setPos(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, side, focus]);
  return (
    <g ref={ref} data-side={side} transform={`translate(${CX[side]} 0) scale(${BULK} 1) translate(${-CX[side]} 0)`}>
      <path d={ANATOMY.outline[side]} className="body-outline" />
      {!simple && <g className="body-neutral">
        {Object.entries(data).filter(([slug]) => !used.has(slug)).map(([slug, part]) => (
          <g key={slug} data-slug={slug}><PartPaths part={part} /></g>
        ))}
      </g>}
      {muscles.filter((m) => !simple || focus?.has(m)).map((m) => {
        const r = levels.get(m) ?? { level: 0, gain: null, exercises: [] };
        const role = focus?.get(m);
        const title = focus ? `${MUSCLE_NAMES.get(m)}${role === 'p' ? ': Primärer Muskel' : role === 's' ? ': Sekundärer Muskel' : ''}` : `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
        const cls = focus ? `muscle focus-${role ?? 'off'}` : `muscle lv-${r.level}`;
        const paths = BODY_MAP[m][side]!.map((slug) => (data[slug] ? <g key={slug} data-slug={slug}><PartPaths part={data[slug]} /></g> : null));
        if (!onSelect) {
          return (
            <g key={m} className={`${cls} static`} data-muscle={m}>
              {paths}
            </g>
          );
        }
        return (
          <g key={m} className={cls} data-muscle={m} tabIndex={0} role="img" aria-label={title} onClick={() => onSelect(m)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(m)}>
            <title>{title}</title>
            {paths}
          </g>
        );
      })}
      {/* Beschriftung auf dem Körper bewusst aus: die Figur zeigt die Muskeln ohne Schrift */}
      {SHOW_LABELS && labels && (
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
export function BodyGraph({ levels = new Map(), onSelect, skin, focus, labels = false, view = 'both', simple = false, box }: { levels?: Map<MuscleId, MuscleLevel>; onSelect?: (m: MuscleId) => void; skin?: string | null; /** Übungs-/Trainingsansicht: Hauptmuskel (p) und Hilfsmuskel (s) statt Kraft-Stufen */ focus?: Focus; labels?: boolean; /** nur von vorne oder nur von hinten */ view?: 'both' | 'front' | 'back'; simple?: boolean; /** Ausschnitt (x, y, Breite, Höhe) zum Heranzoomen */ box?: [number, number, number, number] }) {
  const own = useCosmetics().equipped.skin;
  return (
    <div className="bodygraph-panel" data-skin={skin === undefined ? own : skin ?? undefined}>
      <svg
        preserveAspectRatio={box ? 'xMidYMid slice' : undefined}
        className={`bodygraph anat${view !== 'both' ? ' single' : ''}${simple ? ' mini' : ''}`}
        viewBox={box ? box.join(' ') : view === 'front' ? '0 0 724 1448' : view === 'back' ? '724 0 724 1448' : '0 0 1448 1448'}
        role="group"
        aria-label={focus ? 'Körper: beanspruchte Muskeln, links von vorne, rechts von hinten' : 'Körpergraph: Kraft-Stufe pro Muskel, links von vorne, rechts von hinten'}
      >
        <defs>
          {/* Muskelrot mit Verlauf: jede Muskelfläche wirkt gewölbt */}
          <linearGradient id="mr-strong" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#d4533d" /><stop offset="0.5" stopColor="#a52a1c" /><stop offset="1" stopColor="#6e170e" />
          </linearGradient>
          <linearGradient id="mr-l1" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#f0b0a2" /><stop offset="1" stopColor="#d98572" />
          </linearGradient>
          <linearGradient id="mr-l2" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#e58a78" /><stop offset="1" stopColor="#c0503d" />
          </linearGradient>
          <linearGradient id="mr-l3" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#d4533d" /><stop offset="1" stopColor="#a52a1c" />
          </linearGradient>
          <linearGradient id="mr-l4" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#b53a28" /><stop offset="1" stopColor="#841c10" />
          </linearGradient>
          <linearGradient id="mr-l5" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#8e2418" /><stop offset="1" stopColor="#5a0f08" />
          </linearGradient>
          <linearGradient id="mr-white" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ece6e1" />
          </linearGradient>
        </defs>
        {view !== 'back' && <Figure side="front" simple={simple} levels={levels} focus={focus} labels={labels} onSelect={onSelect} />}
        {view !== 'front' && <Figure side="back" simple={simple} levels={levels} focus={focus} labels={labels} onSelect={onSelect} />}
      </svg>
    </div>
  );
}
