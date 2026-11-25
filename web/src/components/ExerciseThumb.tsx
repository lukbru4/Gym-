// Vorschaubild einer Übung für die Kartenliste: die Übung selbst (Figur am Gerät, beanspruchte Muskeln rot),
// die sich in Schleife bewegt, solange die Karte im Bild ist. Bei „Bewegung reduzieren“ ein Standbild.
import { useEffect, useRef } from 'react';
import { animIdFor } from '../lib/animMap';
import { PATTERNS } from '../lib/animations';
import { drawScene, frameOf, type Focus as AnimFocus } from '../lib/drawFigure';
import { musclesOf } from '../lib/muscles';
import { ExerciseMedia, useHasMedia } from './ExerciseMedia';
import { focusFor, readColors } from './ExerciseAnim';
import type { Exercise, MuscleId } from '../lib/types';

// Ein gemeinsamer, gedrosselter Zeitgeber für alle sichtbaren Karten (ca. 20 Bilder/s)
type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let raf = 0, last = 0;
const loop = (now: number) => {
  raf = ticks.size ? requestAnimationFrame(loop) : 0;
  if (now - last < 50) return;
  last = now;
  for (const t of ticks) t(now);
};
const subscribe = (t: Tick) => {
  ticks.add(t);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => { ticks.delete(t); };
};
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function SceneThumb({ name, muscles, height }: { name: string; muscles: MuscleId[]; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = ref.current, el = wrap.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !el || !ctx) return;
    const pattern = PATTERNS[animIdFor(name, muscles)] ?? PATTERNS.generic;
    const frame = frameOf(pattern);
    const hi: AnimFocus = new Map();
    const f = focusFor(muscles);
    for (const sg of f.secondary) hi.set(sg, 's');
    for (const sg of f.primary) hi.set(sg, 'p');
    const colors = readColors();
    const cam = { azimuth: pattern.azimuth, elevation: 12, distance: frame.size * 1.22, target: frame.target };
    let sized = false, w = 0, h = 0;
    const draw = (u: number) => {
      if (!sized) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth || 150; h = canvas.clientHeight || height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sized = true;
      }
      drawScene(ctx, w, h, pattern, u, cam, hi, colors);
    };
    const still = reducedMotion();
    const start = performance.now() - Math.random() * pattern.seconds * 1000; // Karten nicht im Gleichschritt
    let stop: (() => void) | null = null;
    const show = (on: boolean) => {
      if (on && !stop) {
        if (still) { draw(0.5); stop = () => {}; return; }
        stop = subscribe((now) => draw((((now - start) / 1000) / pattern.seconds) % 1));
      } else if (!on && stop) { stop(); stop = still ? () => {} : null; }
    };
    if (typeof IntersectionObserver === 'undefined') { draw(0.5); return; }
    const io = new IntersectionObserver((es) => show(es.some((e) => e.isIntersecting)), { rootMargin: '60px' });
    io.observe(el);
    return () => { io.disconnect(); stop?.(); };
  }, [name, muscles.join(','), height]);
  return (
    <div ref={wrap} className="ex-thumb-wrap" style={{ height }} aria-hidden="true">
      <canvas ref={ref} className="ex-thumb" style={{ height }} />
    </div>
  );
}

export function ExerciseThumb({ ex, height = 128 }: { ex: Pick<Exercise, 'name' | 'type' | 'muscles'>; height?: number }) {
  const muscles = musclesOf(ex);
  const hasMedia = useHasMedia(ex.name);
  // Echtes Übungsfoto, wenn vorhanden
  if (hasMedia) return <div className="ex-thumb-wrap" style={{ height }}><ExerciseMedia name={ex.name} height={height} className="thumb" /></div>;
  return <SceneThumb name={ex.name} muscles={muscles} height={height} />;
}
