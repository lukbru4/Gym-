// Spielt ein Bewegungsmuster als drehbare 3D-Figur ab (Canvas). Mit dem Finger ziehen = drehen.
import { useEffect, useMemo, useRef, useState } from 'react';
import { frameOf, drawScene, type Colors } from '../lib/drawFigure';
import { PATTERNS, type Segment } from '../lib/animations';

const css = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};
const readColors = (): Colors => ({
  body: '#aab0bb', bodyDark: '#4b5160', accent: css('--accent', '#e8222f'), prop: '#d7dae0', propDark: '#7a8090', floor: 'rgba(160,165,175,0.18)', text: css('--text', '#fff'),
});

export function ExerciseAnim({ id, highlight = [], height = 300, autoplay = true, label, fixedU, compact = false }: { id: string; highlight?: Segment[]; height?: number; autoplay?: boolean; label?: string; /** Standbild (0 = Start, 0,5 = Endstellung) */ fixedU?: number; compact?: boolean }) {
  const pattern = PATTERNS[id] ?? PATTERNS.generic;
  const ref = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(fixedU === undefined && autoplay && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [speed, setSpeed] = useState(1);
  const az = useRef(pattern.azimuth);
  const el = useRef(14);
  const u = useRef(fixedU ?? 0);
  const frame = useMemo(() => frameOf(pattern), [pattern]);
  const hi = useMemo(() => new Set<Segment>(highlight), [highlight.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    az.current = pattern.azimuth;
  }, [pattern]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const colors = readColors();
    const render = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) u.current = (u.current + (dt * speed) / pattern.seconds) % 1;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, w, h, pattern, u.current, { azimuth: az.current, elevation: el.current, distance: frame.size * 1.45, target: frame.target }, hi, colors);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [pattern, playing, speed, frame, hi]);

  // Ziehen = drehen und kippen
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    az.current += (e.clientX - drag.current.x) * 0.6;
    el.current = Math.max(-10, Math.min(60, el.current + (e.clientY - drag.current.y) * 0.3));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => void (drag.current = null);

  return (
    <div className="anim" data-anim={pattern.id}>
      <canvas ref={ref} className="anim-canvas" style={{ height }} role="img" aria-label={label ?? pattern.name} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => { az.current = pattern.azimuth; el.current = 14; }} />
      {!compact && <div className="anim-ctrl">
        <button type="button" className="btn small-btn" data-anim-play onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Abspielen'}>{playing ? '❚❚' : '▶'}</button>
        <button type="button" className="btn small-btn" data-anim-speed onClick={() => setSpeed((s) => (s === 1 ? 0.5 : s === 0.5 ? 1.5 : 1))}>{speed === 1 ? '1×' : speed === 0.5 ? '0,5×' : '1,5×'}</button>
        <span className="muted small">Ziehen zum Drehen</span>
      </div>}
    </div>
  );
}

/** Welche Körperteile werden für welchen Muskel hervorgehoben? */
export const MUSCLE_SEGMENTS: Record<string, Segment[]> = {
  brust: ['chest'], schultern: ['shoulders'], bizeps: ['upperArms'], trizeps: ['upperArms'], bauch: ['abs'],
  oberer_ruecken: ['upperBack'], lat: ['upperBack'], unterer_ruecken: ['lowerBack'], gesaess: ['glutes'], quadrizeps: ['thighs'], beinbeuger: ['thighs'], waden: ['calves'],
};
export const segmentsFor = (muscles: string[]): Segment[] => [...new Set(muscles.flatMap((m) => MUSCLE_SEGMENTS[m] ?? []))];
