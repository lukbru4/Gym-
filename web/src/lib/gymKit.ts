// Bausteine für realistisch wirkende Studiogeräte in der 2D-Perspektive der Übungs-Animation:
// Stahlrohre mit Zylinder-Schattierung, Quader mit Licht je Fläche (nur sichtbare Flächen), Polster, Hantelscheiben, Seile.
// Alles wird als Zeichen-Auftrag mit Tiefe abgelegt und später von hinten nach vorn gezeichnet (Maler-Verfahren).
import type { Camera, Projected, V3 } from './rig';

export type RGB = [number, number, number];
export interface Mat { base: RGB; gloss: number }

/** Materialien wie im Studio: graphitfarbene Rahmen, schwarze Kunstleder-Polster, verchromte Stangen, Gusseisen-Scheiben */
export const MAT = {
  frame: { base: [70, 76, 86], gloss: 0.35 } as Mat,
  frameLight: { base: [168, 174, 184], gloss: 0.5 } as Mat,
  pad: { base: [34, 36, 41], gloss: 0.25 } as Mat,
  chrome: { base: [205, 210, 218], gloss: 0.9 } as Mat,
  plate: { base: [44, 46, 52], gloss: 0.2 } as Mat,
  stack: { base: [58, 61, 68], gloss: 0.3 } as Mat,
  pin: { base: [240, 132, 36], gloss: 0.4 } as Mat,
  rubber: { base: [36, 38, 42], gloss: 0.05 } as Mat,
  grip: { base: [26, 27, 30], gloss: 0.15 } as Mat,
  cable: { base: [30, 31, 34], gloss: 0.2 } as Mat,
  bench: { base: [150, 154, 162], gloss: 0.3 } as Mat,
  red: { base: [200, 44, 40], gloss: 0.3 } as Mat,
  wood: { base: [168, 120, 78], gloss: 0.15 } as Mat,
};

/** Vintage-Look (Holz-Gym): Rahmen aus Holz, Polster aus braunem Leder, Chrom wird Messing, Scheiben Gusseisen */
const VINTAGE = new Map<Mat, Mat>([
  [MAT.frame, { base: [122, 82, 50], gloss: 0.18 }],
  [MAT.frameLight, { base: [168, 122, 78], gloss: 0.2 }],
  [MAT.pad, { base: [112, 60, 32], gloss: 0.4 }],
  [MAT.chrome, { base: [200, 162, 84], gloss: 0.85 }],
  [MAT.plate, { base: [42, 40, 38], gloss: 0.25 }],
  [MAT.stack, { base: [64, 54, 46], gloss: 0.3 }],
  [MAT.pin, { base: [200, 162, 84], gloss: 0.8 }],
  [MAT.rubber, { base: [84, 60, 40], gloss: 0.1 }],
  [MAT.grip, { base: [84, 50, 30], gloss: 0.25 }],
  [MAT.bench, { base: [176, 128, 82], gloss: 0.2 }],
]);
export type KitTheme = 'modern' | 'vintage';

export interface Item { depth: number; draw: () => void }

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vec = { norm, dot, add, sub, mul, cross };

/** Licht von oben links vorn */
const LIGHT = norm([-0.45, 0.8, 0.5]);
const rgb = (c: RGB, k = 1) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;
/** Farbe einer Fläche mit Normale n (Umgebungslicht + gerichtetes Licht + etwas Glanz) */
export function shade(m: Mat, n: V3): string {
  const d = Math.max(0, dot(n, LIGHT));
  const k = 0.55 + 0.6 * d;
  const spec = m.gloss * Math.pow(d, 12) * 70;
  return `rgb(${m.base.map((v) => Math.max(0, Math.min(255, Math.round(v * k + spec)))).join(',')})`;
}

export interface Kit {
  P: (v: V3) => Projected;
  /** Blickrichtung zur Kamera (Welt) */
  view: V3;
  tube: (a: V3, b: V3, r: number, m: Mat, bias?: number) => void;
  /** Quader: Mitte c, Achsen ax/ay/az (normiert), halbe Kantenlängen */
  box: (c: V3, ax: V3, ay: V3, az: V3, hx: number, hy: number, hz: number, m: Mat, bias?: number) => void;
  /** achsparalleler Quader */
  aabb: (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, m: Mat, bias?: number) => void;
  /** Polster (Kunstleder, abgerundet wirkend) */
  pad: (c: V3, ax: V3, ay: V3, az: V3, hx: number, hy: number, hz: number, bias?: number) => void;
  /** Scheibe (Hantelscheibe, Rolle): Mitte, Achse, Radius, Dicke */
  disc: (c: V3, axis: V3, r: number, thick: number, m: Mat, bias?: number, hole?: number) => void;
  cable: (a: V3, b: V3, bias?: number) => void;
  ball: (c: V3, r: number, m: Mat, bias?: number) => void;
}

export function makeKit(ctx: CanvasRenderingContext2D, P: (v: V3) => Projected, items: Item[], cam: Camera, theme: KitTheme = 'modern'): Kit {
  const R = (m: Mat) => (theme === 'vintage' ? VINTAGE.get(m) ?? m : m);
  const a = (cam.azimuth * Math.PI) / 180, e = (cam.elevation * Math.PI) / 180;
  const view: V3 = [-Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];

  const face = (pts: V3[], n: V3, m: Mat, bias: number, soft = false) => {
    if (dot(n, view) <= 0.02) return;
    const q = pts.map(P);
    const depth = q.reduce((s, v) => s + v.depth, 0) / q.length + bias;
    items.push({
      depth,
      draw: () => {
        const col = shade(m, n);
        if (soft) {
          // Polster: leichter Verlauf zur Kante hin dunkler (gepolsterte Wölbung)
          const cx = q.reduce((s, v) => s + v.x, 0) / q.length, cy = q.reduce((s, v) => s + v.y, 0) / q.length;
          const rr = Math.max(...q.map((v) => Math.hypot(v.x - cx, v.y - cy)));
          const g = ctx.createRadialGradient(cx - rr * 0.25, cy - rr * 0.3, rr * 0.05, cx, cy, rr * 1.05);
          g.addColorStop(0, shade({ ...m, base: m.base.map((v) => v * 1.9) as RGB }, n));
          g.addColorStop(0.55, col);
          g.addColorStop(1, rgb(m.base, 0.55));
          ctx.fillStyle = g;
        } else ctx.fillStyle = col;
        ctx.strokeStyle = rgb(m.base, 0.45);
        ctx.lineWidth = soft ? 1.6 : 0.8;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(q[0].x, q[0].y);
        for (const v of q.slice(1)) ctx.lineTo(v.x, v.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      },
    });
  };

  const box = (c: V3, ax: V3, ay: V3, az: V3, hx: number, hy: number, hz: number, m: Mat, bias = 0, soft = false) => {
    const X = mul(ax, hx), Y = mul(ay, hy), Z = mul(az, hz);
    const v = (sx: number, sy: number, sz: number): V3 => add(add(add(c, mul(X, sx)), mul(Y, sy)), mul(Z, sz));
    face([v(1, -1, -1), v(1, 1, -1), v(1, 1, 1), v(1, -1, 1)], ax, m, bias, soft);
    face([v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)], mul(ax, -1), m, bias, soft);
    face([v(-1, 1, -1), v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1)], ay, m, bias, soft);
    face([v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)], mul(ay, -1), m, bias, soft);
    face([v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)], az, m, bias, soft);
    face([v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1), v(1, -1, -1)], mul(az, -1), m, bias, soft);
  };
  const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];

  const tube: Kit['tube'] = (a2, b2, r, m, bias = 0) => {
    const pa = P(a2), pb = P(b2);
    items.push({
      depth: (pa.depth + pb.depth) / 2 + bias,
      draw: () => {
        const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const r1 = Math.max(0.8, r * pa.s), r2 = Math.max(0.8, r * pb.s), rm = (r1 + r2) / 2;
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        // Zylinder-Schattierung quer zur Achse: dunkle Kante, Glanzstreifen, Körperfarbe, Schattenseite
        const g = ctx.createLinearGradient(mx + nx * rm, my + ny * rm, mx - nx * rm, my - ny * rm);
        const lightSide = nx * -0.45 + ny * -0.8 > 0;
        const stops: [number, string][] = [
          [0, rgb(m.base, 0.55)],
          [0.22, rgb(m.base, 1.25 + m.gloss * 0.5)],
          [0.42, rgb(m.base, 1.05)],
          [0.8, rgb(m.base, 0.7)],
          [1, rgb(m.base, 0.45)],
        ];
        for (const [o, col] of stops) g.addColorStop(lightSide ? o : 1 - o, col);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(pa.x + nx * r1, pa.y + ny * r1);
        ctx.lineTo(pb.x + nx * r2, pb.y + ny * r2);
        ctx.lineTo(pb.x - nx * r2, pb.y - ny * r2);
        ctx.lineTo(pa.x - nx * r1, pa.y - ny * r1);
        ctx.closePath();
        ctx.fill();
        // Enden rund
        ctx.fillStyle = rgb(m.base, 0.85);
        for (const [q, rr] of [[pa, r1], [pb, r2]] as const) {
          ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, Math.PI * 2); ctx.fill();
        }
      },
    });
  };

  const disc: Kit['disc'] = (c, axis, r, thick, m, bias = 0, hole = 0.18) => {
    const n = norm(axis);
    const u = norm(Math.abs(n[1]) < 0.9 ? cross(n, Y) : cross(n, X));
    const w = cross(n, u);
    const N = 22;
    const ring = (center: V3, rad: number) => Array.from({ length: N }, (_, i) => {
      const t = (i / N) * Math.PI * 2;
      return add(center, add(mul(u, Math.cos(t) * rad), mul(w, Math.sin(t) * rad)));
    });
    const front = add(c, mul(n, thick / 2)), back = add(c, mul(n, -thick / 2));
    const fr = ring(front, r), br = ring(back, r);
    // Rand (nur die sichtbaren Segmente)
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const mid = add(c, mul(add(sub(fr[i], front), sub(fr[j], front)), 0.5));
      face([fr[i], fr[j], br[j], br[i]], norm(sub(mid, c)), m, bias);
    }
    for (const [pts, nn, center] of [[fr, n, front], [br, mul(n, -1), back]] as const) {
      if (dot(nn, view) <= 0) continue;
      const q = pts.map(P), pc = P(center);
      items.push({
        depth: pc.depth + bias - 0.001,
        draw: () => {
          const rr = Math.max(...q.map((v) => Math.hypot(v.x - pc.x, v.y - pc.y)));
          const g = ctx.createRadialGradient(pc.x - rr * 0.3, pc.y - rr * 0.35, rr * 0.1, pc.x, pc.y, rr);
          g.addColorStop(0, shade({ ...m, base: m.base.map((v) => v * 1.5) as RGB }, nn));
          g.addColorStop(0.7, shade(m, nn));
          g.addColorStop(1, rgb(m.base, 0.6));
          ctx.fillStyle = g;
          ctx.strokeStyle = rgb(m.base, 0.4);
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (const v of q.slice(1)) ctx.lineTo(v.x, v.y); ctx.closePath(); ctx.fill(); ctx.stroke();
          // erhabener Ring und Bohrung
          ctx.strokeStyle = rgb(m.base, 1.35); ctx.lineWidth = Math.max(0.6, rr * 0.05);
          ctx.beginPath();
          q.forEach((v, i) => { const x = pc.x + (v.x - pc.x) * 0.72, y = pc.y + (v.y - pc.y) * 0.72; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          ctx.closePath(); ctx.stroke();
          if (hole > 0) {
            ctx.fillStyle = rgb([200, 204, 210], 0.9);
            ctx.beginPath();
            q.forEach((v, i) => { const x = pc.x + (v.x - pc.x) * hole, y = pc.y + (v.y - pc.y) * hole; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.closePath(); ctx.fill();
          }
        },
      });
    }
  };

  const cable: Kit['cable'] = (a2, b2, bias = 0) => {
    const pa = P(a2), pb = P(b2);
    items.push({ depth: (pa.depth + pb.depth) / 2 + bias, draw: () => {
      ctx.strokeStyle = rgb(MAT.cable.base); ctx.lineWidth = Math.max(1, 0.012 * (pa.s + pb.s) / 2); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    } });
  };

  const ball: Kit['ball'] = (c, r, m, bias = 0) => {
    const pc = P(c);
    items.push({ depth: pc.depth + bias, draw: () => {
      const rr = r * pc.s;
      const g = ctx.createRadialGradient(pc.x - rr * 0.35, pc.y - rr * 0.4, rr * 0.08, pc.x, pc.y, rr);
      g.addColorStop(0, rgb(m.base, 1.6)); g.addColorStop(0.6, rgb(m.base, 1)); g.addColorStop(1, rgb(m.base, 0.5));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pc.x, pc.y, rr, 0, Math.PI * 2); ctx.fill();
    } });
  };

  return {
    P,
    view,
    tube: (a, b, r, m, bias) => tube(a, b, r, R(m), bias),
    box: (c, ax, ay, az, hx, hy, hz, m, bias) => box(c, ax, ay, az, hx, hy, hz, R(m), bias),
    aabb: (x0, x1, y0, y1, z0, z1, m, bias) => box([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], X, Y, Z, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2, R(m), bias),
    pad: (c, ax, ay, az, hx, hy, hz, bias) => box(c, ax, ay, az, hx, hy, hz, R(MAT.pad), bias, true),
    disc: (c, axis, r, thick, m, bias, hole) => disc(c, axis, r, thick, R(m), bias, hole),
    cable,
    ball: (c, r, m, bias) => ball(c, r, R(m), bias),
  };
}

/** Kit, das nichts zeichnet, sondern nur die Punkte der Geräte sammelt (für den Bildausschnitt) */
export function boundsKit(points: V3[]): Kit {
  const addPt = (v: V3, r = 0) => {
    points.push(v);
    if (r) points.push([v[0], v[1] + r, v[2]], [v[0], v[1] - r, v[2]]);
  };
  const boxPts = (c: V3, ax: V3, ay: V3, az: V3, hx: number, hy: number, hz: number) => {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) addPt(add(add(add(c, mul(ax, hx * sx)), mul(ay, hy * sy)), mul(az, hz * sz)));
  };
  const noop = () => ({ x: 0, y: 0, s: 1, depth: 0 });
  return {
    P: noop,
    view: [0, 0, 1],
    tube: (a, b, r) => { addPt(a, r); addPt(b, r); },
    box: (c, ax, ay, az, hx, hy, hz) => boxPts(c, ax, ay, az, hx, hy, hz),
    aabb: (x0, x1, y0, y1, z0, z1) => { addPt([x0, y0, z0]); addPt([x1, y1, z1]); },
    pad: (c, ax, ay, az, hx, hy, hz) => boxPts(c, ax, ay, az, hx, hy, hz),
    disc: (c, _axis, r) => addPt(c, r),
    cable: (a, b) => { addPt(a); addPt(b); },
    ball: (c, r) => addPt(c, r),
  };
}
