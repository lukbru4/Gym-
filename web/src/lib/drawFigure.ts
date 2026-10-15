// Zeichnet die 3D-Figur und ihre Hilfsmittel auf eine Canvas-Fläche (2D-Kontext mit eigener Perspektive).
import { LEN, NEUTRAL, poseAt, project, solve, type Camera, type Joints, type Pose, type V3 } from './rig';
import type { Pattern, Prop, Segment } from './animations';
import { boundsKit, makeKit, MAT, type Kit, type KitTheme } from './gymKit';
import { drawMachine, weightTower } from './machines';

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
  // Geräte gehören mit ins Bild: ihre Punkte werden ohne Zeichnen gesammelt
  const pts: V3[] = [];
  for (const u of [0, 0.5]) {
    const pose = { ...NEUTRAL, ...patternPose(p, u) };
    const jj = solve(pose, p.anchor);
    for (const prop of p.props) drawProp(boundsKit(pts), prop, jj, pose, p);
  }
  for (const v of pts) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], v[i]); max[i] = Math.max(max[i], v[i]); }
  const target: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2 + 0.05, (min[2] + max[2]) / 2];
  const size = Math.max(max[1] - min[1], (max[2] - min[2]) * 0.9, (max[0] - min[0]) * 0.75, 1.3) * 1.12;
  return { target, size };
}

const boundsCache = new Map<string, { min: V3; max: V3 }>();
/** Nur das Gerät (ohne Figur) in echten Metern: kleinste und größte Ecke – für maßstabsgetreue Darstellung */
export function propBounds(p: Pattern): { min: V3; max: V3 } {
  const hit = boundsCache.get(p.id);
  if (hit) return hit;
  const pts: V3[] = [];
  const pose = { ...NEUTRAL, ...patternPose(p, 0) };
  const jj = solve(pose, p.anchor);
  for (const prop of p.props) drawProp(boundsKit(pts), prop, jj, pose, p);
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const v of pts) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], v[i]); max[i] = Math.max(max[i], v[i]); }
  const out = pts.length ? { min, max } : { min: [-0.3, 0, -0.3] as V3, max: [0.3, 0.6, 0.3] as V3 };
  boundsCache.set(p.id, out);
  return out;
}

interface Item { depth: number; draw: () => void }

export type Focus = Map<Segment, 'p' | 's'>;

/** opts.figure = false: nur das Gerät zeichnen (z. B. für „Mein Gym“); opts.theme = 'vintage': Holz/Leder/Messing */
export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, p: Pattern, u: number, cam: Camera, hi: Focus, c: Colors, opts: { figure?: boolean; theme?: KitTheme } = {}) {
  ctx.clearRect(0, 0, w, h);
  const pose = { ...NEUTRAL, ...patternPose(p, u) };
  const j = solve(pose, p.anchor);
  const P = (v: V3) => project(v, cam, w, h);
  const items: Item[] = [];

  // Boden: Gummimatte mit weichem Schatten unter Figur und Gerät (statt Gitter) – ohne Figur (Gym-Raum) kein Bodenfleck
  if (opts.figure !== false) {
    const fc = P([cam.target[0], 0, cam.target[2]]);
    const fr = 1.5 * fc.s, fy = fr * 0.32;
    const fg = ctx.createRadialGradient(fc.x, fc.y, 1, fc.x, fc.y, fr);
    fg.addColorStop(0, 'rgba(70,74,82,0.22)'); fg.addColorStop(0.7, 'rgba(70,74,82,0.10)'); fg.addColorStop(1, 'rgba(70,74,82,0)');
    ctx.fillStyle = fg;
    ctx.save(); ctx.translate(fc.x, fc.y); ctx.scale(1, fy / fr); ctx.translate(-fc.x, -fc.y);
    ctx.beginPath(); ctx.arc(fc.x, fc.y, fr, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const sc = P([j.pelvis[0], 0, (j.pelvis[2] + (j.toeL[2] + j.toeR[2]) / 2) / 2]);
    const rx = 0.55 * sc.s, ry = 0.17 * sc.s;
    const sh = ctx.createRadialGradient(sc.x, sc.y, 1, sc.x, sc.y, rx);
    sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.save(); ctx.translate(sc.x, sc.y); ctx.scale(1, ry / rx); ctx.translate(-sc.x, -sc.y);
    ctx.beginPath(); ctx.arc(sc.x, sc.y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // ---- Figur: verjüngte, schattierte Körperteile mit Muskelbäuchen ----
  // Menschliche Figur: Hautton, dunkles Shirt, Shorts, helle Schuhe (Muskeln werden rot darübergelegt)
  const SKIN: Tone = { light: '#f0c9ad', mid: '#d9a585', dark: '#a8735a', edge: '#8a5c46' }, SHIRT = toneOf('#3b4554'), SHOE = toneOf('#4b525e'), SOLE = toneOf('#eceef1'), SHORTS_T = toneOf('#2a2d34');
  const T = { ...tones(c), body: SKIN };
  const roleOf = (seg?: Segment) => (seg ? hi.get(seg) : undefined);
  const toneFor = (seg?: Segment): Tone => (roleOf(seg) === 'p' ? T.primary : roleOf(seg) === 's' ? T.secondary : T.body);
  const lerp3 = (a2: V3, b2: V3, t: number): V3 => [a2[0] + (b2[0] - a2[0]) * t, a2[1] + (b2[1] - a2[1]) * t, a2[2] + (b2[2] - a2[2]) * t];
  const LIGHT = [-0.55, -0.83];
  const taper = (a2: V3, b2: V3, ra: number, rb: number, tone: Tone, bias = 0, caps = true) => {
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
        // Gelenk-Enden mit derselben Schattierung wie das Glied → durchgehender Arm/Bein statt Kugelgelenk
        if (caps) for (const [q, r] of [[pa, r1], [pb, r2]] as const) {
          const cg = ctx.createLinearGradient(q.x + nx * sgn * r, q.y + ny * sgn * r, q.x - nx * sgn * r, q.y - ny * sgn * r);
          cg.addColorStop(0, tone.light); cg.addColorStop(0.45, tone.mid); cg.addColorStop(1, tone.dark);
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(pa.x + nx * r1, pa.y + ny * r1); ctx.lineTo(pb.x + nx * r2, pb.y + ny * r2);
        ctx.moveTo(pa.x - nx * r1, pa.y - ny * r1); ctx.lineTo(pb.x - nx * r2, pb.y - ny * r2); ctx.stroke();
        ctx.globalAlpha = 1;
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
  const shirtOr = (seg?: Segment) => (seg && roleOf(seg) ? toneFor(seg) : SHIRT);
  quad(j.shL, j.shR, wr, wl, shirtOr(upperSeg));
  quad(wl, wr, j.hipR, j.hipL, shirtOr(lowerSeg));
  taper(hpMid, waist, 0.118, 0.104, shirtOr(lowerSeg), -0.006);
  taper(waist, shMid, 0.112, 0.155, shirtOr(upperSeg), -0.006);

  // Beine
  for (const side of ['L', 'R'] as const) {
    const hip = j[`hip${side}` as 'hipL'], kn = j[`kn${side}` as 'knL'], an = j[`an${side}` as 'anL'], toe = j[`toe${side}` as 'toeL'], heel = j[`heel${side}` as 'heelL'];
    part(hip, kn, 0.112, 0.074, 'thighs', [0.08, 0.95, 1.14]);
    part(kn, an, 0.066, 0.042, 'calves', [0.04, 0.62, 1.26]);
    // Schuhe mit dunkler Sohle
    // Schuh: helle Sohle unten, dunkles Obermaterial, vorne flacher als an der Ferse
    taper(lerp3(heel, an, -0.1), toe, 0.034, 0.03, SOLE, 0.004);
    taper(an, toe, 0.05, 0.036, SHOE, -0.002);
    taper(an, heel, 0.05, 0.044, SHOE, -0.002);
    if (roleOf('glutes')) sphere(hip, 0.1, toneFor('glutes'), -0.01);
    else sphere(hip, 0.07, SHORTS_T, -0.004);
  }
  // Arme
  for (const side of ['L', 'R'] as const) {
    const sh = j[`sh${side}` as 'shL'], el = j[`el${side}` as 'elL'], wr2 = j[`wr${side}` as 'wrL'], hd = j[`hand${side}` as 'handL'];
    part(sh, el, 0.07, 0.054, 'upperArms', [0.12, 0.92, 1.18]);
    part(el, wr2, 0.054, 0.036, 'forearms', [0.06, 0.8, 1.16]);
    taper(wr2, hd, 0.034, 0.03, T.body);
    sphere(hd, 0.034, T.body, -0.006);
    // kurzer Ärmel über der Schulter
    taper(sh, lerp3(sh, el, 0.4), 0.08, 0.07, roleOf('shoulders') ? toneFor('shoulders') : SHIRT, -0.006, false);
    sphere(sh, roleOf('shoulders') ? 0.088 : 0.072, roleOf('shoulders') ? toneFor('shoulders') : SHIRT, -0.01);
  }
  taper(j.chest, j.neckTop, 0.068, 0.056, T.body);
  sphere(j.head, 0.105, T.body, 0);
  // kurze dunkle Haare und dunkle Shorts
  const HAIR = toneOf('#3b2a22'), SHORTS = toneOf('#2a2d34');
  sphere([j.head[0], j.head[1] + 0.045, j.head[2] - 0.012], 0.1, HAIR, -0.004);
  for (const side of ['L', 'R'] as const) {
    const hip = j[`hip${side}` as 'hipL'], kn = j[`kn${side}` as 'knL'];
    taper(hip, lerp3(hip, kn, 0.46), 0.118, 0.1, SHORTS, -0.012, false);
  }
  taper(hpMid, lerp3(hpMid, waist, 0.6), 0.13, 0.118, SHORTS, -0.012, false);

  // Hilfsmittel und Geräte (realistische Bausteine aus gymKit)
  if (opts.figure === false) items.length = 0;
  const kit = makeKit(ctx, P, items, cam, opts.theme);
  for (const prop of p.props) drawProp(kit, prop, j, pose, p);

  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) it.draw();
}



const mid3 = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
const seatOf = (pat: Pattern) => (pat.anchor && pat.anchor.on === 'surface' ? pat.anchor.y : 0.42);

/** Langhantel: verchromte Stange mit Hülsen, Scheiben und Klemmen */
function barbell(k: Kit, center: V3, half = 0.62, plates = 2, plateR = 0.2) {
  k.tube([center[0] - half, center[1], center[2]], [center[0] + half, center[1], center[2]], 0.014, MAT.chrome, -0.02);
  for (const sx of [-1, 1]) {
    const sleeve = center[0] + sx * (half - 0.2);
    k.tube([sleeve, center[1], center[2]], [center[0] + sx * (half + 0.08), center[1], center[2]], 0.024, MAT.chrome, -0.02);
    for (let i = 0; i < plates; i++) k.disc([sleeve + sx * (0.04 + i * 0.05), center[1], center[2]], X, i === 0 ? plateR : plateR * 0.8, 0.04, MAT.plate, -0.02);
    k.tube([sleeve + sx * (0.04 + plates * 0.05), center[1], center[2]], [sleeve + sx * (0.07 + plates * 0.05), center[1], center[2]], 0.032, MAT.red, -0.03);
  }
}
/** Kurzhantel: Griff mit runden Gewichten */
function dumbbell(k: Kit, h: V3) {
  k.tube([h[0] - 0.07, h[1], h[2]], [h[0] + 0.07, h[1], h[2]], 0.016, MAT.chrome, -0.03);
  for (const sx of [-1, 1]) k.disc([h[0] + sx * 0.1, h[1], h[2]], X, 0.065, 0.06, MAT.plate, -0.03, 0);
}
/** Hantelbank mit Rahmen; für Bankdrücken mit Ablage-Ständern */
function benchProp(k: Kit, j: Joints, pat: Pattern, angle: number) {
  const y = seatOf(pat);
  const p = j.pelvis;
  if (pat.id === 'dbrow') {
    k.pad([0, 0.42, 0.5], X, Y, Z, 0.16, 0.04, 0.32, 0.35);
    for (const z of [0.25, 0.75]) k.tube([0, 0.05, z], [0, 0.38, z], 0.035, MAT.frame, 0.05);
    k.tube([0, 0.04, 0.15], [0, 0.04, 0.85], 0.035, MAT.frame, 0.08);
    return;
  }
  if (pat.id === 'glute') {
    k.pad([0, 0.42, p[2] - 0.5], X, Y, Z, 0.32, 0.04, 0.13, 0.35);
    k.aabb(-0.28, 0.28, 0.04, 0.38, p[2] - 0.6, p[2] - 0.4, MAT.frame, 0.03);
    return;
  }
  if (pat.id === 'backext') {
    k.pad([0, 0.62, p[2] + 0.01], X, norm2([0, 1, -0.6]), norm2([0, 0.6, 1]), 0.2, 0.05, 0.13, 0.35);
    for (const z of [p[2] - 0.25, p[2] + 0.12]) k.tube([0, 0.04, z], [0, 0.56, z], 0.04, MAT.frame, 0.05);
    k.tube([0, 0.04, p[2] - 0.5], [0, 0.04, p[2] + 0.4], 0.04, MAT.frame, 0.08);
    return;
  }
  const a = (angle * Math.PI) / 180;
  // Sitzteil und Lehne als Polster
  k.pad([0, y - 0.045, p[2] + 0.2], X, Y, Z, 0.15, 0.045, 0.22, 0.35);
  const dir: V3 = [0, Math.sin(a), -Math.cos(a)];
  const up: V3 = [0, Math.cos(a), Math.sin(a)];
  k.pad([0, y - 0.045 + dir[1] * 0.45 + (angle ? 0.02 : 0), p[2] + dir[2] * 0.45 - 0.02], X, up, dir, 0.15, 0.045, 0.45, 0.35);
  // Gestell: Füße und Mittelträger
  k.tube([0, 0.05, p[2] + 0.38], [0, y - 0.09, p[2] + 0.3], 0.035, MAT.frame, 0.05);
  k.tube([0, 0.05, p[2] - 0.6], [0, y - 0.09, p[2] - 0.45], 0.035, MAT.frame, 0.05);
  k.tube([0, 0.05, p[2] - 0.65], [0, 0.05, p[2] + 0.45], 0.035, MAT.frame, 0.08);
  for (const z of [p[2] - 0.65, p[2] + 0.42]) k.tube([-0.22, 0.03, z], [0.22, 0.03, z], 0.03, MAT.frame, 0.08);
  // Ablage-Ständer beim Bankdrücken mit Langhantel
  if ((pat.id === 'bench' || pat.id === 'incline') && pat.props.some((q) => q.kind === 'barbell')) {
    const head = j.head;
    for (const sx of [-0.55, 0.55]) {
      k.tube([sx, 0.04, head[2] - 0.15], [sx, 1.25, head[2] - 0.15], 0.035, MAT.frame, 0.08);
      k.aabb(sx - 0.04, sx + 0.04, 1.12, 1.16, head[2] - 0.15, head[2] - 0.05, MAT.frame, 0.07);
      k.tube([sx, 0.03, head[2] - 0.35], [sx, 0.03, head[2] + 0.05], 0.03, MAT.frame, 0.09);
    }
  }
}
const norm2 = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

function drawProp(k: Kit, prop: Prop, j: Joints, pose: Pose, pat: Pattern) {
  const hands = mid3(j.handL, j.handR);
  const shift = j.pelvis[2];
  switch (prop.kind) {
    case 'machine':
      drawMachine(prop.type, { k, j, shift, seatY: seatOf(pat), trunk: pose.trunk, from: prop.from ? [prop.from[0], prop.from[1], shift + prop.from[2]] : undefined });
      break;
    case 'barbell':
    {
      // Curl-/French-Press-Stange kurz mit kleinen Scheiben, sonst Olympia-Stange
      const short = pat.id.startsWith('curl') || pat.id === 'preacher' || pat.id === 'skull';
      barbell(k, hands, short ? 0.42 : 0.62, short ? 1 : 2, short ? 0.12 : 0.2);
    }
      break;
    case 'dumbbells':
      dumbbell(k, j.handL); dumbbell(k, j.handR);
      break;
    case 'kettlebell': {
      const c: V3 = [hands[0], hands[1] - 0.12, hands[2]];
      k.ball(c, 0.1, MAT.plate, -0.02);
      k.tube([c[0] - 0.06, hands[1], c[2]], [c[0] + 0.06, hands[1], c[2]], 0.016, MAT.plate, -0.03);
      for (const sx of [-1, 1]) k.tube([c[0] + sx * 0.06, hands[1], c[2]], [c[0] + sx * 0.07, c[1] + 0.06, c[2]], 0.016, MAT.plate, -0.03);
      break;
    }
    case 'bench':
      benchProp(k, j, pat, prop.angle ?? 0);
      break;
    case 'seat': {
      // einfache Hantelbank mit senkrechter Lehne (sitzende Übungen mit freien Gewichten)
      const y = seatOf(pat);
      k.pad([0, y - 0.045, shift + 0.05], X, Y, Z, 0.17, 0.045, 0.2, 0.35);
      k.pad([0, y + 0.42, shift - 0.2], X, Y, Z, 0.16, 0.4, 0.04, 0.35);
      k.tube([0, 0.05, shift + 0.05], [0, y - 0.09, shift + 0.05], 0.035, MAT.frame, 0.05);
      k.tube([0, 0.05, shift - 0.3], [0, y + 0.3, shift - 0.25], 0.035, MAT.frame, 0.06);
      k.tube([0, 0.04, shift - 0.45], [0, 0.04, shift + 0.35], 0.035, MAT.frame, 0.08);
      break;
    }
    case 'cable':
      drawMachine('cabletower', { k, j, shift, seatY: seatOf(pat), trunk: pose.trunk, from: [prop.from[0], prop.from[1], pat.id === 'seatedrow' ? prop.from[2] : shift + prop.from[2]] });
      break;
    case 'stack':
      weightTower(k, 0, prop.front ? shift + 0.7 + (prop.dz ?? 0) : shift - 0.62 - (prop.dz ?? 0), 1.9, 0.05);
      break;
    case 'plate':
      drawMachine('legpress', { k, j, shift, seatY: seatOf(pat), trunk: pose.trunk });
      break;
    case 'pecpads':
      drawMachine('pecdeck', { k, j, shift, seatY: seatOf(pat), trunk: pose.trunk });
      break;
    case 'legpad':
    case 'kneepad':
      break;
    case 'pullbar':
      drawMachine('latpull', { k, j, shift, seatY: seatOf(pat), trunk: pose.trunk });
      break;
    case 'bar': {
      const z = shift;
      k.tube([-0.6, prop.y, z], [0.6, prop.y, z], 0.018, MAT.chrome, -0.03);
      for (const sx of [-0.62, 0.62]) {
        k.tube([sx, 0.04, z], [sx, prop.y + 0.05, z], 0.045, MAT.frame, 0.06);
        k.tube([sx, 0.04, z - 0.4], [sx, 0.04, z + 0.4], 0.04, MAT.frame, 0.08);
      }
      break;
    }
    case 'dipbars': {
      const z0 = shift - 0.35, z1 = shift + 0.35;
      for (const x of [-0.26, 0.26]) {
        k.tube([x, prop.y, z0], [x, prop.y, z1], 0.022, MAT.grip, -0.02);
        k.tube([x, 0.04, z0], [x, prop.y, z0], 0.04, MAT.frame, 0.05);
        k.tube([x, 0.04, z1], [x, prop.y, z1], 0.04, MAT.frame, 0.05);
        k.tube([x, 0.04, z0 - 0.15], [x, 0.04, z1 + 0.15], 0.04, MAT.frame, 0.08);
      }
      break;
    }
    case 'step':
      k.aabb(-0.28, 0.28, 0, 0.1, shift - 0.08, shift + 0.42, MAT.rubber, 0.02);
      break;
    case 'treadmill':
      k.aabb(-0.32, 0.32, 0, 0.1, shift - 0.75, shift + 0.75, MAT.frame, 0.06);
      k.aabb(-0.26, 0.26, 0.1, 0.11, shift - 0.7, shift + 0.7, MAT.rubber, 0.05);
      for (const sx of [-0.3, 0.3]) k.tube([sx, 0.1, shift + 0.7], [sx, 1.15, shift + 0.6], 0.03, MAT.frame, 0.04);
      k.aabb(-0.3, 0.3, 1.1, 1.22, shift + 0.55, shift + 0.68, MAT.frame, 0.03);
      break;
    case 'bike': {
      const sad: V3 = [0, 0.86, shift - 0.04], bb: V3 = [0, 0.27, shift + 0.2], bar: V3 = [0, 1.0, shift + 0.6];
      k.disc([0, 0.38, shift + 0.55], X, 0.3, 0.06, MAT.frame, 0.06);
      k.tube(sad, bb, 0.03, MAT.frame, 0.02); k.tube(bb, bar, 0.03, MAT.frame, 0.02); k.tube([0, 0.04, shift - 0.3], [0, 0.04, shift + 0.8], 0.035, MAT.frame, 0.06);
      k.box(sad, X, Y, Z, 0.07, 0.025, 0.12, MAT.pad, -0.01);
      k.tube([-0.22, bar[1], bar[2]], [0.22, bar[1], bar[2]], 0.02, MAT.grip, -0.01);
      break;
    }
    case 'erg': {
      k.tube([0, 0.2, shift - 0.9], [0, 0.2, shift + 1.0], 0.035, MAT.chrome, 0.05);
      k.box([0, 0.24, shift], X, Y, Z, 0.13, 0.03, 0.15, MAT.pad, 0.0);
      k.disc([0, 0.45, shift + 1.1], X, 0.26, 0.12, MAT.frame, 0.05);
      k.cable(hands, [0, 0.45, shift + 1.05], -0.02);
      k.tube(add3(hands, [-0.15, 0, 0]), add3(hands, [0.15, 0, 0]), 0.018, MAT.grip, -0.03);
      break;
    }
    case 'rope': {
      for (const [w, sx] of [[j.wrL, -1], [j.wrR, 1]] as const) k.cable(w, [w[0] + sx * 0.12, 0.02, w[2] + 0.02], -0.01);
      k.cable([j.wrL[0] - 0.12, 0.02, hands[2] + 0.02], [j.wrR[0] + 0.12, 0.02, hands[2] + 0.02], -0.01);
      break;
    }
  }
  void LEN;
}
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
