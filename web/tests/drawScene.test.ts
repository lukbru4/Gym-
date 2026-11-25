import { describe, expect, test } from 'vitest';
import { PATTERNS } from '../src/lib/animations';
import { drawScene, frameOf, type Colors } from '../src/lib/drawFigure';

// Canvas-Attrappe: jede Methode tut nichts, Gradienten haben addColorStop
function fakeCtx() {
  const calls = { fill: 0 };
  const grad = { addColorStop: () => {} };
  const target: Record<string, unknown> = {};
  const ctx = new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k as string];
      if (k === 'fill') return () => { calls.fill++; };
      if (typeof k === 'string' && /^create.*Gradient$|^createPattern$/.test(k)) return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(t, k, v) { t[k as string] = v; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const C: Colors = { body: '#9aa3ad', bodyDark: '#6b7480', accent: '#e5484d', accent2: '#f5a524', prop: '#5b6470', propDark: '#3a414b', floor: '#e6e8eb', text: '#111' };

describe('Übungs-Szenen zeichnen', () => {
  test('jedes Muster (mit Gerät) lässt sich ohne Fehler und mit endlichen Koordinaten zeichnen', () => {
    for (const p of Object.values(PATTERNS)) {
      const f = frameOf(p);
      expect(Number.isFinite(f.size) && f.size > 0, p.id).toBe(true);
      for (const u of [0, 0.25, 0.5]) {
        const { ctx, calls } = fakeCtx();
        drawScene(ctx, 300, 200, p, u, { azimuth: p.azimuth, elevation: 12, distance: f.size * 1.22, target: f.target }, new Map(), C);
        expect(calls.fill, p.id).toBeGreaterThan(5);
      }
    }
  });
});
