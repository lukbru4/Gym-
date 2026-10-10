// Kleines Standbild einer Übung für die Kartenliste (zeichnet einmal, sobald sichtbar – keine Dauer-Animation).
import { useEffect, useRef } from 'react';
import { animIdFor } from '../lib/animMap';
import { PATTERNS } from '../lib/animations';
import { drawScene, frameOf, type Focus } from '../lib/drawFigure';
import { focusFor, readColors } from './ExerciseAnim';
import type { MuscleId } from '../lib/types';

export function ExerciseThumb({ name, muscles, height = 104 }: { name: string; muscles: MuscleId[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let done = false;
    const draw = () => {
      if (done) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      done = true;
      const pattern = PATTERNS[animIdFor(name, muscles)] ?? PATTERNS.generic;
      const frame = frameOf(pattern);
      const hi: Focus = new Map();
      const f = focusFor(muscles);
      for (const sg of f.secondary) hi.set(sg, 's');
      for (const sg of f.primary) hi.set(sg, 'p');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 150, h = canvas.clientHeight || height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, w, h, pattern, 0.5, { azimuth: pattern.azimuth, elevation: 12, distance: frame.size * 1.22, target: frame.target }, hi, readColors());
    };
    if (typeof IntersectionObserver === 'undefined') {
      draw();
      return;
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (draw(), io.disconnect()), { rootMargin: '120px' });
    io.observe(canvas);
    return () => io.disconnect();
  }, [name, muscles, height]);
  return <canvas ref={ref} className="ex-thumb" style={{ height }} aria-hidden="true" />;
}
