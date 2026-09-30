// Muskelgruppen, Zuordnung der Übungen und Kraft-Stufe für den Körpergraphen.
import { estimate1RM, isWorkingSet, addDays } from './stats.js';

export const MUSCLES = [
  ['brust', 'Brust'],
  ['schultern', 'Schultern'],
  ['bizeps', 'Bizeps'],
  ['trizeps', 'Trizeps'],
  ['bauch', 'Bauch'],
  ['oberer_ruecken', 'Oberer Rücken'],
  ['lat', 'Latissimus'],
  ['unterer_ruecken', 'Unterer Rücken'],
  ['gesaess', 'Gesäß'],
  ['quadrizeps', 'Oberschenkel vorne'],
  ['beinbeuger', 'Oberschenkel hinten'],
  ['waden', 'Waden'],
];
export const MUSCLE_NAMES = new Map(MUSCLES);

// Hauptmuskeln der Standardübungen (gleiche Werte wie in supabase/schema.sql).
export const DEFAULT_MUSCLES = {
  'Bankdrücken': ['brust'],
  'Schrägbankdrücken': ['brust'],
  'Kurzhantel-Bankdrücken': ['brust'],
  'Butterfly': ['brust'],
  'Dips': ['trizeps', 'brust'],
  'Kniebeuge': ['quadrizeps', 'gesaess'],
  'Beinpresse': ['quadrizeps'],
  'Ausfallschritte': ['quadrizeps', 'gesaess'],
  'Beinstrecker': ['quadrizeps'],
  'Beinbeuger': ['beinbeuger'],
  'Wadenheben': ['waden'],
  'Kreuzheben': ['unterer_ruecken', 'gesaess'],
  'Rumänisches Kreuzheben': ['beinbeuger', 'gesaess'],
  'Klimmzüge': ['lat'],
  'Latziehen': ['lat'],
  'Langhantelrudern': ['oberer_ruecken', 'lat'],
  'Kabelrudern': ['oberer_ruecken'],
  'Schulterdrücken': ['schultern'],
  'Seitheben': ['schultern'],
  'Face Pulls': ['schultern'],
  'Bizepscurls': ['bizeps'],
  'Hammercurls': ['bizeps'],
  'Trizepsdrücken am Kabel': ['trizeps'],
  'French Press': ['trizeps'],
  'Crunches': ['bauch'],
  'Plank': ['bauch'],
  // Nur in der App (nicht in schema.sql): so wird eine selbst angelegte Übung dieses Namens automatisch zugeordnet
  'Hip Thrust': ['gesaess', 'beinbeuger'],
};

export const musclesOf = (exercise) =>
  exercise?.muscles?.length ? exercise.muscles : DEFAULT_MUSCLES[exercise?.name] || [];

// Grenzen der Stufen: Steigerung des geschätzten 1RM gegenüber dem ersten Training.
export const LEVELS = [
  { level: 1, from: -Infinity, label: 'unter 5 %' },
  { level: 2, from: 0.05, label: '5–15 %' },
  { level: 3, from: 0.15, label: '15–30 %' },
  { level: 4, from: 0.3, label: '30–50 %' },
  { level: 5, from: 0.5, label: 'über 50 %' },
];
const levelFor = (gain) => [...LEVELS].reverse().find((l) => gain >= l.from).level;

// sets: [{ exercise_id, date, reps, weight_kg, is_warmup }]
// exercises: Map(id -> { name, type, muscles })
// Liefert Map(muskel -> { level, gain, exercises: [{ name, first, current, gain }] }).
// level 0 = noch nicht trainiert.
export function strengthLevels(sets, exercises, today, recentDays = 30) {
  const since = addDays(today, -recentDays);
  const sessions = new Map(); // exercise_id -> Map(date -> bestes e1RM)
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const e = estimate1RM(Number(s.weight_kg) || 0, Number(s.reps) || 0);
    if (e <= 0) continue;
    if (!sessions.has(s.exercise_id)) sessions.set(s.exercise_id, new Map());
    const byDate = sessions.get(s.exercise_id);
    byDate.set(s.date, Math.max(byDate.get(s.date) || 0, e));
  }

  const result = new Map(MUSCLES.map(([id]) => [id, { level: 0, gain: null, exercises: [] }]));
  for (const [exId, byDate] of sessions) {
    const ex = exercises.get(exId);
    if (!ex || ex.type === 'cardio') continue;
    const dates = [...byDate.keys()].sort();
    const first = byDate.get(dates[0]);
    const recent = dates.filter((d) => d >= since);
    const current = recent.length ? Math.max(...recent.map((d) => byDate.get(d))) : byDate.get(dates[dates.length - 1]);
    const gain = current / first - 1;
    for (const m of musclesOf(ex)) {
      result.get(m)?.exercises.push({ name: ex.name, first, current, gain });
    }
  }
  for (const r of result.values()) {
    if (!r.exercises.length) continue;
    r.gain = r.exercises.reduce((sum, e) => sum + e.gain, 0) / r.exercises.length;
    r.level = levelFor(r.gain);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Körperfigur (vorne + hinten) als Neon-Drahtgitter, 200 × 460 pro Figur.
// Gezeichnet wird die linke Bildhälfte; die rechte entsteht durch Spiegeln an x = 100.
// Stil: nur leuchtende Umrisse auf dunklem Grund, ohne Gesicht. Trainierte Muskeln
// glühen in der Neonfarbe des Farbschemas – je höher die Stufe, desto heller (--glow-1 … --glow-5).
// ---------------------------------------------------------------------------
const MIRROR = 'matrix(-1 0 0 1 200 0)';
const both = (...ds) => ds.map((d) => `<path d="${d}"/><path d="${d}" transform="${MIRROR}"/>`).join('');

// Umriss der linken Körperhälfte: Hals → Schulter → Arm mit Hand → Rumpf → Bein mit Fuß
// (athletische Proportionen: breite Schultern, kräftige Ober- und Unterarme)
const OUTLINE = `M101 72 L90 72 C90 82 89 90 87 95 C80 101 70 104 60 106
  C44 108 32 116 27 130 C23 140 22 152 22 162 C21 176 19 188 18 198
  C15 210 13 222 14 234 C15 246 18 256 20 264
  C16 270 12 280 12 290 C12 298 16 304 20 304 C24 304 27 300 28 294 C30 286 32 276 33 268
  C35 258 37 246 40 234 C42 224 44 212 45 202 C47 190 49 176 50 164 C51 156 52 150 53 146
  C55 160 57 176 60 194 C62 208 64 220 63 232 C62 242 60 250 59 258
  C55 280 55 304 60 326 C62 336 64 344 65 352 C60 366 59 384 63 400 C66 412 69 422 70 430
  C62 436 56 444 57 450 C58 456 72 457 92 457 C98 457 99 452 98 446
  C96 436 94 428 93 420 C93 404 95 386 94 372 C94 362 94 356 95 350
  C98 334 99 312 99 290 C99 280 100 272 100 268 L101 268 Z`;

const HEAD = '<ellipse cx="100" cy="44" rx="27" ry="32"/>';

const DELTOID = 'M62 106 C46 107 32 115 27 130 C23 141 22 150 23 158 C27 162 31 161 34 156 C38 144 44 134 50 126 C54 120 58 113 62 106 Z';
const FOREARMS = [
  'M17 206 C13 218 12 230 14 242 C19 236 24 224 30 210 C27 205 21 203 17 206 Z', // Oberarmspeichenmuskel
  'M32 208 C28 224 25 242 22 260 C30 252 37 238 41 222 C43 214 40 208 36 207 Z', // Beuger/Strecker
];

// Muskeln ohne eigene Gruppe (nur Umriss)
const FRONT_NEUTRAL = both(
  'M89 86 C90 92 92 98 96 104 L100 106 L100 88 Z', // Hals
  ...FOREARMS,
  'M89 266 C87 280 88 292 90 298 C94 290 98 280 99 270 L99 264 Z', // Adduktoren
  'M73 362 C71 380 73 398 77 412 C79 398 80 380 78 364 Z', // Schienbeinmuskel
  'M68 340 C66 348 70 356 78 356 C86 356 90 348 88 340 C84 336 72 336 68 340 Z' // Knie
);
const BACK_NEUTRAL = both(
  ...FOREARMS,
  'M94 294 C92 306 92 318 94 326 C98 316 99 304 99 296 Z', // Adduktoren
  'M73 406 C73 416 75 426 77 432 C79 426 81 416 81 406 Z' // Achillessehne
);

const FRONT = {
  oberer_ruecken: both('M87 95 C80 101 70 104 60 106 C70 108 80 107 90 102 C91 99 90 97 87 95 Z'),
  schultern: both(DELTOID),
  brust: both('M100 112 L100 164 C88 172 72 170 60 160 C55 152 53 140 56 128 C60 118 72 112 86 110 C92 110 97 111 100 112 Z'),
  bizeps: both('M33 160 C26 170 24 184 26 196 C29 205 38 208 44 203 C49 192 51 178 50 164 C47 156 38 154 33 160 Z'),
  bauch: both(
    'M86 166 L100 166 L100 254 C94 260 88 254 86 246 Z', // gerader Bauchmuskel
    'M64 168 C62 184 63 200 65 214 C68 226 75 234 84 238 L84 178 C78 172 70 168 64 168 Z' // schräge Bauchmuskeln
  ),
  quadrizeps: both(
    'M59 262 C54 284 54 308 61 332 C66 340 72 338 74 328 C76 306 74 282 68 266 C66 262 62 260 59 262 Z', // äußerer
    'M76 262 C72 284 73 308 78 330 C82 337 88 335 89 326 C91 304 90 282 86 268 C83 262 79 260 76 262 Z', // gerader
    'M92 298 C85 310 83 326 86 338 C90 344 96 341 97 332 C98 320 97 308 92 298 Z' // innerer
  ),
  waden: both('M64 360 C59 374 60 390 66 402 C70 390 71 374 69 362 Z', 'M92 362 C96 376 95 390 91 402 C88 390 87 374 89 364 Z'),
};
// Linien: Sixpack, Sägemuskel
const HAND_LINES = 'M17 288 L17 299 M21 290 L21 303 M25 289 L25 301';
const FRONT_LINES = both(`M86 186 L100 186 M86 206 L100 206 M86 226 L100 226 M58 166 L64 172 M59 176 L65 181 M60 186 L65 190 ${HAND_LINES}`);

const BACK = {
  oberer_ruecken: both(
    'M101 84 L101 200 C94 186 86 168 80 152 C74 138 68 124 60 110 C70 106 80 102 87 96 C92 92 94 88 94 84 Z', // Trapez
    'M62 126 C58 138 60 150 66 158 C74 160 82 154 84 146 C80 136 72 128 62 126 Z' // Unter-/Obergrätenmuskel
  ),
  schultern: both(DELTOID),
  trizeps: both('M29 158 C24 170 23 186 26 198 C30 206 41 208 46 200 C50 188 51 172 49 160 C45 152 34 151 29 158 Z'),
  lat: both('M57 152 C57 172 60 194 65 212 C71 226 80 236 90 240 C90 220 88 200 86 184 C80 172 70 160 62 154 C60 152 58 151 57 152 Z'),
  unterer_ruecken: both('M100 200 L100 262 C95 264 91 260 90 254 L90 214 C92 206 96 202 100 200 Z'),
  gesaess: both(
    'M62 240 C60 248 60 256 61 262 C68 256 76 252 86 250 C80 244 72 240 62 240 Z', // mittlerer Gesäßmuskel
    'M100 254 L100 294 C90 304 74 302 64 292 C58 282 57 268 62 260 C74 253 88 251 100 254 Z'
  ),
  beinbeuger: both(
    'M59 298 C56 314 58 330 64 342 C70 336 73 320 73 304 C70 298 64 296 59 298 Z',
    'M75 304 C75 322 77 336 81 346 C88 342 94 330 94 316 C94 306 88 302 75 304 Z'
  ),
  waden: both(
    'M62 356 C57 370 58 386 63 398 C68 400 72 396 74 390 C74 376 70 364 62 356 Z',
    'M77 356 C75 370 75 384 78 396 C83 402 91 398 93 390 C95 376 91 364 77 356 Z',
    'M64 400 C64 410 68 418 74 422 C80 418 86 410 88 402 C80 406 70 406 64 400 Z'
  ),
};
const BACK_LINES = both(`M101 84 L101 262 ${HAND_LINES}`);

function figure({ parts, neutral, lines }, levels, offsetX, esc, interactive = true) {
  const shapes = Object.entries(parts)
    .map(([m, svg]) => {
      const r = levels.get(m);
      const title = `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
      const cls = `muscle lv-${r.level}`;
      return interactive
        ? `<g class="${cls}" data-muscle="${m}" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${svg}</g>`
        : `<g class="${cls} static" data-muscle="${m}">${svg}</g>`;
    })
    .join('');
  return `<g transform="translate(${offsetX} 0)">
    <g class="body-base">${both(OUTLINE)}${HEAD}</g>
    <g class="body-neutral">${neutral}</g>${shapes}
    <g class="body-lines">${lines}</g>
  </g>`;
}

// Leuchten für die höheren Stufen (per CSS über filter: url(#neon-glow) eingesetzt)
const GLOW_FILTER = `<defs><filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

export function bodySvg(levels, esc, { interactive = true } = {}) {
  return `<div class="bodygraph-panel"><svg class="bodygraph" viewBox="0 6 470 454" role="group" aria-label="Körpergraph: Kraft-Stufe pro Muskel, links von vorne, rechts von hinten">
    ${GLOW_FILTER}
    ${figure({ parts: FRONT, neutral: FRONT_NEUTRAL, lines: FRONT_LINES }, levels, 0, esc, interactive)}
    ${figure({ parts: BACK, neutral: BACK_NEUTRAL, lines: BACK_LINES }, levels, 270, esc, interactive)}
  </svg></div>`;
}

// Muskel-Radar: Netzdiagramm aller 12 Muskelgruppen, je weiter außen, desto höher die Stufe.
const SHORT_NAMES = {
  oberer_ruecken: 'Ob. Rücken', unterer_ruecken: 'Unt. Rücken',
  quadrizeps: 'Beine vorne', beinbeuger: 'Beine hinten',
};
export function radarSvg(levels, esc) {
  const n = MUSCLES.length;
  const cx = 250, cy = 200, R = 130;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const xy = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const radius = (id) => (R * Math.max(0.04, levels.get(id).level / 5));
  let grid = '';
  for (let k = 1; k <= 5; k++) grid += `<polygon points="${MUSCLES.map((_, i) => xy(pt(i, (R * k) / 5))).join(' ')}"/>`;
  grid += MUSCLES.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const shape = MUSCLES.map(([id], i) => xy(pt(i, radius(id)))).join(' ');
  const dots = MUSCLES.map(([id], i) => { const [x, y] = pt(i, radius(id)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; }).join('');
  const labels = MUSCLES.map(([id, name], i) => {
    const [x, y] = pt(i, R + 24);
    const anchor = Math.abs(x - cx) < 8 ? 'middle' : x < cx ? 'end' : 'start';
    const lv = levels.get(id).level;
    return `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="${anchor}" class="${lv ? 'on' : ''}">${esc(SHORT_NAMES[id] || name)}${lv ? ` · ${lv}` : ''}</text>`;
  }).join('');
  const summary = MUSCLES.map(([id, name]) => `${name} ${levels.get(id).level}`).join(', ');
  return `<div class="bodygraph-panel"><svg class="radar" viewBox="-40 0 580 400" role="img" aria-label="${esc(`Muskel-Radar (Stufe 0–5): ${summary}`)}">
    ${GLOW_FILTER}
    <g class="radar-grid">${grid}</g>
    <polygon class="radar-shape" points="${shape}"/>
    <g class="radar-dots">${dots}</g>
    <g class="radar-labels">${labels}</g>
  </svg></div>`;
}
