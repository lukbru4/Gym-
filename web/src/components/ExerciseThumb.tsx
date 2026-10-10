// Vorschaubild einer Übung für die Kartenliste: die Anatomie-Figur mit den beanspruchten Muskeln in Rot (Kraft),
// bei Cardio ein Standbild der Bewegung. Wird erst gezeichnet, wenn die Karte sichtbar ist.
import { useEffect, useRef, useState } from 'react';
import { animIdFor } from '../lib/animMap';
import { PATTERNS } from '../lib/animations';
import { drawScene, frameOf, type Focus as AnimFocus } from '../lib/drawFigure';
import { musclesOf } from '../lib/muscles';
import { BodyGraph } from './BodyGraph';
import { focusFor, readColors } from './ExerciseAnim';
import { MUSCLE_BOX, MUSCLE_VIEW } from './MuscleStrip';
import { focusOf } from './WorkoutMuscles';
import type { Exercise, MuscleId } from '../lib/types';

function useVisible<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setSeen(true), io.disconnect()), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function CardioThumb({ name, muscles, height }: { name: string; muscles: MuscleId[]; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [wrap, seen] = useVisible<HTMLDivElement>();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!seen || !canvas || !ctx) return;
    const pattern = PATTERNS[animIdFor(name, muscles)] ?? PATTERNS.generic;
    const frame = frameOf(pattern);
    const hi: AnimFocus = new Map();
    const f = focusFor(muscles);
    for (const sg of f.secondary) hi.set(sg, 's');
    for (const sg of f.primary) hi.set(sg, 'p');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 150, h = canvas.clientHeight || height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, w, h, pattern, 0.5, { azimuth: pattern.azimuth, elevation: 12, distance: frame.size * 1.22, target: frame.target }, hi, readColors());
  }, [seen, name, muscles, height]);
  return (
    <div ref={wrap} className="ex-thumb-wrap" style={{ height }}>
      <canvas ref={ref} className="ex-thumb" style={{ height }} aria-hidden="true" />
    </div>
  );
}

export function ExerciseThumb({ ex, height = 128 }: { ex: Pick<Exercise, 'name' | 'type' | 'muscles'>; height?: number }) {
  const muscles = musclesOf(ex);
  const [wrap, seen] = useVisible<HTMLDivElement>();
  if (ex.type === 'cardio' || !muscles.length) return <CardioThumb name={ex.name} muscles={muscles} height={height} />;
  const primary = muscles[0];
  return (
    <div ref={wrap} className="ex-thumb-wrap fig" style={{ height }} aria-hidden="true">
      {seen && <BodyGraph focus={focusOf([{ name: ex.name, muscles, type: ex.type }]).focus} view={MUSCLE_VIEW[primary]} box={MUSCLE_BOX[primary]} skin={null} />}
    </div>
  );
}
