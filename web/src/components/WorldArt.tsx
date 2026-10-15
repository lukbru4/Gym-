// Weltkarte mit Reiseroute, Postkarten (Wahrzeichen) und Gipfel-Aufstieg – alles als SVG gezeichnet.
import type { ReactElement } from 'react';
import { ROUTE, type Journey, type Stop } from '../lib/adventure';

/** Länge/Breite → Kartenpunkt (0–360 × 0–180) */
const xy = (lon: number, lat: number): [number, number] => [lon + 180, 90 - lat];
const poly = (pts: number[][]) => pts.map(([lon, lat]) => xy(lon, lat).join(',')).join(' ');

const LAND: number[][][] = [
  // Nordamerika, Grönland, Südamerika, Europa, Großbritannien, Afrika, Asien, Japan, Australien
  [[-168, 66], [-140, 70], [-110, 72], [-85, 70], [-65, 60], [-55, 50], [-70, 43], [-76, 35], [-81, 25], [-90, 29], [-97, 26], [-97, 18], [-88, 15], [-83, 9], [-79, 8], [-86, 13], [-105, 20], [-112, 30], [-118, 34], [-124, 40], [-124, 48], [-135, 58], [-150, 60], [-165, 60]],
  [[-50, 60], [-42, 62], [-20, 70], [-22, 80], [-45, 83], [-60, 78], [-55, 68]],
  [[-80, 9], [-72, 12], [-60, 10], [-50, 0], [-35, -5], [-38, -15], [-48, -26], [-58, -36], [-65, -42], [-68, -55], [-74, -50], [-72, -30], [-71, -18], [-81, -5]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [0, 50], [5, 53], [8, 57], [5, 62], [12, 66], [20, 70], [30, 70], [40, 66], [45, 55], [40, 45], [30, 40], [26, 38], [23, 36], [20, 40], [15, 38], [12, 44], [8, 44], [3, 43], [-5, 36]],
  [[-5, 50], [1, 51], [1, 53], [-2, 56], [-5, 58], [-6, 55], [-3, 54], [-5, 52]],
  [[-17, 21], [-10, 30], [-5, 35], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -2], [40, -15], [33, -26], [20, -35], [17, -29], [12, -17], [13, -5], [8, 4], [-8, 4], [-17, 14]],
  [[26, 40], [36, 36], [35, 30], [44, 12], [55, 17], [58, 24], [67, 25], [72, 20], [78, 8], [82, 16], [90, 22], [97, 16], [100, 8], [104, 1], [108, 12], [110, 20], [118, 24], [122, 31], [120, 38], [126, 38], [129, 35], [130, 42], [140, 46], [142, 55], [160, 60], [170, 66], [180, 68], [180, 72], [140, 74], [110, 77], [80, 73], [68, 70], [60, 68], [50, 66], [45, 55], [40, 45], [30, 42]],
  [[130, 31], [135, 34], [141, 36], [142, 42], [145, 44], [141, 45], [139, 40], [137, 37], [133, 35], [130, 33]],
  [[114, -22], [122, -18], [131, -12], [137, -12], [142, -11], [146, -19], [153, -25], [151, -34], [145, -38], [138, -35], [131, -31], [117, -35], [115, -30]],
];

/** Strecke zwischen zwei Halten; über den Pazifik wird am Kartenrand umgebrochen */
function legs(a: Stop, b: Stop): [number, number, number, number][] {
  const [x1, y1] = xy(a.lon, a.lat), [x2, y2] = xy(b.lon, b.lat);
  if (Math.abs(x2 - x1) <= 180) return [[x1, y1, x2, y2]];
  // Weg über den Rand: links raus, rechts wieder rein (oder umgekehrt)
  const dir = x2 < x1 ? 1 : -1;
  const x2w = x2 + dir * 360, t = ((dir > 0 ? 360 : 0) - x1) / (x2w - x1), ym = y1 + (y2 - y1) * t;
  return [[x1, y1, dir > 0 ? 360 : 0, ym], [dir > 0 ? 0 : 360, ym, x2, y2]];
}
/** Punkt auf der Strecke a→b bei Anteil t */
function along(a: Stop, b: Stop, t: number): [number, number] {
  const [x1, y1] = xy(a.lon, a.lat), [x2, y2] = xy(b.lon, b.lat);
  let dx = x2 - x1;
  if (Math.abs(dx) > 180) dx -= Math.sign(dx) * 360;
  return [(((x1 + dx * t) % 360) + 360) % 360, y1 + (y2 - y1) * t];
}
export function journeyPoint(j: Journey): [number, number] {
  const next = j.at + 1 < ROUTE.length ? j.at + 1 : 1;
  const from = j.at + 1 < ROUTE.length ? ROUTE[j.at] : ROUTE[0];
  return j.climb ? xy(ROUTE[j.at].lon, ROUTE[j.at].lat) : along(from, ROUTE[next], j.legKm ? j.legDone / j.legKm : 0);
}

export function WorldMap({ journey, friends = [], petColor = '#e8222f', zoom = true }: { journey: Journey; friends?: { name: string; journey: Journey }[]; petColor?: string; zoom?: boolean }) {
  const [px, py] = journeyPoint(journey);
  // Ausschnitt: um den Begleiter herum (doppelte Vergrößerung) oder die ganze Welt
  const vb = zoom ? `${Math.max(0, Math.min(180, px - 90))} ${Math.max(10, Math.min(80, py - 45))} 180 90` : '0 12 360 140';
  const k = zoom ? 0.6 : 1;
  const reachedIdx = journey.round > 1 ? ROUTE.length - 1 : journey.at;
  return (
    <svg className="world-map" viewBox={vb} role="img" aria-label={`Weltkarte: unterwegs nach ${ROUTE[journey.at + 1 < ROUTE.length ? journey.at + 1 : 1].name}`}>
      <rect x="0" y="0" width="360" height="180" fill="#bfe3f5" />
      {LAND.map((p, i) => <polygon key={i} points={poly(p)} fill="#e9dfc4" stroke="#b9a77a" strokeWidth="0.6" strokeLinejoin="round" />)}
      {ROUTE.slice(1).map((s, i) => legs(ROUTE[i], s).map(([x1, y1, x2, y2], k) => (
        <line key={`${i}-${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < reachedIdx ? '#e8222f' : '#6c757d'} strokeWidth="1" strokeDasharray={i < reachedIdx ? undefined : '2 2'} opacity={i < reachedIdx ? 0.9 : 0.6} />
      )))}
      {ROUTE.slice(0, -1).map((s, i) => {
        const [x, y] = xy(s.lon, s.lat);
        return s.peak
          ? <path key={s.id} d={`M${x - 3.2} ${y + 2.4} L${x} ${y - 3} L${x + 3.2} ${y + 2.4} Z`} fill={i <= reachedIdx ? '#495057' : '#adb5bd'} stroke="#fff" strokeWidth="0.5" data-stop={s.id} />
          : <circle key={s.id} cx={x} cy={y} r="1.8" fill={i <= reachedIdx ? '#e8222f' : '#fff'} stroke="#495057" strokeWidth="0.6" data-stop={s.id} />;
      })}
      {friends.map((f) => { const [fx, fy] = journeyPoint(f.journey); return <g key={f.name} className="world-friend"><circle cx={fx} cy={fy} r="2.4" fill="#1c7ed6" stroke="#fff" strokeWidth="0.6" /><text x={fx + 3} y={fy - 2} fontSize="5" fontWeight="700" fill="#1c3d5a">{f.name}</text></g>; })}
      <g className="world-me" transform={`translate(${px} ${py})`}>
        <circle r={4.2 * k} fill={petColor} stroke="#fff" strokeWidth={1.2 * k} />
        <circle r={7 * k} fill="none" stroke={petColor} strokeWidth={0.8 * k} opacity="0.6"><animate attributeName="r" values={`${4 * k};${9 * k};${4 * k}`} dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" /></circle>
      </g>
    </svg>
  );
}

/** Gipfel-Aufstieg: Weg in Serpentinen mit Lagern; der Begleiter steht beim aktuellen Stand */
export function ClimbArt({ stop, done, need }: { stop: Stop; done: number; need: number }) {
  const t = need ? Math.min(1, done / need) : 1;
  const path = [[40, 180], [120, 160], [70, 132], [150, 112], [110, 86], [175, 66], [150, 44], [180, 22]];
  const seg = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let left = t * total, pos = path[0];
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]) { const f = left / seg[i]; pos = [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f]; break; }
    left -= seg[i]; pos = path[i + 1];
  }
  const from = stop.peak?.from ?? 0, to = stop.peak?.to ?? 0;
  return (
    <svg className="climb-art" viewBox="0 0 300 200" role="img" aria-label={`Aufstieg ${stop.name}: ${Math.round(from + done)} von ${to} Metern`}>
      <defs><linearGradient id="csky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fb6e8" /><stop offset="1" stopColor="#d7eefb" /></linearGradient></defs>
      <rect width="300" height="200" fill="url(#csky)" />
      <path d="M-10 200 L180 14 L330 200 Z" fill="#7d8a96" />
      <path d="M180 14 L150 44 L162 48 L172 40 L186 52 L198 40 L210 46 Z" fill="#fff" />
      <path d="M-10 200 L60 150 L110 200 Z" fill="#5f6b77" />
      <polyline points={path.map((p) => p.join(',')).join(' ')} fill="none" stroke="#f1f3f5" strokeWidth="2" strokeDasharray="4 3" />
      {[1 / 3, 2 / 3].map((f, i) => { const p = path[Math.round(f * (path.length - 1))]; return <g key={i}><path d={`M${p[0] - 7} ${p[1]} L${p[0]} ${p[1] - 9} L${p[0] + 7} ${p[1]} Z`} fill="#f08c00" /><text x={p[0] + 10} y={p[1]} fontSize="9" fill="#fff" fontWeight="700">Lager {i + 1}</text></g>; })}
      <g transform="translate(180 22)"><line x1="0" y1="0" x2="0" y2="-18" stroke="#333" strokeWidth="2" /><path d="M0 -18 L14 -13 L0 -8 Z" fill={t >= 1 ? '#e8222f' : '#adb5bd'} /></g>
      <circle cx={pos[0]} cy={pos[1]} r="7" fill="#e8222f" stroke="#fff" strokeWidth="2" className="climb-me" />
      <text x="8" y="16" fontSize="11" fontWeight="800" fill="#1c3d5a">{stop.name} · {to.toLocaleString('de-DE')} m</text>
      <text x="8" y="192" fontSize="10" fontWeight="700" fill="#fff">Basislager {from.toLocaleString('de-DE')} m</text>
    </svg>
  );
}

// ---- Postkarten -----------------------------------------------------------------------------
const SKY: Record<string, [string, string]> = { warm: ['#ffb347', '#ffe8b0'], day: ['#74c0fc', '#e7f5ff'], dusk: ['#845ef7', '#ffc9c9'] };
const peakArt = (snow = true) => (<g><path d="M10 92 L80 18 L150 92 Z" fill="#6c7a89" />{snow && <path d="M80 18 L62 38 L72 42 L80 34 L90 44 L98 38 Z" fill="#fff" />}<line x1="80" y1="18" x2="80" y2="4" stroke="#333" strokeWidth="2" /><path d="M80 4 L94 8 L80 12 Z" fill="#e8222f" /></g>);
const LANDMARK: Record<string, { sky: keyof typeof SKY; art: () => ReactElement }> = {
  paris: { sky: 'dusk', art: () => (<g fill="#3b3b3b"><path d="M80 6 L74 40 L64 92 L72 92 L80 60 L88 92 L96 92 L86 40 Z" /><rect x="68" y="40" width="24" height="4" /><rect x="64" y="64" width="32" height="4" /></g>) },
  montblanc: { sky: 'day', art: () => peakArt() },
  rom: { sky: 'warm', art: () => (<g><path d="M20 92 V40 Q80 20 140 40 V92 Z" fill="#c9a27a" stroke="#8a6b47" strokeWidth="2" />{[0, 1, 2, 3, 4].map((i) => <g key={i}><rect x={28 + i * 24} y="48" width="12" height="16" rx="6" fill="#6b4a2b" /><rect x={28 + i * 24} y="72" width="12" height="20" rx="6" fill="#6b4a2b" /></g>)}</g>) },
  athen: { sky: 'day', art: () => (<g fill="#e9e3d0" stroke="#a89f86" strokeWidth="1.5"><path d="M24 40 L80 18 L136 40 Z" /><rect x="24" y="40" width="112" height="8" />{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={30 + i * 19} y="48" width="8" height="38" />)}<rect x="20" y="86" width="120" height="6" /></g>) },
  kairo: { sky: 'warm', art: () => (<g><path d="M10 92 L56 30 L102 92 Z" fill="#d9a441" stroke="#a87a25" /><path d="M80 92 L116 46 L152 92 Z" fill="#e2b55a" stroke="#a87a25" /><circle cx="130" cy="20" r="10" fill="#fff3bf" /></g>) },
  kilimandscharo: { sky: 'warm', art: () => (<g><path d="M0 92 L50 40 L110 40 L160 92 Z" fill="#6b5b4b" /><path d="M50 40 L110 40 L100 50 L60 50 Z" fill="#fff" /><path d="M20 92 q4 -16 0 -20 q8 0 6 20 z" fill="#2f6b3a" /><circle cx="22" cy="68" r="10" fill="#3a7d44" /></g>) },
  kapstadt: { sky: 'day', art: () => (<g><path d="M0 92 L20 40 L140 40 L160 92 Z" fill="#5f6b77" /><rect x="0" y="80" width="160" height="12" fill="#1c7ed6" /></g>) },
  rio: { sky: 'day', art: () => (<g><path d="M30 92 Q80 40 130 92 Z" fill="#3a7d44" /><g fill="#f1f3f5"><rect x="77" y="22" width="6" height="34" /><rect x="58" y="28" width="44" height="5" /><circle cx="80" cy="18" r="4" /></g></g>) },
  aconcagua: { sky: 'day', art: () => peakArt() },
  newyork: { sky: 'dusk', art: () => (<g fill="#2f9e8f"><rect x="72" y="40" width="16" height="52" /><path d="M70 40 L80 22 L90 40 Z" /><path d="M86 30 L96 8 L100 10 L92 32 Z" /><circle cx="98" cy="8" r="3" fill="#ffd43b" /><path d="M72 30 L76 22 L80 30 L84 22 L88 30 Z" /></g>) },
  losangeles: { sky: 'warm', art: () => (<g><path d="M0 92 L30 50 L80 60 L120 40 L160 92 Z" fill="#a67c52" />{'HOLLYWOOD'.split('').map((ch, i) => <text key={i} x={24 + i * 13} y={66 - (i % 2) * 2} fontSize="13" fontWeight="900" fill="#fff" fontFamily="sans-serif">{ch}</text>)}</g>) },
  tokio: { sky: 'dusk', art: () => (<g stroke="#e8590c" strokeWidth="3" fill="none"><path d="M80 6 L60 92 M80 6 L100 92 M66 64 H94 M72 36 H88" /><rect x="70" y="40" width="20" height="8" fill="#e8590c" /></g>) },
  fuji: { sky: 'dusk', art: () => (<g><path d="M0 92 L60 26 L100 26 L160 92 Z" fill="#5c7cfa" /><path d="M60 26 L100 26 L108 38 L94 34 L86 42 L76 34 L66 40 L52 38 Z" fill="#fff" /><circle cx="130" cy="22" r="10" fill="#e8222f" /></g>) },
  peking: { sky: 'day', art: () => (<g><path d="M0 92 L40 60 L80 70 L120 50 L160 66 V92 Z" fill="#7a9a5a" /><path d="M0 74 L40 52 L80 62 L120 42 L160 58" stroke="#b8a27a" strokeWidth="7" fill="none" /><rect x="36" y="40" width="10" height="14" fill="#b8a27a" /><rect x="116" y="30" width="10" height="14" fill="#b8a27a" /></g>) },
  everest: { sky: 'day', art: () => peakArt() },
  dubai: { sky: 'warm', art: () => (<g fill="#adb5bd"><path d="M76 92 L76 40 L79 4 L82 40 L82 92 Z" /><path d="M70 92 V54 H76 V92 Z M82 92 V48 H90 V92 Z" /><rect x="20" y="70" width="18" height="22" /><rect x="120" y="64" width="20" height="28" /></g>) },
  istanbul: { sky: 'dusk', art: () => (<g fill="#c9a27a" stroke="#8a6b47"><rect x="40" y="56" width="80" height="36" /><path d="M50 56 Q80 20 110 56 Z" />{[24, 136].map((x) => <g key={x}><rect x={x - 3} y="20" width="6" height="72" /><path d={`M${x - 3} 20 L${x} 8 L${x + 3} 20 Z`} /></g>)}</g>) },
  heimkehr: { sky: 'day', art: () => (<g fill="#d9c8a0" stroke="#8a7a50"><rect x="24" y="40" width="112" height="10" />{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={30 + i * 19} y="50" width="8" height="42" />)}<path d="M64 40 h32 v-8 h-32 z" /><path d="M72 32 q8 -12 16 0" fill="none" strokeWidth="3" /></g>) },
};

export function Postcard({ stop, small = false }: { stop: Stop; small?: boolean }) {
  const lm = LANDMARK[stop.id] ?? LANDMARK.heimkehr;
  const [a, b] = SKY[lm.sky];
  const gid = `pc-${stop.id}`;
  return (
    <svg className={`postcard${small ? ' small' : ''}`} viewBox="0 0 160 120" role="img" aria-label={`Postkarte ${stop.name}`} data-card={stop.id}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="160" height="120" rx="6" fill="#fffaf0" />
      <rect x="4" y="4" width="152" height="92" rx="4" fill={`url(#${gid})`} />
      <g transform="translate(0 4)">{lm.art()}</g>
      <text x="8" y="112" fontSize="10" fontWeight="800" fill="#343a40" fontFamily="Georgia, serif">{stop.peak ? `Gipfel: ${stop.name}` : `Grüße aus ${stop.name.replace(' (Heimkehr)', '')}`}</text>
      <rect x="132" y="100" width="20" height="16" fill="none" stroke="#e8222f" strokeDasharray="2 1" />
    </svg>
  );
}
