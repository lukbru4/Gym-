// Gezeichnetes Trainingsgerät ohne Figur (aus den Übungs-Animationen), gezeichnet, sobald es sichtbar ist.
import { useEffect, useRef } from 'react';
import { PATTERNS } from '../lib/animations';
import { drawScene, frameOf } from '../lib/drawFigure';
import { readColors } from './ExerciseAnim';

export function MachineArt({ pattern, height = 120, className = '' }: { pattern: string; height?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => {
      const p = PATTERNS[pattern] ?? PATTERNS.bench;
      const f = frameOf(p);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 140, h = canvas.clientHeight || height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, w, h, p, 0, { azimuth: p.azimuth, elevation: 14, distance: f.size * 1.18, target: f.target }, new Map(), readColors(), { figure: false });
    };
    if (typeof IntersectionObserver === 'undefined') return draw();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { draw(); io.disconnect(); } }, { rootMargin: '120px' });
    io.observe(canvas);
    return () => io.disconnect();
  }, [pattern, height]);
  return <canvas ref={ref} className={`machine-art ${className}`} style={{ height }} aria-hidden="true" />;
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
