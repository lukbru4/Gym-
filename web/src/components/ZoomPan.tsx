// Zoomen und Verschieben: zwei Finger (Pinch), Mausrad, Doppeltipp, Knöpfe + / − / ⟲; mit einem Finger verschieben, wenn gezoomt.
import { useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';

const MIN = 1, MAX = 4;

export function ZoomPan({ children, className = '', id, label = 'Karte' }: { children: ReactNode; className?: string; id?: string; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; k: number; cx: number; cy: number; x: number; y: number } | null>(null);
  const moved = useRef(0);
  const lastTap = useRef(0);

  /** Verschiebung begrenzen, damit der Inhalt den Rahmen immer ausfüllt */
  const clamp = (k: number, x: number, y: number) => {
    const w = box.current?.clientWidth ?? 0, h = box.current?.clientHeight ?? 0;
    return { k, x: Math.min(0, Math.max(w - w * k, x)), y: Math.min(0, Math.max(h - h * k, y)) };
  };
  /** Zoom um einen Punkt (in Pixeln im Rahmen) */
  const zoomAt = (k2: number, px: number, py: number, from = t) => {
    const k = Math.max(MIN, Math.min(MAX, k2));
    const f = k / from.k;
    return clamp(k, px - (px - from.x) * f, py - (py - from.y) * f);
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const center = () => ({ x: (box.current?.clientWidth ?? 0) / 2, y: (box.current?.clientHeight ?? 0) / 2 });

  const down = (e: RPointerEvent) => {
    pts.current.set(e.pointerId, local(e));
    if (pts.current.size === 1) moved.current = 0;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: t.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, x: t.x, y: t.y };
    }
  };
  const move = (e: RPointerEvent) => {
    const prev = pts.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pts.current.set(e.pointerId, p);
    moved.current += Math.hypot(p.x - prev.x, p.y - prev.y);
    if (pts.current.size >= 2 && gesture.current) {
      const [a, b] = [...pts.current.values()];
      const g = gesture.current;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setT(zoomAt(g.k * (d / g.dist), g.cx, g.cy, { k: g.k, x: g.x, y: g.y }));
    } else if (t.k > 1) {
      setT((cur) => clamp(cur.k, cur.x + p.x - prev.x, cur.y + p.y - prev.y));
    }
  };
  const up = (e: RPointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) gesture.current = null;
    // Doppeltipp: heranzoomen bzw. zurück
    if (pts.current.size === 0 && moved.current < 6 && e.pointerType !== 'mouse') {
      const now = Date.now();
      if (now - lastTap.current < 300) { const p = local(e); setT(t.k > 1.5 ? { k: 1, x: 0, y: 0 } : zoomAt(2.5, p.x, p.y)); lastTap.current = 0; }
      else lastTap.current = now;
    }
  };

  return (
    <div className={`zoompan ${className}${t.k > 1 ? ' zoomed' : ''}`} id={id} ref={box}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { if (e.pointerType === 'mouse') up(e); }}
      onWheel={(e) => { if (!e.ctrlKey && t.k === 1 && e.deltaY > 0) return; e.preventDefault(); const p = local(e); setT(zoomAt(t.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2), p.x, p.y)); }}
      onClickCapture={(e) => { if (moved.current > 6) { e.stopPropagation(); e.preventDefault(); } }}
      role="group" aria-label={`${label} – zum Vergrößern mit zwei Fingern ziehen`} data-zoom={t.k.toFixed(2)}>
      <div className="zoompan-inner" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>{children}</div>
      <div className="zoompan-btns" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Vergrößern" data-zoom-in onClick={() => { const c = center(); setT(zoomAt(t.k * 1.5, c.x, c.y)); }}>+</button>
        <button type="button" aria-label="Verkleinern" data-zoom-out disabled={t.k <= MIN} onClick={() => { const c = center(); setT(zoomAt(t.k / 1.5, c.x, c.y)); }}>−</button>
        {t.k > 1 && <button type="button" aria-label="Ganze Ansicht" data-zoom-reset onClick={() => setT({ k: 1, x: 0, y: 0 })}>⟲</button>}
      </div>
    </div>
  );
}
