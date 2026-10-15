// Gezeichnetes Trainingsgerät ohne Figur (aus den Übungs-Animationen), gezeichnet, sobald es sichtbar ist.
import { useEffect, useMemo, useRef } from 'react';
import { PATTERNS } from '../lib/animations';
import { drawScene, propBounds } from '../lib/drawFigure';
import { project, type V3 } from '../lib/rig';
import type { KitTheme } from '../lib/gymKit';
import { readColors } from './ExerciseAnim';

/** Blickwinkel je Ansicht (0 vorne, 1 links, 2 hinten, 3 rechts) – leicht schräg, damit man die Tiefe sieht */
export const FRONT_AZ = 30;
export const viewAzimuth = (view: number) => FRONT_AZ + [0, -90, 180, 90][view & 3];
const ELEV = 16, DIST = 14;

/** Gerät auf einer Fläche: Ausschnitt (in Pixeln bei Maßstab 1 px/m) und Kamera */
function layout(pattern: string, view: number) {
  const p = PATTERNS[pattern] ?? PATTERNS.bench;
  const { min, max } = propBounds(p);
  const target: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const cam = { azimuth: viewAzimuth(view), elevation: ELEV, distance: DIST, target, focal: DIST };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const q = project([x, y, z], cam, 0, 0);
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  return { p, cam, x0, x1, y0, y1, height: max[1] - min[1] };
}
/** Echte Höhe eines Geräts in Metern */
export const machineHeight = (pattern: string) => layout(pattern, 0).height;
/** Sichtbare Breite eines Geräts in Metern (je nach Ansicht) */
export const machineWidth = (pattern: string, view = 0) => { const L = layout(pattern, view); return L.x1 - L.x0; };

/**
 * Gezeichnetes Gerät ohne Figur.
 * - mit pxPerM: maßstabsgetreu (alle Geräte im selben Maßstab, Größe ergibt sich aus dem Gerät)
 * - ohne: füllt die Fläche (height) möglichst gut aus
 */
export function MachineArt({ pattern, height = 120, className = '', view = 0, pxPerM, theme = 'modern' }: { pattern: string; height?: number; className?: string; view?: number; pxPerM?: number; theme?: KitTheme }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const L = useMemo(() => layout(pattern, view), [pattern, view]);
  const pad = 4;
  const size = pxPerM ? { width: Math.ceil((L.x1 - L.x0) * pxPerM) + pad * 2, height: Math.ceil((L.y1 - L.y0) * pxPerM) + pad * 2 } : null;
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = size?.width ?? (canvas.clientWidth || 140), h = size?.height ?? (canvas.clientHeight || height);
      const k = pxPerM ?? Math.min((w - pad * 2) / (L.x1 - L.x0), (h - pad * 2) / (L.y1 - L.y0)) * 0.94;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Mitte des Geräts in die Mitte der Fläche schieben
      ctx.translate(-((L.x0 + L.x1) / 2) * k, -((L.y0 + L.y1) / 2) * k);
      drawScene(ctx, w, h, L.p, 0, { ...L.cam, focal: DIST * k }, new Map(), readColors(), { figure: false, theme });
    };
    if (typeof IntersectionObserver === 'undefined') return draw();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { draw(); io.disconnect(); } }, { rootMargin: '120px' });
    io.observe(canvas);
    return () => io.disconnect();
  }, [L, height, pxPerM, size?.width, size?.height, theme]);
  return <canvas ref={ref} className={`machine-art${pxPerM ? ' to-scale' : ''} ${className}`} style={size ?? { height }} aria-hidden="true" />;
}

/** Stein mit Rissen je nach Fortschritt (0..1); Farbe nach Seltenheit des Geräts darunter */
const ROCK: Record<string, [string, string, string]> = {
  'gewöhnlich': ['#9aa1a9', '#6c737c', '#4b5158'],
  'selten': ['#8fb4e0', '#4f7fb8', '#2f5687'],
  'episch': ['#c3a0e8', '#8a5cc2', '#5c3590'],
  'legendär': ['#f6d77a', '#d4a52a', '#9a7210'],
};
/** Stein, der mit jedem Schlag durchsichtiger wird – darin erkennt man nach und nach das Gerät */
export function StoneWithMachine({ progress, rarity, pattern, size = 130 }: { progress: number; rarity: string; pattern: string; size?: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="stone-box" style={{ width: size, height: size * 0.92 }}>
      <div className="stone-inner" style={{ opacity: 0.15 + p * 0.85, filter: `grayscale(${Math.round((1 - p) * 100)}%) brightness(${0.55 + p * 0.45})` }}>
        <MachineArt pattern={pattern} height={Math.round(size * 0.78)} />
      </div>
      <div className="stone-layer" style={{ opacity: 1 - p * 0.72 }}><Stone progress={p} rarity={rarity} /></div>
    </div>
  );
}

export function Stone({ progress, rarity, shake = false }: { progress: number; rarity: string; shake?: boolean }) {
  const [l, m, d] = ROCK[rarity] ?? ROCK['gewöhnlich'];
  const stage = Math.min(4, Math.floor(progress * 5));
  const cracks = [
    'M120 40 L112 70 L124 92',
    'M124 92 L104 118 L110 146 M124 92 L150 112',
    'M150 112 L170 140 L162 168 M104 118 L78 130',
    'M110 146 L122 176 M78 130 L66 160 L80 182 M170 140 L196 150',
  ];
  return (
    <svg className={`stone${shake ? ' shake' : ''}`} viewBox="0 0 240 220" role="img" aria-label={`Stein zu ${Math.round(progress * 100)} % zerschlagen`}>
      <defs>
        <radialGradient id="rock" cx="38%" cy="30%" r="75%"><stop offset="0" stopColor={l} /><stop offset="0.55" stopColor={m} /><stop offset="1" stopColor={d} /></radialGradient>
      </defs>
      <ellipse cx="120" cy="200" rx="92" ry="14" fill="rgba(0,0,0,0.25)" />
      <path d="M40 170 L28 120 L52 70 L96 34 L150 30 L196 60 L214 112 L204 166 L160 194 L80 196 Z" fill="url(#rock)" stroke={d} strokeWidth="3" strokeLinejoin="round" />
      <path d="M52 70 L96 34 L150 30 L130 60 L84 80 Z" fill="rgba(255,255,255,0.18)" />
      <path d="M204 166 L160 194 L80 196 L120 176 L180 160 Z" fill="rgba(0,0,0,0.18)" />
      {cracks.slice(0, stage).map((c, i) => <path key={i} d={c} fill="none" stroke="#1e1f22" strokeWidth={3.5 - i * 0.4} strokeLinecap="round" strokeLinejoin="round" />)}
      {rarity !== 'gewöhnlich' && <g fill="#fff" opacity="0.85"><path d="M70 92 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" /><path d="M176 84 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" /></g>}
    </svg>
  );
}
