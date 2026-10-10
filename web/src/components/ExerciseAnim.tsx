// Spielt ein Bewegungsmuster als drehbare 3D-Figur ab (Canvas). Mit dem Finger ziehen = drehen.
import { useEffect, useMemo, useRef, useState } from 'react';
import { frameOf, drawScene, type Colors, type Focus } from '../lib/drawFigure';
import { PATTERNS, type Segment } from '../lib/animations';

export const readColors = (): Colors => ({
  body: '#aeb4be', bodyDark: '#5d6370', accent: '#d9332a', accent2: '#ec8a7c', prop: '#d3d6dd', propDark: '#4a4f5c', floor: 'rgba(90,94,104,0.18)', text: '#1c2230',
});

export function ExerciseAnim({ id, highlight, height = 300, autoplay = true, label, fixedU, compact = false }: { id: string; highlight?: { primary: Segment[]; secondary: Segment[] }; height?: number; autoplay?: boolean; label?: string; /** Standbild (0 = Start, 0,5 = Endstellung) */ fixedU?: number; compact?: boolean }) {
  const pattern = PATTERNS[id] ?? PATTERNS.generic;
  const ref = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(fixedU === undefined && autoplay && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [speed, setSpeed] = useState(1);
  const az = useRef(pattern.azimuth);
  const el = useRef(14);
  const u = useRef(fixedU ?? 0);
  const dirty = useRef(true);
  const frame = useMemo(() => frameOf(pattern), [pattern]);
  const key = highlight ? `${highlight.primary.join(',')}|${highlight.secondary.join(',')}` : '';
  const hi = useMemo<Focus>(() => {
    const m: Focus = new Map();
    for (const sg of highlight?.secondary ?? []) m.set(sg, 's');
    for (const sg of highlight?.primary ?? []) m.set(sg, 'p');
    return m;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    az.current = pattern.azimuth;
  }, [pattern]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    dirty.current = true;
    let raf = 0;
    let last = performance.now();
    const colors = readColors();
    // Nur zeichnen, solange die Fläche sichtbar ist; im Standbild nur bei Änderung (spart Akku und Rechenzeit)
    let visible = true;
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); dirty.current = true; }) : null;
    io?.observe(canvas);
    const render = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!visible || (!playing && !dirty.current)) { raf = requestAnimationFrame(render); return; }
      dirty.current = false;
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
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [pattern, playing, speed, frame, hi]);

  // Ziehen = drehen und kippen
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    dirty.current = true;
    az.current += (e.clientX - drag.current.x) * 0.6;
    el.current = Math.max(-10, Math.min(60, el.current + (e.clientY - drag.current.y) * 0.3));
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => void (drag.current = null);

  return (
    <div className="anim" data-anim={pattern.id}>
      <canvas ref={ref} className="anim-canvas" style={{ height }} role="img" aria-label={label ?? pattern.name} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => { az.current = pattern.azimuth; el.current = 14; dirty.current = true; }} />
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
/** Erster Muskel = Hauptmuskel (rot), weitere = Hilfsmuskeln (orange) */
export const focusFor = (muscles: string[]): { primary: Segment[]; secondary: Segment[] } => {
  const primary = MUSCLE_SEGMENTS[muscles[0]] ?? [];
  const secondary = [...new Set(muscles.slice(1).flatMap((m) => MUSCLE_SEGMENTS[m] ?? []))].filter((x) => !primary.includes(x));
  return { primary, secondary };
};
