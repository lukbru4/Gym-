// Gezeichnete Bilder für Gerichte (Teller von oben): Aus den Zutaten eines Gerichts entsteht eine SVG-Illustration –
// Reis, Nudeln, Brokkoli, Hähnchen … liegen so auf dem Teller, wie man das Gericht anrichtet.
// Besondere Gerichte (Pizza, Burger, Suppe, Wrap, Getränke, Süßes …) haben eine eigene Form.
// Alles läuft offline und ist für dasselbe Gericht immer gleich (Zufall mit fester Saat).
import type { Dish } from './dishes';

type R = () => number;
const rngOf = (seed: string): R => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const f = (n: number) => Math.round(n * 10) / 10;
const TAU = Math.PI * 2;

// ---------- Grundformen ----------
const circ = (x: number, y: number, r: number, fill: string, stroke = '', sw = 1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const ell = (x: number, y: number, rx: number, ry: number, rot: number, fill: string, stroke = '', sw = 1) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const rrect = (x: number, y: number, w: number, h: number, rad: number, rot: number, fill: string, stroke = '', sw = 1) =>
  `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(rad)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const path = (d: string, fill: string, stroke = '', sw = 1, extra = '') => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"` : ''}${extra}/>`;
/** weiche, unregelmäßige Fläche (geschlossene Kurve durch zufällig verschobene Punkte) */
function blobD(cx: number, cy: number, rx: number, ry: number, R: R, noise = 0.12, n = 9) {
  const pts: [number, number][] = [];
  const off = R() * TAU;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * TAU, k = 1 + (R() * 2 - 1) * noise;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${f((pts[0][0] + pts[n - 1][0]) / 2)} ${f((pts[0][1] + pts[n - 1][1]) / 2)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    d += ` Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
  }
  return d + 'Z';
}
const blob = (cx: number, cy: number, rx: number, ry: number, R: R, fill: string, stroke = '', noise = 0.12) => path(blobD(cx, cy, rx, ry, R, noise), fill, stroke, 1.2);
/** Punkte gleichmäßig im Kreis verteilt (Sonnenblumen-Muster mit etwas Zufall) */
function spots(n: number, cx: number, cy: number, r: number, R: R): [number, number][] {
  const out: [number, number][] = [];
  const off = R() * TAU;
  for (let i = 0; i < n; i++) {
    const rr = r * Math.sqrt((i + 0.5) / n) * (0.92 + R() * 0.1), a = off + i * 2.39996 + (R() - 0.5) * 0.4;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
}
const pick = <T,>(R: R, list: T[]) => list[Math.floor(R() * list.length) % list.length];
const deg = (R: R) => R() * 360;

// ---------- Lebensmittel als Formen in einem Kreis (cx, cy, r) ----------
type Draw = (cx: number, cy: number, r: number, R: R) => string;

const mound = (fill: string, edge: string, grain?: (x: number, y: number, R: R) => string, n = 0): Draw => (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.92, R, fill, edge);
  if (grain) for (const [x, y] of spots(n, cx, cy, r * 0.82, R)) s += grain(x, y, R);
  return s;
};
const pieces = (n: number, one: (x: number, y: number, s: number, R: R) => string, fill = 0.8): Draw => (cx, cy, r, R) => {
  let s = '';
  const sz = r / Math.sqrt(n) * 1.6;
  for (const [x, y] of spots(n, cx, cy, r * fill, R)) s += one(x, y, sz, R);
  return s;
};

const RICE: Draw = mound('#f8f6ef', '#dcd5c3', (x, y, R) => ell(x, y, 2.6, 1.1, deg(R), '#fffefb', '#e2dccb', 0.6), 46);
const GRAIN = (base: string, dot: string): Draw => mound(base, '#c9b48a', (x, y) => circ(x, y, 1.2, dot), 40);
const PASTA = (base = '#f2d27c', line = '#e2b552'): Draw => (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.9, R, base, '#d7a945');
  for (let i = 0; i < 16; i++) {
    const a = R() * TAU, rr = r * (0.2 + R() * 0.6), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    const b = R() * TAU, l = r * (0.35 + R() * 0.4);
    s += path(`M${f(x)} ${f(y)} q${f(Math.cos(b) * l)} ${f(Math.sin(b) * l * 0.3)} ${f(Math.cos(b + 1) * l)} ${f(Math.sin(b + 1) * l)}`, 'none', R() < 0.5 ? line : '#fbe7a6', 2.2);
  }
  return s;
};
const SHORTPASTA: Draw = pieces(16, (x, y, s, R) => rrect(x, y, s * 0.95, s * 0.42, s * 0.2, deg(R), '#f0cc72', '#d4a443', 0.8) + path(`M${f(x - s * 0.3)} ${f(y)} h${f(s * 0.6)}`, 'none', '#d9ad55', 0.7), 0.85);
const SAUCE = (fill: string, edge: string, fleck?: string): Draw => (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.9, R, fill, edge, 0.18);
  if (fleck) for (const [x, y] of spots(12, cx, cy, r * 0.75, R)) s += circ(x, y, 1.4 + R() * 1.6, fleck);
  return s;
};
const POTATO: Draw = pieces(6, (x, y, s, R) => ell(x, y, s * 0.55, s * 0.42, deg(R), '#efd08a', '#c9a35a', 1) + circ(x - s * 0.15, y - s * 0.1, 1, '#d1ad66'), 0.75);
const MASH: Draw = (cx, cy, r, R) => blob(cx, cy, r, r * 0.9, R, '#f6e5ae', '#d9c27f') + path(`M${f(cx - r * 0.5)} ${f(cy)} q${f(r * 0.5)} ${f(-r * 0.5)} ${f(r)} 0 q${f(-r * 0.4)} ${f(r * 0.4)} ${f(-r * 0.7)} ${f(r * 0.2)}`, 'none', '#e8d08c', 2) + circ(cx + r * 0.1, cy - r * 0.05, r * 0.15, '#f7d75c');
const FRIES = (fill = '#f3c24f', edge = '#d39a2a'): Draw => (cx, cy, r, R) => {
  let s = '';
  for (let i = 0; i < 22; i++) {
    const [x, y] = spots(22, cx, cy, r * 0.75, R)[i];
    s += rrect(x, y, r * 0.55, r * 0.11, 1.2, deg(R), fill, edge, 0.8);
  }
  return s;
};
const BRATKARTOFFELN: Draw = pieces(12, (x, y, s, R) => ell(x, y, s * 0.5, s * 0.4, deg(R), '#e9b85a', '#b97f2b', 1) + ell(x + 1, y + 1, s * 0.25, s * 0.18, 0, '#c98c35'), 0.8);
const GNOCCHI: Draw = pieces(12, (x, y, s, R) => ell(x, y, s * 0.42, s * 0.3, deg(R), '#f4dc9e', '#cfae63', 0.8), 0.75);
const BREAD = (crust: string, inner: string, seeds = false): Draw => (cx, cy, r, R) => {
  let s = '';
  for (const [i, dx] of [[0, -r * 0.25], [1, r * 0.25]] as const) {
    const x = cx + dx, y = cy + (i ? r * 0.08 : -r * 0.08), w = r * 0.85, h = r * 0.95, rot = (R() - 0.5) * 30;
    s += `<g transform="rotate(${f(rot)} ${f(x)} ${f(y)})">` + path(`M${f(x - w / 2)} ${f(y + h / 2)} V${f(y - h * 0.15)} Q${f(x - w / 2)} ${f(y - h / 2)} ${f(x)} ${f(y - h / 2)} Q${f(x + w / 2)} ${f(y - h / 2)} ${f(x + w / 2)} ${f(y - h * 0.15)} V${f(y + h / 2)}Z`, inner, crust, 3);
    if (seeds) for (const [px, py] of spots(10, x, y, w * 0.32, R)) s += ell(px, py, 1.3, 0.8, deg(R), '#7a5530');
    s += '</g>';
  }
  return s;
};
const ROLL: Draw = (cx, cy, r) => circ(cx, cy, r * 0.75, '#d8a05a', '#a8692b', 1.5) + path(`M${f(cx - r * 0.45)} ${f(cy)} Q${f(cx)} ${f(cy - r * 0.15)} ${f(cx + r * 0.45)} ${f(cy)}`, 'none', '#f0cf98', 3) + circ(cx - r * 0.3, cy - r * 0.35, r * 0.18, 'rgba(255,255,255,0.18)');
const SLICES = (fill: string, edge: string, mark?: string, n = 5): Draw => (cx, cy, r, R) => {
  let s = '';
  const rot = (R() - 0.5) * 50;
  s += `<g transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})">`;
  for (let i = 0; i < n; i++) {
    const x = cx - r * 0.6 + (i / (n - 1 || 1)) * r * 1.2, w = r * 0.42, h = r * 1.05;
    s += rrect(x, cy, w, h, w * 0.45, 8, fill, edge, 1.2);
    if (mark) for (let k = -1; k <= 1; k++) s += path(`M${f(x - w * 0.35)} ${f(cy + k * h * 0.22 - 3)} l${f(w * 0.7)} 5`, 'none', mark, 1.6);
  }
  return s + '</g>';
};
const STEAK: Draw = (cx, cy, r, R) => blob(cx, cy, r * 0.95, r * 0.7, R, '#8a4a2c', '#5a2d18', 0.08) + blob(cx + r * 0.55, cy - r * 0.2, r * 0.2, r * 0.45, R, '#f1e2c8', '', 0.1) + [-1, 0, 1].map((k) => path(`M${f(cx - r * 0.6)} ${f(cy + k * r * 0.25 - 6)} l${f(r * 1.1)} 12`, 'none', '#4a2412', 2.4)).join('');
const SCHNITZEL: Draw = (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.72, R, '#e0a547', '#a8702a', 0.15);
  for (const [x, y] of spots(26, cx, cy, r * 0.8, R)) s += circ(x, y * 0.98 + cy * 0.02, 1.1, R() < 0.5 ? '#c98a32' : '#f0c26c');
  return s + LEMON(cx + r * 0.7, cy - r * 0.55, r * 0.25, R);
};
const LEMON: Draw = (cx, cy, r) => path(`M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 0 0 ${f(cx + r)} ${f(cy)}Z`, '#fbe36a', '#d9b72c', 1.2) + path(`M${f(cx)} ${f(cy)} l${f(-r * 0.6)} ${f(r * 0.6)} M${f(cx)} ${f(cy)} l0 ${f(r * 0.85)} M${f(cx)} ${f(cy)} l${f(r * 0.6)} ${f(r * 0.6)}`, 'none', '#fff6c2', 1);
const SAUSAGE = (fill = '#a5532d', edge = '#6d3015', n = 2): Draw => (cx, cy, r, R) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const y = cy + (i - (n - 1) / 2) * r * 0.5, rot = (R() - 0.5) * 20;
    s += rrect(cx, y, r * 1.6, r * 0.38, r * 0.19, rot, fill, edge, 1.2) + rrect(cx - r * 0.1, y - r * 0.07, r * 1.1, r * 0.07, 2, rot, 'rgba(255,255,255,0.25)');
  }
  return s;
};
const SALMON: Draw = (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.62, R, '#f39270', '#c8603e', 0.08);
  for (let i = -2; i <= 2; i++) s += path(`M${f(cx + i * r * 0.32 - 4)} ${f(cy - r * 0.5)} q6 ${f(r * 0.5)} 0 ${f(r)}`, 'none', '#fbd2bf', 1.6);
  return s;
};
const WHITEFISH: Draw = (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.6, R, '#f5eedf', '#cfc3a6', 0.08);
  for (let i = -2; i <= 2; i++) s += path(`M${f(cx + i * r * 0.3)} ${f(cy - r * 0.45)} q5 ${f(r * 0.45)} 0 ${f(r * 0.9)}`, 'none', '#ded2b6', 1.2);
  return s + LEMON(cx + r * 0.75, cy - r * 0.45, r * 0.22, R);
};
const BREADEDFISH: Draw = (cx, cy, r, R) => blob(cx, cy, r, r * 0.55, R, '#e3a94e', '#a8712a', 0.1) + LEMON(cx + r * 0.8, cy - r * 0.4, r * 0.22, R);
const FISHSTICKS: Draw = (cx, cy, r, R) => [0, 1, 2, 3].map((i) => rrect(cx, cy - r * 0.6 + i * r * 0.4, r * 1.3, r * 0.3, 3, (R() - 0.5) * 10, '#e8ad4c', '#b07524', 1.2)).join('');
const SHRIMP: Draw = pieces(7, (x, y, s, R) => {
  const a = deg(R);
  return `<g transform="rotate(${f(a)} ${f(x)} ${f(y)})">` + path(`M${f(x - s * 0.4)} ${f(y)} A${f(s * 0.4)} ${f(s * 0.4)} 0 1 1 ${f(x + s * 0.15)} ${f(y + s * 0.35)}`, 'none', '#f29a72', s * 0.28) + path(`M${f(x - s * 0.4)} ${f(y)} A${f(s * 0.4)} ${f(s * 0.4)} 0 1 1 ${f(x + s * 0.15)} ${f(y + s * 0.35)}`, 'none', '#fbc9a8', s * 0.08) + '</g>';
}, 0.75);
const HAM: Draw = pieces(4, (x, y, s, R) => blob(x, y, s * 0.6, s * 0.5, R, '#f4a6a6', '#d77a7f', 0.12) + blob(x + s * 0.1, y, s * 0.4, s * 0.3, R, 'none', '#f8c9c9', 0.12), 0.6);
const SALAMI: Draw = pieces(7, (x, y, s, R) => {
  let o = circ(x, y, s * 0.45, '#b6413f', '#7d2523', 1);
  for (const [px, py] of spots(5, x, y, s * 0.3, R)) o += circ(px, py, s * 0.06, '#f3d3c8');
  return o;
}, 0.75);
const BACON: Draw = (cx, cy, r) => [0, 1, 2].map((i) => {
  const y = cy - r * 0.45 + i * r * 0.45;
  return path(`M${f(cx - r * 0.8)} ${f(y)} q${f(r * 0.4)} -6 ${f(r * 0.8)} 0 t${f(r * 0.8)} 0`, 'none', '#a8403a', r * 0.22) + path(`M${f(cx - r * 0.8)} ${f(y)} q${f(r * 0.4)} -6 ${f(r * 0.8)} 0 t${f(r * 0.8)} 0`, 'none', '#f2c6b4', r * 0.06);
}).join('');
const MINCE = (fill = '#8b4a2b', edge = '#5b2c15'): Draw => pieces(30, (x, y, s, R) => blob(x, y, s * 0.42, s * 0.36, R, fill, edge, 0.3), 0.85);
const PORK: Draw = SLICES('#e7b48f', '#b77a4f', undefined, 4);
const CHICKEN: Draw = SLICES('#ebc28e', '#b98546', '#a3672d', 5);
const DRUMSTICK: Draw = (cx, cy, r) => ell(cx - r * 0.1, cy, r * 0.65, r * 0.45, -20, '#c87a35', '#8a4d1c', 1.5) + rrect(cx + r * 0.55, cy - r * 0.35, r * 0.5, r * 0.14, 4, -38, '#f3e6cc', '#c9b38a', 1) + ell(cx - r * 0.25, cy - r * 0.12, r * 0.25, r * 0.12, -20, 'rgba(255,255,255,0.22)');
const MEATBALLS: Draw = pieces(5, (x, y, s) => circ(x, y, s * 0.45, '#8f4f2d', '#5b2c15', 1.2) + circ(x - s * 0.12, y - s * 0.14, s * 0.12, 'rgba(255,255,255,0.2)'), 0.6);
const ROAST: Draw = SLICES('#9c5a3b', '#5f3019', undefined, 4);
const FRIED_EGG: Draw = (cx, cy, r, R) => blob(cx, cy, r, r * 0.85, R, '#fffdf7', '#e3dccd', 0.18) + circ(cx + r * 0.08, cy - r * 0.05, r * 0.36, '#f7b52c', '#e0951a', 1.2) + circ(cx - r * 0.02, cy - r * 0.16, r * 0.1, '#ffe09a');
const BOILED_EGG: Draw = pieces(3, (x, y, s, R) => ell(x, y, s * 0.5, s * 0.38, deg(R), '#fffdf7', '#ddd6c6', 1) + circ(x, y, s * 0.22, '#f6c13d'), 0.6);
const SCRAMBLED: Draw = pieces(12, (x, y, s, R) => blob(x, y, s * 0.55, s * 0.45, R, '#fbe17a', '#e2bf4c', 0.3), 0.8);
const LEAF = (cols: string[]): Draw => (cx, cy, r, R) => {
  let s = '';
  for (const [x, y] of spots(14, cx, cy, r * 0.82, R)) {
    const a = deg(R), l = r * (0.35 + R() * 0.15);
    s += `<g transform="rotate(${f(a)} ${f(x)} ${f(y)})">` + path(`M${f(x - l / 2)} ${f(y)} Q${f(x)} ${f(y - l * 0.45)} ${f(x + l / 2)} ${f(y)} Q${f(x)} ${f(y + l * 0.45)} ${f(x - l / 2)} ${f(y)}Z`, pick(R, cols), '#3f7a2c', 0.8) + path(`M${f(x - l / 2)} ${f(y)} H${f(x + l / 2)}`, 'none', 'rgba(255,255,255,0.35)', 0.8) + '</g>';
  }
  return s;
};
const SALAD = LEAF(['#7cc04a', '#94d05a', '#5fa83a', '#a8db6c']);
const SPINACH = LEAF(['#2f6d2a', '#3d7d33', '#285e24']);
const BROCCOLI: Draw = pieces(6, (x, y, s, R) => {
  let o = rrect(x, y + s * 0.25, s * 0.18, s * 0.4, 2, 0, '#9cc56a');
  for (const [px, py] of spots(6, x, y - s * 0.05, s * 0.3, R)) o += circ(px, py, s * 0.17, pick(R, ['#3e8a35', '#4a9a3c', '#357a2d']), '#2c6625', 0.6);
  return o;
}, 0.7);
const CAULI: Draw = pieces(5, (x, y, s, R) => spots(6, x, y, s * 0.3, R).map(([px, py]) => circ(px, py, s * 0.18, '#f4efd9', '#d6ccab', 0.6)).join(''), 0.65);
const GREENBEANS: Draw = (cx, cy, r, R) => {
  let s = '';
  for (let i = 0; i < 12; i++) {
    const [x, y] = [cx + (R() - 0.5) * r * 1.1, cy + (R() - 0.5) * r * 1.1];
    s += rrect(x, y, r * 0.75, r * 0.1, r * 0.05, 30 + (R() - 0.5) * 30, '#4f9a3a', '#356e25', 0.8);
  }
  return s;
};
const PEAS: Draw = pieces(26, (x, y, s) => circ(x, y, s * 0.33, '#6cbf4a', '#438a2c', 0.8) + circ(x - s * 0.1, y - s * 0.1, s * 0.09, '#b3e58f'), 0.85);
const CUCUMBER: Draw = pieces(7, (x, y, s, R) => circ(x, y, s * 0.42, '#d7efb7', '#3d7a2c', 2) + spots(5, x, y, s * 0.15, R).map(([px, py]) => ell(px, py, 1.2, 0.7, deg(R), '#f1fbe1')).join(''), 0.75);
const TOMATO: Draw = pieces(6, (x, y, s, R) => {
  const a = deg(R);
  return `<g transform="rotate(${f(a)} ${f(x)} ${f(y)})">` + path(`M${f(x - s * 0.45)} ${f(y + s * 0.15)} A${f(s * 0.45)} ${f(s * 0.45)} 0 0 1 ${f(x + s * 0.45)} ${f(y + s * 0.15)}Z`, '#e5432f', '#a72818', 1) + circ(x - s * 0.15, y - s * 0.02, s * 0.06, '#fbe2a2') + circ(x + s * 0.12, y - s * 0.02, s * 0.06, '#fbe2a2') + '</g>';
}, 0.72);
const PEPPER: Draw = (cx, cy, r, R) => {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const [x, y] = [cx + (R() - 0.5) * r * 1.1, cy + (R() - 0.5) * r * 1.1];
    s += path(`M${f(x - r * 0.3)} ${f(y)} q${f(r * 0.3)} ${f(-r * 0.2)} ${f(r * 0.6)} 0`, 'none', pick(R, ['#e2412c', '#f2b628', '#e2412c', '#5ea33a']), r * 0.12);
  }
  return s;
};
const CARROT: Draw = pieces(10, (x, y, s) => circ(x, y, s * 0.36, '#f2892c', '#c8611a', 1) + circ(x, y, s * 0.17, 'none', '#f7b26b', 0.8), 0.8);
const CORN: Draw = pieces(28, (x, y, s, R) => rrect(x, y, s * 0.5, s * 0.45, 1.4, deg(R), '#f6d33c', '#d6a915', 0.6), 0.8);
const ZUCCHINI: Draw = pieces(7, (x, y, s) => circ(x, y, s * 0.42, '#f1f3c8', '#4f8a32', 2.2), 0.75);
const MUSHROOM: Draw = pieces(7, (x, y, s, R) => {
  const a = deg(R);
  return `<g transform="rotate(${f(a)} ${f(x)} ${f(y)})">` + path(`M${f(x - s * 0.42)} ${f(y)} A${f(s * 0.42)} ${f(s * 0.36)} 0 0 1 ${f(x + s * 0.42)} ${f(y)}Z`, '#e3cfae', '#a8875a', 1) + rrect(x, y + s * 0.15, s * 0.22, s * 0.32, 2, 0, '#eadbc0', '#a8875a', 0.8) + '</g>';
}, 0.72);
const CABBAGE = (fill: string, line: string): Draw => (cx, cy, r, R) => {
  let s = blob(cx, cy, r, r * 0.85, R, fill, line, 0.2);
  for (let i = 0; i < 16; i++) {
    const [x, y] = [cx + (R() - 0.5) * r * 1.3, cy + (R() - 0.5) * r * 1.2];
    s += path(`M${f(x)} ${f(y)} q${f(r * 0.2)} ${f(-r * 0.1)} ${f(r * 0.4)} ${f(r * 0.05)}`, 'none', line, 1.1);
  }
  return s;
};
const ASPARAGUS = (body: string, tip: string): Draw => (cx, cy, r, R) => {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const y = cy - r * 0.55 + i * r * 0.22, rot = (R() - 0.5) * 8;
    s += rrect(cx, y, r * 1.6, r * 0.13, r * 0.06, rot, body, '#8a9a55', 0.8) + ell(cx + r * 0.78, y, r * 0.12, r * 0.08, rot, tip);
  }
  return s;
};
const AVOCADO: Draw = (cx, cy, r) => ell(cx, cy, r * 0.62, r * 0.82, -25, '#4b6b2c', '#2f4818', 1.4) + ell(cx, cy, r * 0.52, r * 0.72, -25, '#d6e58b') + ell(cx, cy, r * 0.42, r * 0.6, -25, '#c4dc6f') + circ(cx + r * 0.05, cy + r * 0.12, r * 0.24, '#8a5a32', '#5e3a1d', 1);
const CHEESE_GRATED: Draw = (cx, cy, r, R) => spots(30, cx, cy, r * 0.8, R).map(([x, y]) => rrect(x, y, 5, 1.6, 0.8, deg(R), '#f7d454', '#d9b02f', 0.4)).join('');
const PARMESAN: Draw = (cx, cy, r, R) => spots(26, cx, cy, r * 0.75, R).map(([x, y]) => circ(x, y, 1.1, '#fbf1c9')).join('');
const CHEESE_SLICE: Draw = (cx, cy, r, R) => rrect(cx, cy, r * 1.15, r * 1.0, 3, (R() - 0.5) * 20, '#f6cd4a', '#d39f1a', 1.2) + circ(cx - r * 0.2, cy - r * 0.15, r * 0.08, '#e9b62c') + circ(cx + r * 0.25, cy + r * 0.2, r * 0.06, '#e9b62c');
const MOZZA: Draw = pieces(4, (x, y, s) => circ(x, y, s * 0.42, '#fdfcf6', '#ddd8c6', 1.2), 0.6);
const FETA: Draw = pieces(8, (x, y, s, R) => rrect(x, y, s * 0.5, s * 0.5, 1.5, deg(R), '#fbfaf3', '#d8d2bf', 1), 0.7);
const TOFU: Draw = pieces(9, (x, y, s, R) => rrect(x, y, s * 0.6, s * 0.6, 2, deg(R), '#f3e3b4', '#c99b4a', 1.4), 0.75);
const HALLOUMI: Draw = SLICES('#f4e7c4', '#c9a464', '#b88a43', 3);
const CREAM_BASE = (fill: string, edge: string, swirl: string): Draw => (cx, cy, r, R) => blob(cx, cy, r, r * 0.95, R, fill, edge, 0.06) + path(`M${f(cx - r * 0.5)} ${f(cy + r * 0.1)} q${f(r * 0.5)} ${f(-r * 0.6)} ${f(r)} ${f(-r * 0.1)}`, 'none', swirl, 1.8);
const YOGURT = CREAM_BASE('#fdfbf4', '#cfc6b0', '#e6dfcd');
const OATS: Draw = (cx, cy, r, R) => blob(cx, cy, r, r * 0.95, R, '#e8d3a6', '#c4a874', 0.06) + spots(30, cx, cy, r * 0.82, R).map(([x, y]) => ell(x, y, 2.4, 1.6, deg(R), '#d8bd88', '#bfa06a', 0.5)).join('');
const BERRIES = (col: string, edge: string, hi = 'rgba(255,255,255,0.4)'): Draw => pieces(14, (x, y, s) => circ(x, y, s * 0.3, col, edge, 0.8) + circ(x - s * 0.08, y - s * 0.08, s * 0.08, hi), 0.75);
const STRAWBERRY: Draw = pieces(5, (x, y, s, R) => {
  const a = deg(R);
  return `<g transform="rotate(${f(a)} ${f(x)} ${f(y)})">` + path(`M${f(x)} ${f(y + s * 0.45)} C${f(x - s * 0.6)} ${f(y)} ${f(x - s * 0.35)} ${f(y - s * 0.4)} ${f(x)} ${f(y - s * 0.3)} C${f(x + s * 0.35)} ${f(y - s * 0.4)} ${f(x + s * 0.6)} ${f(y)} ${f(x)} ${f(y + s * 0.45)}Z`, '#e8323a', '#a71c22', 1) + spots(5, x, y, s * 0.22, R).map(([px, py]) => circ(px, py, 0.8, '#fbe27a')).join('') + '</g>';
}, 0.65);
const RASPBERRY: Draw = pieces(8, (x, y, s, R) => spots(5, x, y, s * 0.22, R).map(([px, py]) => circ(px, py, s * 0.13, '#e2457a', '#a82352', 0.5)).join(''), 0.72);
const BANANA: Draw = pieces(8, (x, y, s) => circ(x, y, s * 0.4, '#fbf0b9', '#e1cd7c', 1.2) + circ(x, y, s * 0.12, 'none', '#d9c27a', 0.7), 0.75);
const APPLE: Draw = pieces(5, (x, y, s, R) => {
  const a = deg(R);
  return `<g transform="rotate(${f(a)} ${f(x)} ${f(y)})">` + path(`M${f(x - s * 0.55)} ${f(y)} A${f(s * 0.55)} ${f(s * 0.3)} 0 0 0 ${f(x + s * 0.55)} ${f(y)}Z`, '#fbf3d7', '#c42f2f', 2) + '</g>';
}, 0.65);
const PINEAPPLE: Draw = pieces(9, (x, y, s, R) => path(`M${f(x)} ${f(y - s * 0.35)} L${f(x + s * 0.35)} ${f(y + s * 0.25)} L${f(x - s * 0.35)} ${f(y + s * 0.25)}Z`, '#f7d34a', '#d1a41d', 1, ` transform="rotate(${f(deg(R))} ${f(x)} ${f(y)})"`), 0.75);
const FRUITMIX: Draw = (cx, cy, r, R) => BANANA(cx - r * 0.3, cy - r * 0.2, r * 0.5, R) + STRAWBERRY(cx + r * 0.3, cy - r * 0.15, r * 0.45, R) + BERRIES('#3f4f9a', '#27306a')(cx, cy + r * 0.4, r * 0.4, R) + PINEAPPLE(cx - r * 0.35, cy + r * 0.35, r * 0.35, R);
const NUTS: Draw = pieces(10, (x, y, s, R) => blob(x, y, s * 0.36, s * 0.26, R, '#b07a43', '#7a4d22', 0.25) + path(`M${f(x - s * 0.2)} ${f(y)} h${f(s * 0.4)}`, 'none', '#8a5a2b', 0.8), 0.75);
const SEEDS: Draw = (cx, cy, r, R) => spots(20, cx, cy, r * 0.7, R).map(([x, y]) => ell(x, y, 1.6, 1, deg(R), '#9a8a62')).join('');
const CHICKPEAS: Draw = pieces(18, (x, y, s) => circ(x, y, s * 0.34, '#e6c27e', '#b8914a', 0.8) + circ(x - s * 0.1, y - s * 0.1, s * 0.08, '#f6deaa'), 0.8);
const LENTILS = (fill = '#e0782f', dot = '#c55e1c'): Draw => mound(fill, dot, (x, y) => circ(x, y, 1.4, dot), 30);
const KIDNEY: Draw = pieces(14, (x, y, s, R) => ell(x, y, s * 0.38, s * 0.22, deg(R), '#7a1f23', '#4a1013', 0.8) + ell(x - 1, y - 1, s * 0.12, s * 0.05, 0, 'rgba(255,255,255,0.3)'), 0.8);
const EDAMAME: Draw = pieces(8, (x, y, s, R) => rrect(x, y, s * 0.9, s * 0.3, s * 0.15, deg(R), '#6aa84a', '#3f7a2c', 0.8), 0.7);
const HUMMUS: Draw = (cx, cy, r, R) => blob(cx, cy, r, r * 0.95, R, '#e9d29f', '#c3a668', 0.05) + path(`M${f(cx - r * 0.55)} ${f(cy)} a${f(r * 0.55)} ${f(r * 0.45)} 0 1 0 ${f(r * 0.55)} ${f(-r * 0.45)}`, 'none', '#d9bd80', 2) + circ(cx, cy, r * 0.18, '#d6a62a') + spots(6, cx, cy, r * 0.5, R).map(([x, y]) => circ(x, y, 1.2, '#c0472a')).join('');
const DIP = (fill: string, fleck?: string): Draw => (cx, cy, r, R) => circ(cx, cy, r * 0.8, '#ffffff', '#d9d4c7', 1.5) + blob(cx, cy, r * 0.66, r * 0.62, R, fill, '', 0.08) + (fleck ? spots(10, cx, cy, r * 0.5, R).map(([x, y]) => circ(x, y, 1, fleck)).join('') : '');
const DOLLOP = (fill: string, edge: string): Draw => (cx, cy, r, R) => blob(cx, cy, r * 0.45, r * 0.4, R, fill, edge, 0.15) + circ(cx - r * 0.12, cy - r * 0.12, r * 0.1, 'rgba(255,255,255,0.35)');
const DRIZZLE = (col: string): Draw => (cx, cy, r, R) => path(`M${f(cx - r * 0.7)} ${f(cy - r * 0.2)} q${f(r * 0.3)} ${f(r * 0.5)} ${f(r * 0.6)} 0 t${f(r * 0.6)} 0 t${f(r * 0.4)} ${f(r * 0.2)}`, 'none', col, 2.6) + circ(cx + (R() - 0.5) * r, cy + r * 0.3, 1.8, col);
const OLIVES: Draw = pieces(7, (x, y, s) => circ(x, y, s * 0.3, '#3a3a2c', '#1d1d14', 0.8) + circ(x, y, s * 0.1, '#6b6b4a'), 0.7);
const ONION: Draw = pieces(5, (x, y, s) => circ(x, y, s * 0.4, 'none', '#efe2f0', 2) + circ(x, y, s * 0.25, 'none', '#e4cde6', 1.6), 0.7);
const KNOEDEL: Draw = pieces(2, (x, y, s) => circ(x, y, s * 0.42, '#f1e3bd', '#c9b07a', 1.4) + circ(x - s * 0.12, y - s * 0.12, s * 0.12, 'rgba(255,255,255,0.4)'), 0.55);
const SPAETZLE: Draw = pieces(26, (x, y, s, R) => blob(x, y, s * 0.5, s * 0.25, R, '#f6dc7c', '#d6b246', 0.3), 0.85);
const CRISPY_ONION: Draw = (cx, cy, r, R) => spots(18, cx, cy, r * 0.6, R).map(([x, y]) => path(`M${f(x)} ${f(y)} q3 -3 6 0`, 'none', '#a8641f', 1.8)).join('');
const PANCAKES: Draw = (cx, cy, r) => [0, 1, 2].map((i) => circ(cx + i * 2, cy - i * 4, r * 0.8, '#e8b260', '#b47a2c', 1.4)).join('') + circ(cx + 4, cy - 8, r * 0.55, '#f0c57a');
const TORTILLA: Draw = (cx, cy, r) => circ(cx, cy, r * 0.85, '#f1dcaa', '#c9a86a', 1.4) + [0, 1, 2, 3].map((i) => circ(cx + Math.cos(i * 1.7) * r * 0.5, cy + Math.sin(i * 1.7) * r * 0.5, r * 0.08, '#d8b471')).join('');
const SAUERKRAUT = CABBAGE('#efe8b8', '#c7bd75');
const DAL = LENTILS('#e7a43a', '#c27c18');
const CURRY = SAUCE('#efb24a', '#c88a20', '#e48a2a');

/** Zutat → Form (Hauptzutaten). Was hier fehlt und in MINOR steht, wird nicht gezeichnet (Öl, Salz, Gewürze …). */
const LOOK: Record<string, Draw> = {
  reis: RICE, 'reis-gekocht': RICE, 'reis-bowl': RICE, milchreis: mound('#fbf4df', '#d9c9a0', (x, y, R) => R() < 0.3 ? circ(x, y, 1.6, '#a8642a') : ell(x, y, 2.6, 1.2, deg(R), '#fffaf0', '#e8dcc0', 0.5), 50),
  quinoa: GRAIN('#efe2c0', '#c8a46a'), 'quinoa-gekocht': GRAIN('#efe2c0', '#c8a46a'), couscous: GRAIN('#f2dc9c', '#d4b36a'),
  spaghetti: PASTA(), 'nudeln-gekocht': SHORTPASTA, reisnudeln: PASTA('#f6eedb', '#e2d3b0'), spaetzle: SPAETZLE, gnocchi: GNOCCHI,
  tomatensauce: SAUCE('#d8412a', '#a52a17', '#f07a52'), bolognese: SAUCE('#b8452a', '#7e2a15', '#7a3a22'), sahnesosse: SAUCE('#f6ecd2', '#d8c79c'), carbonara: SAUCE('#f6e3a3', '#d8bd6a', '#a8403a'),
  kokosmilch: CURRY, gulasch: SAUCE('#8a3a22', '#5a2414', '#a8503a'), 'chili-con-carne': SAUCE('#a53a24', '#6e2414', '#5a1a14'), pesto: DRIZZLE('#5c8f2a'),
  kartoffel: POTATO, kartoffelpueree: MASH, pommes: FRIES(), ofenpommes: FRIES('#eab052', '#b77a24'), suesskartoffel: FRIES('#f0913a', '#bd6418'), bratkartoffeln: BRATKARTOFFELN, kartoffelsalat: POTATO,
  vollkornbrot: BREAD('#6b4426', '#a7774a', true), roggenbrot: BREAD('#5e3a20', '#8f633d', true), weissbrot: BREAD('#c88b45', '#f4e2b8'), 'toast-vollkorn': BREAD('#b4783e', '#d9b07a', true), broetchen: ROLL, baguette: BREAD('#c88b45', '#f4e2b8'), knaeckebrot: BREAD('#c49a5e', '#e2c48c', true),
  haehnchenbrust: CHICKEN, 'haehnchenbrust-gebraten': CHICKEN, putenbrust: CHICKEN, haehnchenkeule: DRUMSTICK, entenbrust: SLICES('#b06a4a', '#7a3a22', undefined, 5),
  rindersteak: STEAK, lamm: ROAST, schweinefilet: PORK, schweinenacken: PORK, kassler: SLICES('#e88f8a', '#b65a55', undefined, 4), schweinebauch: SLICES('#e2a07a', '#a8623a', undefined, 4),
  'schnitzel-paniert': SCHNITZEL, rinderhack: MINCE(), 'hackfleisch-gemischt': MINCE(), frikadelle: MEATBALLS, bratwurst: SAUSAGE(), gefluegelwurst: SAUSAGE('#e8b48e', '#b07a50'), leberkaese: SLICES('#e6a07a', '#a8623a', undefined, 2),
  schinken: HAM, salami: SALAMI, bacon: BACON, lachs: SALMON, raeucherlachs: SLICES('#f39270', '#c8603e', undefined, 4), forelle: SALMON, kabeljau: WHITEFISH, thunfisch: MINCE('#c9a48a', '#9a7660'),
  hering: SLICES('#c9c6c0', '#8a857c', undefined, 3), fischstaebchen: FISHSTICKS, 'fischfilet-paniert': BREADEDFISH, garnelen: SHRIMP,
  eier: FRIED_EGG, salat: SALAD, spinat: SPINACH, rahmspinat: SAUCE('#3d6b2a', '#2a4d1c'), brokkoli: BROCCOLI, blumenkohl: CAULI, 'gruene-bohnen': GREENBEANS, erbsen: PEAS,
  gurke: CUCUMBER, tomate: TOMATO, paprika: PEPPER, karotte: CARROT, mais: CORN, zucchini: ZUCCHINI, champignons: MUSHROOM, weisskohl: CABBAGE('#eef1d6', '#c6cc9c'),
  spargel: ASPARAGUS('#f3efd9', '#e6dcb2'), avocado: AVOCADO, kuerbis: CARROT, 'gemuese-tk': PEPPER, ofengemuese: PEPPER, sellerie: CUCUMBER, lauch: ZUCCHINI, zwiebel: ONION,
  gouda: CHEESE_SLICE, emmentaler: CHEESE_SLICE, cheddar: CHEESE_GRATED, 'kaese-reibe': CHEESE_GRATED, parmesan: PARMESAN, mozzarella: MOZZA, feta: FETA, ziegenkaese: MOZZA, halloumi: HALLOUMI, ricotta: YOGURT,
  frischkaese: DOLLOP('#fbfaf3', '#ddd8c6'), 'koerniger-frischkaese': mound('#fbfaf3', '#dcd6c3', (x, y) => circ(x, y, 1.8, '#f2efe2', '#dcd6c3', 0.5), 30),
  tofu: TOFU, seitan: PORK, tempeh: TOFU, kichererbsen: CHICKPEAS, linsen: LENTILS(), 'linsen-gekocht': LENTILS('#9a6b3a', '#6e4a22'), kidneybohnen: KIDNEY, edamame: EDAMAME, falafel: MEATBALLS, hummus: HUMMUS,
  magerquark: YOGURT, speisequark: YOGURT, skyr: YOGURT, joghurt: YOGURT, 'griechischer-joghurt': YOGURT, vanillejoghurt: CREAM_BASE('#fbf3d6', '#e2d5a6', '#efe2b6'),
  haferflocken: OATS, muesli: OATS, 'knuspermuesli-schoko': NUTS, cornflakes: pieces(16, (x, y, s, R) => blob(x, y, s * 0.45, s * 0.35, R, '#efbd57', '#c98d28', 0.3), 0.85),
  heidelbeeren: BERRIES('#3f4f9a', '#27306a'), himbeeren: RASPBERRY, erdbeeren: STRAWBERRY, banane: BANANA, apfel: APPLE, ananas: PINEAPPLE, obstsalat: FRUITMIX, zitrone: LEMON,
  walnuesse: NUTS, mandeln: NUTS, erdnuesse: NUTS, studentenfutter: NUTS, sonnenblumenkerne: SEEDS, erdnussbutter: DOLLOP('#c7863e', '#9a5f22'), 'nuss-nougat-creme': DOLLOP('#6a3a1f', '#4a2410'),
  marmelade: DOLLOP('#c42a3a', '#8a1a24'), apfelmus: DOLLOP('#efd59a', '#cfae62'), honig: DRIZZLE('#e8a823'), tzatziki: DIP('#f6f6ee', '#7aa05a'), dressing: DRIZZLE('#f2ecd6'),
  ketchup: DOLLOP('#d2311f', '#9a2012'), mayonnaise: DOLLOP('#fbf3d4', '#e0d39c'), senf: DOLLOP('#e2b52a', '#b48a12'), oliven: OLIVES, pfannkuchen: PANCAKES, 'chicken-nuggets': pieces(8, (x, y, s2, R) => blob(x, y, s2 * 0.45, s2 * 0.36, R, '#e2a447', '#a8702a', 0.25), 0.75),
  reiswaffel: pieces(2, (x, y, s2, R) => circ(x, y, s2 * 0.48, '#f1e2bd', '#c9b07a', 1.4) + spots(14, x, y, s2 * 0.38, R).map(([px, py]) => circ(px, py, 1.6, '#e2cfa0')).join(''), 0.5),
  bagel: ROLL, croissant: ROLL, pizzateig: TORTILLA, wrap: TORTILLA, 'asia-pfanne': PEPPER,
};
/** Zutaten, die man auf dem Bild nicht sieht (Öl, Gewürze, Milch im Teig …) */
export const MINOR = new Set(['olivenoel', 'butter', 'sojasauce', 'milch', 'knoblauch', 'zucker', 'mehl', 'proteinpulver', 'salz', 'sahne']);

// ---------- Gefäße und Szenen ----------
const W = 240;
const defs = `<defs>
<radialGradient id="pl" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.82" stop-color="#f2f1ee"/><stop offset="1" stop-color="#d9d7d2"/></radialGradient>
<radialGradient id="sh" cx="50%" cy="50%" r="50%"><stop offset="0.7" stop-color="rgba(0,0,0,0.22)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
<radialGradient id="hl" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="rgba(255,255,255,0.28)"/><stop offset="0.6" stop-color="rgba(255,255,255,0)"/></radialGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c99662"/><stop offset="1" stop-color="#a5723f"/></linearGradient>
</defs>`;
const plate = () => circ(124, 128, 104, 'url(#sh)') + circ(120, 120, 100, 'url(#pl)', '#d4d2cc', 1) + circ(120, 120, 74, 'none', '#e7e5e0', 1.5);
const bowl = (inner = '#dfe8ee') => circ(124, 128, 98, 'url(#sh)') + circ(120, 120, 92, '#c9d8e2', '#9fb3c1', 1.2) + circ(120, 120, 78, inner, '#b4c5d1', 2) + path('M60 75 A78 78 0 0 1 120 42', 'none', 'rgba(255,255,255,0.8)', 4);
const board = () => rrect(124, 128, 210, 160, 20, 0, 'rgba(0,0,0,0.18)') + rrect(120, 120, 206, 156, 18, 0, 'url(#wood)', '#8a5a2c', 1.5) + [0, 1, 2, 3].map((i) => path(`M30 ${68 + i * 30} q90 ${i % 2 ? 6 : -6} 180 0`, 'none', 'rgba(110,70,30,0.25)', 1.2)).join('');
const gloss = () => circ(120, 120, 86, 'url(#hl)');
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}">${defs}${body}</svg>`;

/** Bereiche auf dem Teller je nach Anzahl der Bestandteile (größte zuerst) */
const SLOTS: Record<number, [number, number, number][]> = {
  1: [[120, 120, 68]],
  2: [[90, 110, 54], [160, 132, 46]],
  3: [[90, 96, 48], [160, 100, 42], [124, 164, 40]],
  4: [[86, 90, 44], [156, 88, 40], [88, 158, 40], [158, 156, 38]],
  5: [[84, 90, 42], [156, 86, 38], [84, 158, 38], [156, 156, 36], [120, 124, 26]],
};
const BOWL_SLOTS: Record<number, [number, number, number][]> = {
  1: [[132, 108, 40]], 2: [[100, 100, 34], [146, 140, 32]], 3: [[94, 98, 32], [150, 100, 30], [122, 152, 30]],
  4: [[92, 94, 30], [148, 94, 28], [94, 148, 28], [148, 148, 28]], 5: [[92, 94, 28], [148, 92, 26], [92, 148, 26], [148, 148, 26], [120, 120, 18]],
};

interface Part { key: string; grams: number; draw: Draw }
/** sichtbare Bestandteile, nach Menge sortiert (Soßen/Garnitur bekommen Mindestgewicht, damit sie sichtbar bleiben) */
const RAW: Record<string, number> = { reis: 2.8, spaghetti: 2.4, quinoa: 2.8, linsen: 2.5, couscous: 2.5, haferflocken: 2.5 };
/** Form je nach Beschriftung genauer wählen (Knödel statt Püree, Rotkohl, Rührei …) */
function lookOf(key: string, label: string, name: string): Draw | undefined {
  const l = label.toLowerCase(), n = name.toLowerCase();
  if (/kn(ö|oe)del|kl(ö|oe)(ß|ss)e/.test(l)) return KNOEDEL;
  if (/sauerkraut/.test(l)) return SAUERKRAUT;
  if (/rotkohl|blaukraut/.test(l)) return CABBAGE('#7b3a7a', '#5a2458');
  if (/roulade|braten/.test(l)) return ROAST;
  if (/croutons/.test(l)) return pieces(10, (x, y, s2, R) => rrect(x, y, s2 * 0.4, s2 * 0.4, 1.5, deg(R), '#e2b060', '#b47a2c', 0.8), 0.7);
  if (key === 'eier') {
    if (/r(ü|ue)hrei|omelett/.test(n)) return SCRAMBLED;
    if (/gekocht|hartgekocht|salat|bowl|teller/.test(l + ' ' + n)) return BOILED_EGG;
  }
  if (key === 'linsen' && /dal/.test(n)) return DAL;
  if (key === 'zwiebel' && /r(ö|oe)stzwiebel/.test(n)) return CRISPY_ONION;
  if (key === 'zwiebel' && !/zwiebel/.test(n)) return undefined; // Zwiebeln im Essen sieht man kaum
  return LOOK[key];
}
function partsOf(d: Dish): Part[] {
  const out: Part[] = [];
  for (const [key, g, label] of d.ingredients) {
    if (MINOR.has(key)) continue;
    const draw = lookOf(key, label, d.name);
    if (!draw) continue;
    const grams = g * (RAW[key] ?? 1);
    const prev = out.find((p) => p.draw === draw);
    if (prev) prev.grams += grams;
    else out.push({ key, grams, draw });
  }
  return out.sort((a, b) => b.grams - a.grams);
}
const SAUCES = new Set(['tomatensauce', 'bolognese', 'sahnesosse', 'carbonara', 'kokosmilch', 'gulasch', 'chili-con-carne', 'pesto', 'rahmspinat']);
const TOPPINGS = new Set(['parmesan', 'kaese-reibe', 'cheddar', 'honig', 'dressing', 'pesto', 'sonnenblumenkerne', 'zwiebel']);
const BOWL_BASE = ['haferflocken', 'muesli', 'magerquark', 'skyr', 'joghurt', 'griechischer-joghurt', 'speisequark', 'vanillejoghurt', 'milchreis', 'koerniger-frischkaese', 'cornflakes', 'obstsalat', 'studentenfutter', 'linsen', 'chili-con-carne', 'kokosmilch'];
const CARBS = new Set(['spaghetti', 'nudeln-gekocht', 'reis', 'reis-gekocht', 'reisnudeln', 'spaetzle', 'gnocchi', 'kartoffel', 'kartoffelpueree', 'quinoa-gekocht', 'couscous']);

function onPlate(d: Dish, R: R, inBowl = false): string {
  let parts = partsOf(d);
  // Soße liegt auf Nudeln/Reis, Käse/Honig als Garnitur obendrauf
  const carb = parts.find((p) => CARBS.has(p.key));
  const sauce = parts.find((p) => SAUCES.has(p.key));
  const tops = parts.filter((p) => TOPPINGS.has(p.key));
  parts = parts.filter((p) => p !== sauce && !tops.includes(p));
  if (sauce && !carb) parts.unshift(sauce);
  parts = parts.slice(0, 5);
  const slots = (inBowl ? BOWL_SLOTS : SLOTS)[Math.max(1, parts.length)];
  let s = '';
  parts.forEach((p, i) => {
    const [x, y, r] = slots[i];
    s += p.draw(x, y, r, R);
    if (p === carb && sauce) s += sauce.draw(x + r * 0.08, y - r * 0.05, r * 0.6, R);
  });
  const anchor = carb ? slots[parts.indexOf(carb)] : slots[0];
  for (const t of tops) s += t.draw(anchor[0], anchor[1], anchor[2] * 0.7, R);
  return s;
}

// ---------- Ganze Gerichte mit eigener Form ----------
const PIZZA = (top: 'salami' | 'margherita' | 'schinken' | 'flamm'): string => {
  const R = rngOf(top);
  let s = board() + circ(120, 120, 88, top === 'flamm' ? '#ecd39a' : '#e3a856', '#b47a2c', 2) + circ(120, 120, 76, top === 'flamm' ? '#f6ecd0' : '#d8432a');
  if (top !== 'flamm') s += spots(9, 120, 120, 62, R).map(([x, y]) => blob(x, y, 11, 9, R, '#fbf3d6', '', 0.2)).join('');
  if (top === 'salami') s += spots(9, 120, 120, 60, R).map(([x, y]) => circ(x, y, 9, '#b6413f', '#7d2523', 1)).join('');
  if (top === 'schinken') s += spots(7, 120, 120, 58, R).map(([x, y]) => blob(x, y, 10, 7, R, '#f2a3a8', '#d77a7f')).join('') + MUSHROOM(120, 120, 60, R);
  if (top === 'margherita') s += spots(6, 120, 120, 55, R).map(([x, y]) => ell(x, y, 6, 3.5, deg(R), '#3f8a2c')).join('');
  if (top === 'flamm') s += BACON(120, 110, 40, R) + ONION(120, 135, 50, R);
  return s + [0, 1, 2].map((i) => path(`M${f(120 + Math.cos(i * 1.047) * 88)} ${f(120 + Math.sin(i * 1.047) * 88)} L${f(120 - Math.cos(i * 1.047) * 88)} ${f(120 - Math.sin(i * 1.047) * 88)}`, 'none', 'rgba(120,60,20,0.35)', 1.2)).join('') + gloss();
};
const BURGER = (patty = '#7a3e22', fries = false) => {
  let s = plate();
  const x = fries ? 100 : 120;
  s += circ(x, 120, 58, '#d9933f', '#a8651f', 2) + circ(x, 120, 50, '#e7a650');
  const R = rngOf('burger');
  s += spots(18, x, 120, 40, R).map(([px, py]) => ell(px, py, 2.2, 1.2, deg(R), '#fbefc9')).join('');
  s += path(`M${x - 60} 132 q10 10 20 0 t20 0 t20 0 t20 0 t20 0 t20 0`, 'none', '#6fb83f', 6) + path(`M${x - 56} 140 h112`, 'none', patty, 8) + path(`M${x - 52} 128 l14 8 l16 -8 l16 8 l16 -8 l16 8 l16 -8`, 'none', '#f6c33a', 4);
  if (fries) s += FRIES()(172, 150, 34, R);
  return s + gloss();
};
const WRAP = (inner: string[]) => {
  let s = board();
  s += `<g transform="rotate(-25 120 120)">` + rrect(120, 120, 170, 70, 35, 0, '#efd7a2', '#c49a5a', 2) + ell(195, 120, 18, 34, 0, '#f6e6c0', '#c49a5a', 1.5);
  s += inner.map((c, i) => ell(195, 106 + i * 9, 13, 5, 0, c)).join('') + path('M60 100 q30 10 60 0 t60 0', 'none', '#dcbc7e', 2) + '</g>';
  return s + gloss();
};
const SOUP = (col: string, edge: string, floats: Draw[], R: R) => {
  let s = bowl(col) + blob(120, 120, 76, 76, R, col, edge, 0.02);
  floats.forEach((d, i) => { s += d(95 + (i % 2) * 50, 100 + Math.floor(i / 2) * 42, 20, R); });
  return s + circ(100, 98, 20, 'rgba(255,255,255,0.25)') + gloss();
};
const GLASS = (col: string, foam?: string) => rrect(124, 128, 120, 160, 30, 0, 'rgba(0,0,0,0.12)') + rrect(120, 120, 110, 160, 22, 0, 'rgba(230,240,245,0.6)', '#b8c4cc', 2) + rrect(120, 128, 96, 136, 18, 0, col) + (foam ? rrect(120, 66, 96, 26, 12, 0, foam) : '') + rrect(90, 120, 10, 120, 5, 0, 'rgba(255,255,255,0.35)');
const MUG = () => circ(124, 128, 82, 'url(#sh)') + circ(198, 120, 22, 'none', '#e8e6e0', 9) + circ(120, 120, 76, '#ffffff', '#d4d2cc', 1.5) + circ(120, 120, 62, '#c48a54') + circ(120, 120, 50, '#f3e2c4') + path('M100 112 q20 -16 40 0 q-20 16 -40 0', 'none', '#c48a54', 3);
const WINE = () => circ(120, 120, 82, 'url(#sh)') + circ(120, 120, 74, 'rgba(235,240,245,0.7)', '#b8c4cc', 2) + circ(120, 120, 58, '#7a1630') + circ(100, 100, 14, 'rgba(255,255,255,0.3)');
const BAG = (col: string, label: string, filling: Draw, R: R) => rrect(124, 128, 160, 190, 16, 0, 'rgba(0,0,0,0.15)') + path('M50 40 h140 l-8 170 h-124z', col, 'rgba(0,0,0,0.25)', 2) + rrect(120, 80, 100, 40, 8, 0, 'rgba(255,255,255,0.85)') + `<text x="120" y="88" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle" fill="#333">${label}</text>` + filling(120, 160, 46, R);
const SWEETS: Record<string, (R: R) => string> = {
  eis: (R) => bowl() + circ(98, 108, 28, '#f6e7c8', '#d9c497', 1.2) + circ(144, 108, 28, '#6a3a22', '#4a2410', 1.2) + circ(120, 146, 28, '#f2a3b8', '#d27a92', 1.2) + DRIZZLE('#5a2c14')(120, 120, 40, R) + gloss(),
  muffin: () => plate() + circ(120, 120, 56, '#8a4a22', '#5e2c10', 2) + spots(14, 120, 120, 40, rngOf('m')).map(([x, y]) => circ(x, y, 4, '#3a1c0c')).join('') + gloss(),
  donut: () => plate() + circ(120, 120, 60, '#e2a456', '#b47a2c', 2) + circ(120, 120, 52, '#f08aa8') + spots(24, 120, 120, 44, rngOf('d')).map(([x, y], i) => rrect(x, y, 6, 2, 1, i * 47, pick(rngOf(String(i)), ['#fff', '#7ad', '#fd5', '#9e6']))).join('') + circ(120, 120, 18, '#f4f3ef', '#c49a5a', 2) + gloss(),
  kuchen: () => plate() + path('M70 150 L170 150 L120 60 Z', '#f0cf7e', '#c9a04a', 2) + path('M70 150 L170 150 L162 136 L78 136 Z', '#c48a3a') + spots(6, 120, 120, 26, rngOf('k')).map(([x, y]) => circ(x, y, 5, '#b3263a')).join('') + gloss(),
  torte: () => plate() + path('M70 150 L170 150 L120 60 Z', '#fbf3e3', '#d9cdb2', 2) + path('M120 60 L170 150 L163 150 L120 72 Z', '#f2d7da') + circ(120, 96, 9, '#d2283a') + circ(140, 128, 7, '#fbf3e3', '#d9cdb2') + gloss(),
  waffel: () => plate() + circ(120, 120, 62, '#e9b45a', '#b47a2c', 2) + [-3, -2, -1, 0, 1, 2, 3].map((i) => path(`M${120 + i * 16} 62 V178 M62 ${120 + i * 16} H178`, 'none', '#c98c35', 3)).join('') + spots(30, 120, 120, 50, rngOf('w')).map(([x, y]) => circ(x, y, 1.6, '#ffffff')).join('') + gloss(),
  pudding: (R) => bowl('#fbf3e3') + blob(120, 120, 60, 58, R, '#6a3a22', '#4a2410', 0.05) + DOLLOP('#fffdf6', '#e8e2d2')(120, 110, 40, R) + gloss(),
  gruetze: (R) => bowl() + blob(120, 120, 64, 62, R, '#9a1a2a', '#6a0f1a', 0.05) + RASPBERRY(110, 110, 34, R) + DRIZZLE('#f6e8b8')(130, 140, 36, R) + gloss(),
  schokoriegel: () => board() + rrect(120, 120, 170, 52, 10, -12, '#5a2e16', '#3a1c0a', 2) + [0, 1, 2, 3].map((i) => rrect(62 + i * 40, 120 - (i - 1.5) * 8.6, 30, 36, 5, -12, '#6e3a1e')).join(''),
  gummibaerchen: (R) => BAG('#e2457a', 'Gummi', pieces(14, (x, y, s) => circ(x, y - s * 0.15, s * 0.22, pick(R, ['#f33', '#fb2', '#3c3', '#fff3', '#f80'])) + ell(x, y + s * 0.15, s * 0.25, s * 0.3, 0, pick(R, ['#f33', '#fb2', '#3c3', '#f80'])), 0.8), R),
  chips: (R) => BAG('#f2b628', 'Chips', pieces(10, (x, y, s, RR) => blob(x, y, s * 0.45, s * 0.35, RR, '#f6d36a', '#d6a92a', 0.25), 0.8), R),
  popcorn: (R) => BAG('#e2412c', 'Popcorn', pieces(16, (x, y, s, RR) => blob(x, y, s * 0.4, s * 0.36, RR, '#fdf6dc', '#e2d29c', 0.35), 0.85), R),
};

/** Hauptfunktion: SVG-Text für ein Gericht */
export function dishSvg(d: Dish): string {
  const R = rngOf(d.id);
  const n = d.name.toLowerCase();
  const keys = new Set(d.ingredients.map(([k]) => k));
  const only = d.ingredients.length === 1 ? d.ingredients[0][0] : '';
  // Getränke
  if (only === 'bier') return svg(GLASS('#e9a92a', '#fbf6e6'));
  if (only === 'wein') return svg(WINE());
  if (only === 'cappuccino') return svg(MUG());
  if (/shake/.test(n)) return svg(GLASS(keys.has('banane') ? '#f3e2b0' : '#e9dcc8', '#fbf8ef'));
  // Süßes und Snacks in eigener Form
  const sweet = d.ingredients.map(([k]) => k).find((k) => SWEETS[k]);
  if (sweet && d.ingredients.length <= 2) return svg(SWEETS[sweet](R));
  // Pizza, Burger, Wraps …
  if (/flammkuchen/.test(n)) return svg(PIZZA('flamm'));
  if (/pizza/.test(n)) return svg(PIZZA(/salami/.test(n) ? 'salami' : /prosciutto|schinken/.test(n) ? 'schinken' : 'margherita'));
  if (/burger/.test(n)) return svg(BURGER(/veggie/.test(n) ? '#8a6a3a' : /chicken/.test(n) ? '#d9a043' : '#7a3e22', /pommes/.test(n)));
  if (/d(ö|oe)ner kebab|d(ü|ue)r(ü|ue)m|wrap|burrito(?! ?-?bowl)/.test(n) && !/teller|bowl/.test(n)) return svg(WRAP(['#6fb83f', '#e5432f', '#c98a5a', '#f6f6ee']));
  if (/hotdog/.test(n)) return svg(board() + rrect(120, 120, 180, 56, 28, -15, '#e2a456', '#b47a2c', 2) + rrect(120, 116, 190, 26, 13, -15, '#b5532d', '#7a3015', 1.5) + path('M45 140 q20 -30 40 -12 t40 -12 t40 -12 t40 -12', 'none', '#e2b52a', 4, ' transform="rotate(-2 120 120)"'));
  if (/sushi/.test(n)) return svg(board() + spots(12, 120, 120, 70, R).map(([x, y], i) => i % 3 ? circ(x, y, 13, '#1f2a1f') + circ(x, y, 10, '#fbfaf3') + circ(x, y, 5, pick(R, ['#f39270', '#e2412c', '#6fb83f'])) : rrect(x, y, 30, 16, 7, 20, '#fbfaf3', '#ddd', 1) + rrect(x, y - 3, 30, 10, 5, 20, '#f39270')).join(''));
  if (/croissant/.test(n)) {
    let s = plate();
    for (let i = 0; i < 7; i++) {
      const t = i / 6, a = Math.PI * (1.1 - t * 1.2), w = 14 + Math.sin(t * Math.PI) * 18;
      s += ell(118 + Math.cos(a) * 48, 136 - Math.sin(a) * 42, w * 0.8, w, (a * 180) / Math.PI, i % 2 ? '#e2a04a' : '#d58f38', '#a8651f', 1.5);
    }
    return svg(s + DOLLOP('#c42a3a', '#8a1a24')(170, 172, 30, R) + gloss());
  }
  if (/brezel/.test(n)) return svg(board() + path('M80 150 C40 110 70 60 110 90 L130 120 M160 150 C200 110 170 60 130 90 L110 120 M80 150 Q120 170 160 150', 'none', '#8a4a1a', 16) + path('M80 150 C40 110 70 60 110 90 L130 120 M160 150 C200 110 170 60 130 90 L110 120 M80 150 Q120 170 160 150', 'none', '#a8642a', 12) + spots(12, 120, 120, 60, R).map(([x, y]) => circ(x, y, 1.8, '#fff')).join(''));
  if (/lasagne|auflauf|quiche|gratin/.test(n)) return svg(rrect(124, 128, 200, 150, 22, 0, 'rgba(0,0,0,0.18)') + rrect(120, 120, 200, 150, 22, 0, '#f4f2ee', '#c9c5bc', 2) + rrect(120, 120, 172, 122, 14, 0, '#e0a24a') + spots(40, 120, 120, 62, R).map(([x, y]) => blob(x, y, 7, 5, R, R() < 0.5 ? '#f3cf6a' : '#b8632a', '', 0.3)).join('') + gloss());
  if (/fr(ü|ue)hlingsroll/.test(n)) return svg(plate() + [0, 1, 2, 3].map((i) => rrect(100 + (i % 2) * 40, 90 + Math.floor(i / 2) * 50, 70, 26, 13, 30, '#e3a94e', '#a8712a', 1.5)).join('') + DIP('#d2311f')(170, 165, 30, R) + gloss());
  if (/nachos/.test(n)) return svg(plate() + pieces(16, (x, y, s, RR) => path(`M${f(x)} ${f(y - s * 0.5)} L${f(x + s * 0.45)} ${f(y + s * 0.35)} L${f(x - s * 0.45)} ${f(y + s * 0.35)}Z`, '#f2c14e', '#c98d28', 1, ` transform="rotate(${f(deg(RR))} ${f(x)} ${f(y)})"`), 0.85)(120, 120, 70, R) + DRIZZLE('#f6c33a')(120, 120, 50, R) + DIP('#d2311f', '#5ea33a')(165, 165, 28, R) + gloss());
  if (/pfannkuchen|pancake/.test(n)) return svg(plate() + PANCAKES(110, 120, 60, R) + onTop(d, R) + gloss());
  if (/currywurst/.test(n)) return svg(plate() + SAUSAGE('#a5532d', '#6d3015', 1)(95, 115, 50, R) + SAUCE('#c4381f', '#8a2010', '#e2b52a')(95, 115, 34, R) + (/pommes/.test(n) ? FRIES()(165, 140, 38, R) : ROLL(168, 140, 42, R)) + gloss());
  if (/shakshuka/.test(n)) return svg(circ(124, 128, 100, 'url(#sh)') + rrect(205, 70, 70, 16, 8, -40, '#2a2a2a') + circ(120, 120, 92, '#3a3a3c', '#1f1f20', 2) + blob(120, 120, 78, 76, R, '#c8361f', '#9a2412', 0.04) + spots(14, 120, 120, 60, R).map(([x, y]) => circ(x, y, 2.2, '#e45a3a')).join('') + [[96, 98], [146, 104], [118, 150]].map(([x, y]) => FRIED_EGG(x, y, 24, R)).join('') + spots(10, 120, 120, 64, R).map(([x, y]) => ell(x, y, 3, 1.6, deg(R), '#4f8a32')).join('') + gloss());
  if (/bibimbap/.test(n)) {
    let s = bowl() + RICE(120, 120, 74, R);
    [CARROT, SPINACH, MINCE(), CUCUMBER, MUSHROOM].forEach((dr, i) => { const a = -Math.PI / 2 + (i / 5) * TAU; s += dr(120 + Math.cos(a) * 44, 120 + Math.sin(a) * 44, 22, R); });
    return svg(s + FRIED_EGG(120, 120, 24, R) + gloss());
  }
  // Suppen und Eintöpfe
  if (/suppe|eintopf|ramen/.test(n)) {
    const col = /tomate/.test(n) ? '#d8432a' : /k(ü|ue)rbis/.test(n) ? '#eb8a2a' : /brokkoli/.test(n) ? '#8ab84a' : /h(ü|ue)hner|ramen/.test(n) ? '#f0d78a' : /gulasch/.test(n) ? '#8a3a22' : /linse/.test(n) ? '#b8742a' : /kartoffel/.test(n) ? '#ecd59a' : '#d9a24a';
    const floats = partsOf(d).filter((p) => !['kartoffelpueree', 'tomatensauce', 'kokosmilch', 'sahne', 'gulasch', 'linsen'].includes(p.key) && !/^(broetchen|vollkornbrot|weissbrot|roggenbrot)$/.test(p.key)).slice(0, 4).map((p) => p.draw);
    const s = SOUP(col, 'rgba(0,0,0,0.12)', floats.length ? floats : [PARMESAN], R);
    return svg(s);
  }
  // Brote und Belegtes auf dem Holzbrett
  if (d.cat === 'brot' || /^(br(ö|oe)tchen|k(ä|ae)sebrot|wurstbrot|schinkenbrot|thunfisch-brot|toast|bagel|baguette|vollkornbrot|vollkorntoast|avocado-toast|fischbr)/.test(n)) {
    return svg(board() + openSandwich(d, R));
  }
  // Schalen: Müsli, Quark, Bowls, Currys, Dal, Chili
  const isBowl = /bowl|porridge|haferbrei|haferflocken|oats|m(ü|ue)sli|quark|skyr|joghurt|cornflakes|curry|dal\b|chili|milchreis|obstsalat|cottage|studentenfutter|eintopf/.test(n);
  if (isBowl) {
    // Grundlage füllt die Schale (Haferflocken, Quark, Curry-Soße, Reis …), der Rest liegt obendrauf
    const ps = partsOf(d);
    const base = ps.find((p) => BOWL_BASE.includes(p.key)) ?? ps.find((p) => SAUCES.has(p.key)) ?? ps.find((p) => CARBS.has(p.key));
    let s = bowl();
    if (base) {
      s += base.draw(120, 120, 74, R);
      const rest: Dish = { ...d, ingredients: d.ingredients.filter(([k]) => k !== base.key) };
      s += onPlate(rest, R, true);
    } else s += onPlate(d, R, true);
    return svg(s + gloss());
  }
  return svg(plate() + onPlate(d, R) + gloss());
}

/** Belag für Pfannkuchen u. ä. */
function onTop(d: Dish, R: R) {
  return partsOf(d).filter((p) => !['pfannkuchen', 'eier', 'haferflocken'].includes(p.key)).slice(0, 2).map((p, i) => p.draw(150 + i * 10, 150 - i * 50, 26, R)).join('');
}
/** offene Brote / Brötchen mit Belag */
function openSandwich(d: Dish, R: R) {
  const parts = partsOf(d);
  const bread = parts.find((p) => /brot|broetchen|toast|bagel|baguette|weissbrot|knaecke/.test(p.key));
  const tops = parts.filter((p) => p !== bread).slice(0, 3);
  const n = d.name.toLowerCase();
  const round = /br(ö|oe)tchen|bagel|fischbr|leberk/.test(n) || bread?.key === 'broetchen';
  const crust = bread?.key === 'vollkornbrot' || bread?.key === 'roggenbrot' ? '#6b4426' : '#c88b45', inner = bread?.key === 'vollkornbrot' || bread?.key === 'roggenbrot' ? '#a7774a' : '#f2dcaa';
  let s = '';
  for (const [x, y, rot] of [[84, 116, -8], [158, 124, 6]] as const) {
    s += `<g transform="rotate(${rot} ${x} ${y})">`;
    s += round ? circ(x, y, 42, '#d8a05a', '#a8692b', 2) + circ(x, y, 35, inner) : rrect(x, y, 72, 84, 14, 0, inner, crust, 5);
    tops.forEach((t, i) => { s += t.draw(x + (i - (tops.length - 1) / 2) * 10, y + (i - 1) * 8, 26, R); });
    s += '</g>';
  }
  return s;
}

/** Daten-URL fürs <img>-Element (zwischengespeichert) */
const cache = new Map<string, string>();
/** tight: näher heran (für kleine Vorschaubilder) */
export function dishImageUrl(d: Dish, tight = false): string {
  const k = `${d.id}${tight ? '|t' : ''}`;
  let u = cache.get(k);
  if (!u) {
    let svg = dishSvg(d);
    if (tight) svg = svg.replace(`viewBox="0 0 ${W} ${W}"`, 'viewBox="16 16 212 212"');
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    cache.set(k, u);
  }
  return u;
}
/** für Tests: Zutaten-Schlüssel, die weder gezeichnet noch als „unsichtbar“ markiert sind */
export const unknownKeys = (keys: string[]) => keys.filter((k) => !LOOK[k] && !MINOR.has(k));
