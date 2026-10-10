// Zeichnet die 3D-Figur und ihre Hilfsmittel auf eine Canvas-Fläche (2D-Kontext mit eigener Perspektive).
import { LEN, NEUTRAL, poseAt, project, solve, type Camera, type Joints, type Pose, type V3 } from './rig';
import type { Pattern, Prop, Segment } from './animations';

export interface Colors { body: string; bodyDark: string; accent: string; accent2: string; prop: string; propDark: string; floor: string; text: string }

export interface Tone { light: string; mid: string; dark: string; edge: string }
const hex = (c2: string): [number, number, number] => {
  const m = c2.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const r = c2.match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return r ? [Number(r[1]), Number(r[2]), Number(r[3])] : [232, 34, 47];
};
const mixc = (a: [number, number, number], b: [number, number, number], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
/** Hell/mittel/dunkel für Verlauf aus einer Grundfarbe */
export const toneOf = (base: string): Tone => {
  const b = hex(base);
  return { light: mixc(b, [255, 255, 255], 0.38), mid: mixc(b, [255, 255, 255], 0.02), dark: mixc(b, [0, 0, 0], 0.5), edge: mixc(b, [0, 0, 0], 0.62) };
};
export const tones = (c2: Colors) => ({ body: toneOf(c2.body), primary: toneOf(c2.accent), secondary: toneOf(c2.accent2) });

const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

export function patternPose(p: Pattern, u: number): Pose {
  if (p.cycle) {
    // Zyklus: zwei Schlüsselbilder werden nahtlos hintereinander abgespielt (Schritt links, Schritt rechts)
    return poseAt(p.base ?? {}, p.frames, u);
  }
  return poseAt(p.base ?? {}, p.frames, u);
}

/** Rahmen (Mittelpunkt und Größe) aus mehreren Zeitpunkten der Animation, damit die Figur nicht springt */
export function frameOf(p: Pattern): { target: V3; size: number } {
  let min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const u of [0, 0.15, 0.3, 0.5, 0.7, 0.85]) {
    const j = solve({ ...NEUTRAL, ...patternPose(p, u) }, p.anchor);
    for (const k of Object.values(j) as V3[]) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], k[i]); max[i] = Math.max(max[i], k[i]); }
  }
  min[1] = Math.min(min[1], 0);
  // Maschinen/Kabelturm gehören mit ins Bild
  const pz = solve({ ...NEUTRAL, ...patternPose(p, 0) }, p.anchor).pelvis[2];
  for (const prop of p.props) {
    if (prop.kind === 'stack') { min[2] = Math.min(min[2], pz - 0.95 - (prop.dz ?? 0)); max[1] = Math.max(max[1], 1.95); }
    if (prop.kind === 'cable') { max[1] = Math.max(max[1], 2.3); min[2] = Math.min(min[2], pz + (p.id === 'seatedrow' ? prop.from[2] : prop.from[2]) - 0.6); }
  }
  const target: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2 + 0.05, (min[2] + max[2]) / 2];
  const size = Math.max(max[1] - min[1], (max[2] - min[2]) * 0.9, 1.3) * 1.15;
  return { target, size };
}

interface Item { depth: number; draw: () => void }

export type Focus = Map<Segment, 'p' | 's'>;

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, p: Pattern, u: number, cam: Camera, hi: Focus, c: Colors) {
  ctx.clearRect(0, 0, w, h);
  const pose = { ...NEUTRAL, ...patternPose(p, u) };
  const j = solve(pose, p.anchor);
  const P = (v: V3) => project(v, cam, w, h);
  const items: Item[] = [];

  // Boden: Gitter + Schatten
  ctx.lineWidth = 1;
  ctx.strokeStyle = c.floor;
  for (let i = -3; i <= 3; i++) {
    const a = P([i * 0.25, 0, cam.target[2] - 0.75]), b = P([i * 0.25, 0, cam.target[2] + 0.75]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const d = P([-0.75, 0, cam.target[2] + i * 0.25]), e = P([0.75, 0, cam.target[2] + i * 0.25]);
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.stroke();
  }

  // ---- Figur: verjüngte, schattierte Körperteile mit Muskelbäuchen ----
  const T = tones(c);
  const roleOf = (seg?: Segment) => (seg ? hi.get(seg) : undefined);
  const toneFor = (seg?: Segment): Tone => (roleOf(seg) === 'p' ? T.primary : roleOf(seg) === 's' ? T.secondary : T.body);
  const lerp3 = (a2: V3, b2: V3, t: number): V3 => [a2[0] + (b2[0] - a2[0]) * t, a2[1] + (b2[1] - a2[1]) * t, a2[2] + (b2[2] - a2[2]) * t];
  const LIGHT = [-0.55, -0.83];
  const taper = (a2: V3, b2: V3, ra: number, rb: number, tone: Tone, bias = 0) => {
    const pa = P(a2), pb = P(b2);
    items.push({
      depth: (pa.depth + pb.depth) / 2 + bias,
      draw: () => {
        const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const sgn = nx * LIGHT[0] + ny * LIGHT[1] >= 0 ? 1 : -1;
        const r1 = ra * pa.s, r2 = rb * pb.s, rm = (r1 + r2) / 2;
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        const g = ctx.createLinearGradient(mx + nx * sgn * rm, my + ny * sgn * rm, mx - nx * sgn * rm, my - ny * sgn * rm);
        g.addColorStop(0, tone.light); g.addColorStop(0.45, tone.mid); g.addColorStop(1, tone.dark);
        ctx.fillStyle = g; ctx.strokeStyle = tone.edge; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pa.x + nx * r1, pa.y + ny * r1);
        ctx.lineTo(pb.x + nx * r2, pb.y + ny * r2);
        ctx.lineTo(pb.x - nx * r2, pb.y - ny * r2);
        ctx.lineTo(pa.x - nx * r1, pa.y - ny * r1);
        ctx.closePath(); ctx.fill();
        for (const [q, r] of [[pa, r1], [pb, r2]] as const) {
          const rg = ctx.createRadialGradient(q.x - r * 0.3, q.y - r * 0.35, r * 0.1, q.x, q.y, r);
          rg.addColorStop(0, tone.light); rg.addColorStop(0.6, tone.mid); rg.addColorStop(1, tone.dark);
          ctx.fillStyle = rg;
          ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.moveTo(pa.x + nx * r1, pa.y + ny * r1); ctx.lineTo(pb.x + nx * r2, pb.y + ny * r2);
        ctx.moveTo(pa.x - nx * r1, pa.y - ny * r1); ctx.lineTo(pb.x - nx * r2, pb.y - ny * r2); ctx.stroke();
      },
    });
  };
  /** Körperteil mit Muskelbauch: Der Muskel wölbt sich über dem Knochen (nur wenn hervorgehoben) */
  const part = (a2: V3, b2: V3, ra: number, rb: number, seg?: Segment, belly?: [number, number, number]) => {
    taper(a2, b2, ra, rb, T.body);
    if (seg && roleOf(seg) && belly) {
      const [t0, t1, k] = belly;
      const ra2 = ra + (rb - ra) * t0, rb2 = ra + (rb - ra) * t1;
      taper(lerp3(a2, b2, t0), lerp3(a2, b2, t1), ra2 * k, rb2 * k, toneFor(seg), -0.01);
    }
  };
  const sphere = (a2: V3, r: number, tone: Tone, bias = 0) => {
    const pa = P(a2);
    items.push({ depth: pa.depth + bias, draw: () => {
      const rr = r * pa.s;
      const rg = ctx.createRadialGradient(pa.x - rr * 0.3, pa.y - rr * 0.35, rr * 0.1, pa.x, pa.y, rr);
      rg.addColorStop(0, tone.light); rg.addColorStop(0.6, tone.mid); rg.addColorStop(1, tone.dark);
      ctx.fillStyle = rg; ctx.strokeStyle = tone.edge; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } });
  };

  // Rumpf: Fläche von vorn/hinten (Schultern ↔ Hüfte) und ein Körper mit Tiefe für die Seitenansicht
  const shMid = mid(j.shL, j.shR), hpMid = mid(j.hipL, j.hipR);
  const waist = mid(shMid, hpMid);
  const wl = mid(j.shL, j.hipL), wr = mid(j.shR, j.hipR);
  const quad = (a2: V3, b2: V3, c2: V3, d2: V3, tone: Tone) => {
    const pts = [P(a2), P(b2), P(c2), P(d2)];
    items.push({ depth: pts.reduce((s2, q) => s2 + q.depth, 0) / 4, draw: () => {
      const top = (pts[0].y + pts[1].y) / 2, bot = (pts[2].y + pts[3].y) / 2;
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, tone.light); g.addColorStop(0.5, tone.mid); g.addColorStop(1, tone.dark);
      ctx.fillStyle = g; ctx.strokeStyle = tone.edge; ctx.lineWidth = 1; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    } });
  };
  const upperSeg: Segment | undefined = roleOf('chest') ? 'chest' : roleOf('upperBack') ? 'upperBack' : undefined;
  const lowerSeg: Segment | undefined = roleOf('abs') ? 'abs' : roleOf('lowerBack') ? 'lowerBack' : undefined;
  quad(j.shL, j.shR, wr, wl, toneFor(upperSeg));
  quad(wl, wr, j.hipR, j.hipL, toneFor(lowerSeg));
  taper(hpMid, waist, 0.115, 0.1, toneFor(lowerSeg), -0.006);
  taper(waist, shMid, 0.11, 0.15, toneFor(upperSeg), -0.006);

  // Beine
  for (const side of ['L', 'R'] as const) {
    const hip = j[`hip${side}` as 'hipL'], kn = j[`kn${side}` as 'knL'], an = j[`an${side}` as 'anL'], toe = j[`toe${side}` as 'toeL'], heel = j[`heel${side}` as 'heelL'];
    part(hip, kn, 0.112, 0.074, 'thighs', [0.08, 0.95, 1.14]);
    part(kn, an, 0.066, 0.042, 'calves', [0.04, 0.62, 1.26]);
    taper(an, toe, 0.036, 0.028, T.body);
    taper(an, heel, 0.036, 0.03, T.body);
    sphere(hip, roleOf('glutes') ? 0.105 : 0.092, toneFor('glutes'), -0.01);
    sphere(kn, 0.062, T.body, -0.004);
  }
  // Arme
  for (const side of ['L', 'R'] as const) {
    const sh = j[`sh${side}` as 'shL'], el = j[`el${side}` as 'elL'], wr2 = j[`wr${side}` as 'wrL'], hd = j[`hand${side}` as 'handL'];
    part(sh, el, 0.07, 0.054, 'upperArms', [0.12, 0.92, 1.18]);
    part(el, wr2, 0.054, 0.036, 'forearms', [0.06, 0.8, 1.16]);
    taper(wr2, hd, 0.034, 0.026, T.body);
    sphere(sh, roleOf('shoulders') ? 0.1 : 0.082, toneFor('shoulders'), -0.01);
    sphere(el, 0.046, T.body, -0.004);
  }
  taper(j.chest, j.neckTop, 0.06, 0.05, T.body);
  sphere(j.head, 0.105, T.body, 0);
  // kurze dunkle Haare und dunkle Shorts
  const HAIR = toneOf('#3b2a22'), SHORTS = toneOf('#2a2d34');
  sphere([j.head[0], j.head[1] + 0.045, j.head[2] - 0.012], 0.1, HAIR, -0.004);
  for (const side of ['L', 'R'] as const) {
    const hip = j[`hip${side}` as 'hipL'], kn = j[`kn${side}` as 'knL'];
    taper(hip, lerp3(hip, kn, 0.46), 0.122, 0.104, SHORTS, -0.012);
  }
  taper(hpMid, waist, 0.125, 0.11, SHORTS, -0.012);

  // Hilfsmittel
  const H: PropHelpers = {
    line: (a, b, wpx, color = c.prop, bias = 0) => {
      const pa = P(a), pb = P(b);
      items.push({ depth: (pa.depth + pb.depth) / 2 + bias, draw: () => {
        ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = wpx;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      } });
    },
    poly: (pts, fill, bias = 0) => {
      const q = pts.map(P);
      items.push({ depth: q.reduce((sum, v) => sum + v.depth, 0) / q.length + bias, draw: () => {
        ctx.fillStyle = fill; ctx.strokeStyle = c.propDark; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); for (const v of q.slice(1)) ctx.lineTo(v.x, v.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      } });
    },
    P,
    c,
  };
  for (const prop of p.props) drawProp(H, prop, j, pose, p);

  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) it.draw();
}


interface PropHelpers {
  line: (a: V3, b: V3, wpx: number, color?: string, bias?: number) => void;
  poly: (pts: V3[], fill: string, bias?: number) => void;
  P: (v: V3) => { x: number; y: number; s: number; depth: number };
  c: Colors;
}

function ring(center: V3, axis: 'x' | 'y' | 'z', r: number, n = 16): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    pts.push(axis === 'x' ? [center[0], center[1] + ca, center[2] + sa] : axis === 'y' ? [center[0] + ca, center[1], center[2] + sa] : [center[0] + ca, center[1] + sa, center[2]]);
  }
  return pts;
}
const box = (h: PropHelpers, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, fill: string) => {
  // sechs Flächen, hinten zuerst (Tiefenordnung übernimmt die Sortierung grob)
  const v = (x: number, y: number, z: number): V3 => [x, y, z];
  const faces: V3[][] = [
    [v(x0, y1, z0), v(x1, y1, z0), v(x1, y1, z1), v(x0, y1, z1)], // oben
    [v(x0, y0, z0), v(x1, y0, z0), v(x1, y1, z0), v(x0, y1, z0)], // hinten
    [v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], // vorn
    [v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0)], // links
    [v(x1, y0, z0), v(x1, y0, z1), v(x1, y1, z1), v(x1, y1, z0)], // rechts
  ];
  for (const f of faces) h.poly(f, fill, 0.05);
};

/** Gewichtsblock: gestapelte Platten, eine mit Stift (Orange) markiert; top = Oberkante */
function weightStack(h: PropHelpers, c: Colors, z: number, top: number, pinned: number) {
  const n = 11, ph = 0.11, gap = 0.02;
  for (let i = 0; i < n; i++) {
    const y1 = top - 0.1 - i * (ph + gap), y0 = y1 - ph;
    box(h, -0.19, 0.19, y0, y1, z - 0.13, z + 0.13, i === pinned ? c.accent2 : c.prop);
  }
  h.line([0, 0.05, z], [0, top, z], 3, c.propDark, 0.12);
}

function drawProp(h: PropHelpers, prop: Prop, j: Joints, pose: Pose, pat: Pattern) {
  const c = h.c;
  const hands = mid(j.handL, j.handR);
  const shift = j.pelvis[2];
  const plateAt = (cx: number, hy: number, hz: number, r: number) => h.poly(ring([cx, hy, hz], 'x', r), c.propDark);
  switch (prop.kind) {
    case 'barbell': {
      const a: V3 = [hands[0] - 0.62, hands[1], hands[2]], b: V3 = [hands[0] + 0.62, hands[1], hands[2]];
      h.line(a, b, 5, c.prop, -0.02);
      for (const x of [-0.56, -0.5, 0.5, 0.56]) plateAt(hands[0] + x, hands[1], hands[2], 0.16 - Math.abs(Math.abs(x) - 0.53) * 0.4);
      break;
    }
    case 'dumbbells':
      for (const hd of [j.handL, j.handR]) {
        h.line([hd[0] - 0.07, hd[1], hd[2]], [hd[0] + 0.07, hd[1], hd[2]], 5, c.prop, -0.02);
        plateAt(hd[0] - 0.07, hd[1], hd[2], 0.065); plateAt(hd[0] + 0.07, hd[1], hd[2], 0.065);
      }
      break;
    case 'kettlebell': {
      const k: V3 = [hands[0], hands[1] - 0.06, hands[2]];
      h.poly(ring(k, 'x', 0.11), c.propDark, -0.02);
      h.poly(ring(k, 'y', 0.11), c.prop, -0.02);
      h.line([k[0], k[1] + 0.09, k[2] - 0.03], [k[0], k[1] + 0.09, k[2] + 0.03], 4, c.propDark, -0.03);
      break;
    }
    case 'bench': {
      const angle = prop.angle ?? 0;
      const y = (pat.anchor && pat.anchor.on === 'surface' ? pat.anchor.y : 0.42);
      if (pat.id === 'dbrow') {
        box(h, -0.16, 0.16, 0.31, 0.38, 0.2, 0.8, c.prop);
        h.line([-0.12, 0, 0.25], [-0.12, y - 0.07, 0.25], 4, c.propDark); h.line([0.12, 0, 0.7], [0.12, y - 0.07, 0.7], 4, c.propDark);
        break;
      }
      if (pat.id === 'legcurl') { box(h, -0.16, 0.16, y - 0.08, y, shift - 0.35, shift + 0.55, c.prop); break; }
      if (pat.id === 'glute') { box(h, -0.22, 0.22, 0, 0.4, shift - 0.62, shift - 0.38, c.prop); break; }
      if (pat.id === 'backext') { box(h, -0.2, 0.2, 0.45, 0.62, shift - 0.12, shift + 0.14, c.prop); h.line([0, 0, shift - 0.3], [0, 0.45, shift - 0.3], 5, c.propDark); h.line([0, 0, shift + 0.1], [0, 0.45, shift + 0.1], 5, c.propDark); break; }
      const seatLen = 0.35, backLen = 0.85, a = (angle * Math.PI) / 180;
      box(h, -0.16, 0.16, y - 0.07, y, shift, shift + seatLen, c.prop);
      const back0: V3 = [0, y, shift];
      const back1: V3 = [0, y + Math.sin(a) * backLen, shift - Math.cos(a) * backLen];
      h.poly([[-0.16, back0[1], back0[2]], [0.16, back0[1], back0[2]], [0.16, back1[1], back1[2]], [-0.16, back1[1], back1[2]]], c.prop, 0.05);
      for (const z of [shift + 0.05, shift - 0.35]) h.line([0, 0, z], [0, y - 0.07, z], 5, c.propDark);
      break;
    }
    case 'seat': {
      const y = pat.anchor && pat.anchor.on === 'surface' ? pat.anchor.y : 0.42;
      const back = ((prop.back ?? 0) * Math.PI) / 180;
      box(h, -0.2, 0.2, y - 0.07, y, shift - 0.22, shift + 0.22, c.prop);
      const b0: V3 = [0, y, shift - 0.22];
      const b1: V3 = [0, y + Math.cos(back) * 0.8, shift - 0.22 - Math.sin(back) * 0.8];
      h.poly([[-0.2, b0[1], b0[2]], [0.2, b0[1], b0[2]], [0.2, b1[1], b1[2]], [-0.2, b1[1], b1[2]]], c.prop, 0.05);
      h.line([0, 0, shift], [0, y - 0.07, shift], 6, c.propDark);
      h.line([-0.25, 0, shift - 0.2], [0.25, 0, shift - 0.2], 5, c.propDark);
      break;
    }
    case 'plate': {
      const f = mid(j.toeL, j.toeR);
      const tilt = 0.5;
      h.poly([[-0.34, f[1] - tilt * 0.4, f[2] + 0.02], [0.34, f[1] - tilt * 0.4, f[2] + 0.02], [0.34, f[1] + tilt * 0.4, f[2] + 0.02], [-0.34, f[1] + tilt * 0.4, f[2] + 0.02]], c.prop, -0.1);
      h.line([-0.3, 0, shift - 0.5], [-0.3, 0.5, f[2] + 0.6], 4, c.propDark); h.line([0.3, 0, shift - 0.5], [0.3, 0.5, f[2] + 0.6], 4, c.propDark);
      break;
    }
    case 'cable': {
      // Kabelturm: Rahmen, Umlenkrolle, Gewichtsblock dahinter, Kabel zu den Händen
      const from: V3 = [prop.from[0], prop.from[1], pat.id === 'seatedrow' ? prop.from[2] : shift + prop.from[2]];
      const zf = from[2];
      for (const x of [-0.3, 0.3]) h.line([x, 0, zf], [x, 2.3, zf], 7, c.propDark, 0.1);
      h.line([-0.3, 2.3, zf], [0.3, 2.3, zf], 7, c.propDark, 0.1);
      h.line([-0.3, 0.03, zf - 0.55], [-0.3, 0.03, zf + 0.25], 6, c.propDark, 0.1); h.line([0.3, 0.03, zf - 0.55], [0.3, 0.03, zf + 0.25], 6, c.propDark, 0.1);
      weightStack(h, c, zf - 0.34, 2.05, 5);
      h.line([0, 2.3, zf - 0.34], [0, 2.3, zf], 2, c.propDark, 0.05);
      h.line(from, hands, 2.5, c.propDark, -0.05);
      h.poly(ring(from, 'x', 0.07, 14), c.prop, -0.06);
      h.poly(ring([from[0] - 0.04, from[1], from[2]], 'x', 0.025, 8), c.propDark, -0.07);
      break;
    }
    case 'stack': {
      // Maschine: Gewichtsblock mit Rahmen hinter dem Sitz; optional Druckhebel zu den Händen
      const z = shift - 0.62 - (prop.dz ?? 0);
      for (const x of [-0.32, 0.32]) h.line([x, 0, z], [x, 1.95, z], 7, c.propDark, 0.1);
      h.line([-0.32, 1.95, z], [0.32, 1.95, z], 7, c.propDark, 0.1);
      weightStack(h, c, z, 1.7, 0);
      if (prop.lever) {
        for (const hd of [j.handL, j.handR]) { h.line([hd[0] * 1.1, 1.18, shift - 0.3], hd, 5, c.prop, -0.04); h.poly(ring([hd[0] * 1.1, 1.18, shift - 0.3], 'x', 0.035, 8), c.propDark, -0.05); }
      }
      break;
    }
    case 'bar': {
      const z = shift;
      h.line([-0.55, prop.y, z], [0.55, prop.y, z], 6, c.prop, -0.03);
      h.line([-0.55, 0, z], [-0.55, prop.y, z], 5, c.propDark); h.line([0.55, 0, z], [0.55, prop.y, z], 5, c.propDark);
      break;
    }
    case 'pullbar': {
      h.line([hands[0] - 0.5, hands[1], hands[2]], [hands[0] + 0.5, hands[1], hands[2]], 5, c.prop, -0.02);
      const top: V3 = [0, 2.35, shift + 0.1];
      h.line(top, hands, 2.5, c.propDark, -0.05);
      h.line([-0.5, 2.35, shift + 0.1], [0.5, 2.35, shift + 0.1], 6, c.prop);
      h.line([-0.5, 0, shift + 0.1], [-0.5, 2.35, shift + 0.1], 5, c.propDark); h.line([0.5, 0, shift + 0.1], [0.5, 2.35, shift + 0.1], 5, c.propDark);
      break;
    }
    case 'dipbars': {
      const z0 = shift - 0.35, z1 = shift + 0.35;
      for (const x of [-0.24, 0.24]) {
        h.line([x, prop.y, z0], [x, prop.y, z1], 6, c.prop);
        h.line([x, 0, z0], [x, prop.y, z0], 5, c.propDark); h.line([x, 0, z1], [x, prop.y, z1], 5, c.propDark);
      }
      break;
    }
    case 'step':
      box(h, -0.25, 0.25, -0.1, 0, shift - 0.05, shift + 0.45, c.prop);
      break;
    case 'treadmill':
      box(h, -0.25, 0.25, -0.08, 0, shift - 0.6, shift + 0.6, c.prop);
      h.line([-0.28, 0, shift + 0.55], [-0.28, 1.0, shift + 0.55], 4, c.propDark); h.line([0.28, 0, shift + 0.55], [0.28, 1.0, shift + 0.55], 4, c.propDark);
      break;
    case 'bike': {
      const sad: V3 = [0, 0.86, shift - 0.04], bb: V3 = [0, 0.27, shift + 0.2], bar: V3 = [0, 1.0, shift + 0.6];
      h.poly(ring([0, bb[1], bb[2]], 'x', 0.17, 16), c.propDark, 0.08);
      h.line(sad, bb, 5, c.prop); h.line(bb, bar, 5, c.prop); h.line(sad, bar, 4, c.prop);
      h.line([-0.07, sad[1], sad[2]], [0.07, sad[1], sad[2]], 7, c.propDark);
      h.line([-0.2, bar[1], bar[2]], [0.2, bar[1], bar[2]], 5, c.propDark);
      for (const z of [shift - 0.45, shift + 0.8]) h.poly(ring([0, 0.33, z], 'x', 0.33, 22), 'rgba(0,0,0,0)', 0.2);
      break;
    }
    case 'erg': {
      h.line([0, 0.2, shift - 0.8], [0, 0.2, shift + 1.0], 6, c.prop);
      h.poly(ring([0, 0.4, shift + 1.05], 'x', 0.22, 18), c.propDark);
      h.line(hands, [0, 0.4, shift + 1.0], 2.5, c.propDark);
      break;
    }
    case 'rope': {
      const pl = hands;
      h.line([j.wrL[0], j.wrL[1], j.wrL[2]], [j.wrL[0] - 0.12, 0.02, j.wrL[2] + 0.02], 2, c.prop);
      h.line([j.wrR[0], j.wrR[1], j.wrR[2]], [j.wrR[0] + 0.12, 0.02, j.wrR[2] + 0.02], 2, c.prop);
      h.line([-0.12 + j.wrL[0], 0.02, pl[2] + 0.02], [0.12 + j.wrR[0], 0.02, pl[2] + 0.02], 2, c.prop);
      break;
    }
  }
  void pose; void LEN;
}
