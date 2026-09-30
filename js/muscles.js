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

// Umriss der linken Körperhälfte: Hals → Schulter → Arm mit Hand → Rumpf → Bein mit Fuß.
// Eigene Zeichnung mit Bodybuilder-Proportionen: breite runde Schultern, V-Form, schmale Taille,
// kräftige Arme, Oberschenkel mit „Sweep“ und rautenförmige Waden.
const OUTLINE = `M101 62 L86 62 C86 70 86 76 86 82 C80 88 70 94 58 96
  C42 98 26 104 18 116 C12 126 11 142 12 160 C9 172 8 186 10 205 C11 208 12 210 12 212
  C6 222 4 232 5 242 C6 254 10 264 14 272
  C10 280 8 290 9 298 C10 306 15 310 20 309 C25 308 27 302 27 296 C28 288 28 280 27 274
  C28 264 30 256 32 246 C34 236 35 226 36 218 C39 206 41 194 42 180 C43 170 44 156 46 146
  C47 156 47 164 48 170 C51 182 53 192 56 200 C59 210 62 220 64 228 C65 236 64 246 60 258
  C52 270 46 284 44 300 C43 316 46 330 52 340 C56 346 60 350 62 356
  C58 366 55 376 56 386 C56 396 58 405 62 414 C64 420 66 428 68 435
  C60 442 56 448 57 452 C58 457 72 458 92 458 C98 458 99 453 98 447 C96 440 92 434 90 428
  C91 414 94 396 94 380 C94 370 93 362 92 356
  C93 344 94 336 94 330 C96 316 97 300 98 286 C99 280 100 276 100 272 L101 272 Z`;

const HEAD = '<ellipse cx="100" cy="38" rx="22" ry="27"/>';

const DELTOID = 'M58 96 C42 98 26 104 18 116 C12 126 11 142 13 158 C18 162 24 160 27 154 C30 140 36 126 44 116 C50 108 56 101 58 96 Z';
const FOREARMS = [
  'M12 214 C5 228 4 242 7 254 C13 244 19 230 24 216 C20 212 15 211 12 214 Z', // Oberarmspeichenmuskel
  'M27 218 C23 236 19 254 16 270 C23 262 29 248 33 232 C35 224 32 218 29 217 Z', // Beuger/Strecker
];
const HAND_LINES = 'M13 292 L13 303 M17 294 L17 307 M21 294 L21 306';

// Muskeln ohne eigene Gruppe (nur Umriss)
const FRONT_NEUTRAL = both(
  'M88 66 C89 76 92 88 97 98 L100 100 L100 70 Z', // Kopfwender
  'M13 162 C9 178 8 194 11 208 C14 196 16 180 17 166 Z', // Trizeps-Außenkopf (von vorn sichtbar)
  ...FOREARMS,
  'M84 272 C86 290 89 304 91 312 C95 300 97 290 98 280 L98 272 Z', // Adduktoren
  'M70 370 C68 388 70 406 74 420 C77 406 78 388 76 372 Z', // Schienbeinmuskel
  'M66 350 C64 358 68 366 76 366 C84 366 89 358 88 350 C82 346 72 346 66 350 Z' // Knie
);
const BACK_NEUTRAL = both(
  ...FOREARMS,
  'M92 300 C90 312 90 324 92 332 C95 322 97 310 97 302 Z', // Adduktoren
  'M72 414 C72 422 74 430 76 436 C78 430 80 422 80 414 Z' // Achillessehne
);

const FRONT = {
  oberer_ruecken: both('M86 70 C80 80 70 90 58 96 C70 98 82 94 90 86 C90 80 88 74 86 70 Z'),
  schultern: both(DELTOID),
  brust: both('M100 104 L100 162 C90 172 72 172 58 164 C50 158 46 148 46 140 C48 128 52 118 58 110 C68 104 84 102 100 104 Z'),
  bizeps: both('M30 158 C22 168 18 184 20 200 C22 212 30 216 36 212 C41 200 43 184 42 168 C40 158 34 154 30 158 Z'),
  bauch: both(
    'M86 166 L100 166 L100 262 C94 268 88 262 86 252 Z', // gerader Bauchmuskel
    'M60 170 C58 186 60 204 64 220 C68 232 75 242 84 246 L84 180 C77 174 68 170 60 170 Z' // schräge Bauchmuskeln
  ),
  quadrizeps: both(
    'M59 263 C49 284 46 310 52 334 C56 344 63 348 68 342 C70 318 70 290 66 270 C64 264 61 261 59 263 Z', // äußerer
    'M70 264 C66 290 68 318 74 340 C78 348 84 346 86 338 C88 312 86 286 80 270 C77 264 73 262 70 264 Z', // gerader
    'M88 314 C80 324 78 338 81 350 C85 357 91 355 92 346 C93 334 92 322 88 314 Z' // innerer („Tropfen“)
  ),
  waden: both('M61 368 C56 382 57 398 63 410 C68 398 69 382 67 370 Z', 'M87 370 C92 382 92 398 88 410 C85 398 84 384 85 372 Z'),
};
// Linien: Sixpack, Sägemuskel, Finger
const FRONT_LINES = both(`M86 186 L100 186 M86 206 L100 206 M86 228 L100 228 M50 170 L57 176 M51 180 L58 185 M53 190 L59 194 ${HAND_LINES}`);

const BACK = {
  oberer_ruecken: both(
    'M101 70 L101 196 C94 182 86 164 80 148 C72 130 64 114 56 100 C68 96 80 90 86 82 C88 76 88 72 88 70 Z', // Trapez
    'M58 118 C52 130 54 144 62 152 C70 154 78 148 80 140 C76 128 68 120 58 118 Z' // Unter-/Obergrätenmuskel
  ),
  schultern: both(DELTOID),
  trizeps: both('M26 156 C16 168 12 186 14 202 C18 212 30 216 38 208 C43 194 44 176 42 162 C38 152 30 150 26 156 Z'),
  lat: both('M48 150 C48 170 53 192 61 212 C68 228 80 240 92 244 C92 222 90 200 88 184 C80 170 68 158 56 152 C52 150 50 149 48 150 Z'),
  unterer_ruecken: both('M100 196 L100 266 C95 268 91 264 90 258 L90 212 C92 204 96 200 100 196 Z'),
  gesaess: both(
    'M64 244 C62 252 62 258 62 264 C69 259 77 256 86 254 C80 248 72 244 64 244 Z', // mittlerer Gesäßmuskel
    'M100 258 L100 298 C90 308 72 306 62 294 C56 284 56 270 62 264 C74 257 88 255 100 258 Z'
  ),
  beinbeuger: both(
    'M50 302 C47 318 51 334 60 346 C67 340 70 322 70 306 C65 300 57 298 50 302 Z',
    'M73 308 C73 326 76 340 81 350 C88 346 93 334 93 318 C93 308 86 304 73 308 Z'
  ),
  waden: both(
    'M60 364 C54 378 55 394 61 404 C66 406 71 402 73 396 C73 382 69 370 60 364 Z',
    'M76 364 C74 378 74 392 77 402 C82 408 91 404 93 396 C95 382 90 370 76 364 Z',
    'M62 406 C62 416 67 424 74 428 C80 424 86 416 88 408 C80 412 70 412 62 406 Z'
  ),
};
const BACK_LINES = both(`M101 70 L101 266 ${HAND_LINES}`);

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

// ---------------------------------------------------------------------------
// Kategorien für die Übungsauswahl (Suche + Filter)
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  ['alle', 'Alle'],
  ['brust', 'Brust'],
  ['ruecken', 'Rücken'],
  ['schultern', 'Schultern'],
  ['arme', 'Arme'],
  ['bauch', 'Bauch'],
  ['beine', 'Beine'],
  ['cardio', 'Cardio'],
  ['eigene', 'Eigene'],
];
const CATEGORY_OF_MUSCLE = {
  brust: 'brust',
  oberer_ruecken: 'ruecken', lat: 'ruecken', unterer_ruecken: 'ruecken',
  schultern: 'schultern',
  bizeps: 'arme', trizeps: 'arme',
  bauch: 'bauch',
  quadrizeps: 'beine', beinbeuger: 'beine', waden: 'beine', gesaess: 'beine',
};

// Kategorien einer Übung (eine Übung kann in mehreren stehen, z. B. Dips: Arme + Brust)
export function exerciseCategories(ex) {
  const cats = new Set();
  if (ex.type === 'cardio') cats.add('cardio');
  for (const m of musclesOf(ex)) if (CATEGORY_OF_MUSCLE[m]) cats.add(CATEGORY_OF_MUSCLE[m]);
  if (ex.user_id) cats.add('eigene');
  return cats;
}

// Kleinschreibung ohne Akzente/Umlaute-Punkte: „drucken“ findet „Drücken“
const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

// Filtert nach Kategorie und Suchtext. Jedes Suchwort muss im Namen oder in einem Muskelnamen vorkommen.
export function filterExercises(exercises, { query = '', category = 'alle' } = {}) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return exercises.filter((ex) => {
    if (category !== 'alle' && !exerciseCategories(ex).has(category)) return false;
    if (!words.length) return true;
    const hay = normalize([ex.name, ...musclesOf(ex).map((m) => MUSCLE_NAMES.get(m) || m)].join(' '));
    return words.every((w) => hay.includes(w));
  });
}
