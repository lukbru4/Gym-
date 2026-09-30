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
// Anatomische Körperfigur (vorne + hinten) als SVG, 200 × 460 pro Figur.
// Gezeichnet wird die linke Bildhälfte; die rechte entsteht durch Spiegeln an x = 100.
// Stil: heller Körper, alle Muskeln mit feinen hellen Linien umrandet; untrainierte
// Muskeln in Körperfarbe, trainierte in der Farbe ihrer Stufe (--level-1 … --level-5).
// ---------------------------------------------------------------------------
const MIRROR = 'matrix(-1 0 0 1 200 0)';
const both = (...ds) => ds.map((d) => `<path d="${d}"/><path d="${d}" transform="${MIRROR}"/>`).join('');

// Umriss der linken Körperhälfte: Hals → Schulter → Arm mit Hand → Rumpf → Bein mit Fuß
const OUTLINE = `M101 70 L90 70 C90 84 89 90 88 94 C80 100 66 104 56 104 C40 106 28 116 26 132
  C25 146 25 158 24 170 C23 180 22 186 21 192 C17 206 14 222 14 236
  C11 242 6 250 3 256 C2 259 4 261 6 259 L10 254 C8 262 6 270 6 274 C6 277 9 277 10 274
  L13 266 C13 272 13 278 14 281 C15 283 17 283 17 280 L18 270 C19 276 20 280 21 282
  C22 284 24 283 24 280 L23 268 C24 272 26 275 27 276 C29 277 30 275 29 273 C28 266 27 258 27 250
  C28 246 28 242 28 240 C31 226 34 212 37 200 C38 194 39 190 40 186 C43 172 46 156 50 142
  C52 160 56 180 62 200 C64 212 64 222 62 232 C56 246 51 264 52 284 C53 306 58 322 65 336
  C67 342 66 350 64 356 C58 370 58 390 64 404 C67 412 69 418 69 424
  C60 430 54 440 55 448 C56 454 70 455 94 455 C99 455 100 450 99 444 C97 434 94 426 94 418
  C94 408 96 392 97 380 C98 370 96 362 95 356 C95 350 96 342 97 336 C99 316 100 290 100 262
  L101 262 Z`;

const HEAD = '<ellipse cx="100" cy="46" rx="29" ry="33"/><ellipse cx="71" cy="52" rx="6.5" ry="9.5"/><ellipse cx="129" cy="52" rx="6.5" ry="9.5"/>';
const COWLICK = 'M99 8 C98 1 104 -2 109 2 C105 2 102 4 99 8 Z';
const HAIR_FRONT = `<path d="M71 46 C65 18 83 4 101 5 C121 5 137 19 130 46 C128 37 124 31 118 28
  C117 33 112 36 107 32 C104 37 97 38 94 33 C90 36 84 36 82 31 C77 34 73 39 71 46 Z
  M71 46 C69 52 70 58 72 61 C72 55 73 50 75 46 Z M129 46 C131 52 130 58 128 61 C128 55 127 50 125 46 Z ${COWLICK}"/>`;
const HAIR_BACK = `<path d="M68 56 C62 22 82 4 100 4 C120 4 140 22 132 56 C130 70 119 80 109 83 L91 83
  C81 80 70 70 68 56 Z ${COWLICK}"/>`;
const FACE = `<path class="brow" d="M82 39 Q89 35 96 38.5 M104 38.5 Q111 35 118 39"/>
  <ellipse class="shine" cx="89" cy="49" rx="5.2" ry="5.8"/><ellipse class="shine" cx="111" cy="49" rx="5.2" ry="5.8"/>
  <ellipse cx="90" cy="50" rx="3.2" ry="3.8"/><ellipse cx="110" cy="50" rx="3.2" ry="3.8"/>
  <circle class="shine" cx="91.2" cy="48.6" r="1.1"/><circle class="shine" cx="111.2" cy="48.6" r="1.1"/>
  <path class="brow" d="M100 55 Q98 60 101 61"/>
  <path d="M87 64 Q100 79 113 64 Q100 68.5 87 64 Z"/>
  <path class="shine" d="M89.5 65 Q100 69 110.5 65 L110 67.2 Q100 71.4 90 67.2 Z"/>`;

const DELTOID = 'M56 104 C40 106 28 116 26 132 C25 142 28 150 33 156 C38 142 44 128 52 118 C58 112 60 106 56 104 Z';
const FOREARMS = [
  'M22 192 C17 206 15 222 15 236 C19 226 24 212 28 198 C27 194 24 191 22 192 Z',
  'M30 196 C27 212 24 228 22 240 C28 230 33 216 36 202 C35 198 32 195 30 196 Z',
];

// Muskeln ohne eigene Gruppe (nur Umriss, immer Körperfarbe)
const FRONT_NEUTRAL = both(
  'M89 84 C90 90 92 96 96 102 L100 104 L100 86 Z', // Hals
  ...FOREARMS,
  'M88 262 C86 276 86 290 87 300 C92 292 97 280 99 268 L99 260 Z', // Adduktoren
  'M71 358 C69 376 71 394 76 408 C78 394 78 376 76 360 Z', // Schienbeinmuskel
  'M70 336 C68 344 72 352 78 352 C86 352 90 344 88 336 C84 332 74 332 70 336 Z' // Knie
);
const BACK_NEUTRAL = both(
  ...FOREARMS,
  'M94 292 C92 304 92 316 94 324 C98 314 99 302 99 294 Z', // Adduktoren
  'M72 404 C72 414 74 424 76 432 C78 424 80 414 80 404 Z' // Achillessehne
);

const FRONT = {
  oberer_ruecken: both('M88 90 C84 96 70 102 56 104 C68 106 80 104 90 98 C91 95 90 92 88 90 Z'),
  schultern: both(DELTOID),
  brust: both('M100 110 L100 158 C88 166 70 164 58 154 C54 146 52 132 56 122 C62 114 76 108 90 108 C94 108 98 109 100 110 Z'),
  bizeps: both('M34 158 C29 168 28 180 32 190 C36 194 42 192 44 186 C47 176 48 166 46 156 C42 150 37 152 34 158 Z'),
  bauch: both(
    'M86 164 L100 164 L100 252 C94 258 88 252 86 244 Z', // gerader Bauchmuskel
    'M62 164 C60 180 61 196 64 212 C68 222 76 230 84 234 L84 176 C78 170 70 166 62 164 Z' // schräge Bauchmuskeln
  ),
  quadrizeps: both(
    'M58 256 C54 282 58 308 66 330 C70 324 72 306 71 286 C70 272 64 262 58 256 Z',
    'M73 258 C69 284 71 310 76 328 C82 322 86 304 86 284 C86 270 80 262 73 258 Z',
    'M87 300 C82 312 80 324 82 332 C86 338 92 334 94 326 C95 316 92 306 87 300 Z'
  ),
  waden: both('M62 358 C56 374 58 392 66 404 C70 390 71 374 68 360 Z', 'M92 360 C97 374 96 390 92 402 C88 390 88 374 89 362 Z'),
};
// Linien: Sixpack, Sägemuskel
const FRONT_LINES = both('M86 184 L100 184 M86 204 L100 204 M86 224 L100 224 M56 162 L62 168 M57 172 L63 177 M58 182 L63 186');

const BACK = {
  oberer_ruecken: both(
    'M101 84 L101 196 C94 182 86 164 80 148 C74 134 66 120 56 108 C68 104 80 100 88 94 C92 90 94 86 94 84 Z', // Trapez
    'M60 124 C56 136 58 148 64 156 C72 158 80 152 82 144 C78 134 70 126 60 124 Z' // Unter-/Obergrätenmuskel
  ),
  schultern: both(DELTOID),
  trizeps: both(
    'M34 150 C29 164 28 178 32 190 C36 194 42 192 44 186 C47 174 48 162 46 150 C42 144 37 145 34 150 Z',
    'M28 134 C25 148 25 162 27 174 C29 166 31 156 34 148 Z'
  ),
  lat: both('M54 150 C54 170 58 190 64 210 C70 224 80 234 90 238 C90 218 88 200 86 184 C80 172 70 160 62 154 C59 152 56 150 54 150 Z'),
  unterer_ruecken: both('M100 200 L100 262 C95 264 91 260 90 254 L90 214 C92 206 96 202 100 200 Z'),
  gesaess: both(
    'M62 240 C60 248 60 256 62 262 C68 256 76 252 86 250 C80 244 72 240 62 240 Z', // mittlerer Gesäßmuskel
    'M100 254 L100 292 C90 302 74 300 64 290 C58 280 58 266 64 258 C74 252 88 250 100 254 Z'
  ),
  beinbeuger: both(
    'M60 296 C58 312 60 328 66 342 C70 336 72 320 72 304 C70 298 66 296 60 296 Z',
    'M74 302 C74 320 76 334 80 344 C86 340 92 328 92 314 C92 304 86 300 74 302 Z'
  ),
  waden: both(
    'M62 356 C57 370 58 386 63 396 C68 398 72 394 74 388 C74 374 70 362 62 356 Z',
    'M76 356 C74 370 74 384 77 394 C82 400 90 396 92 388 C94 374 90 362 76 356 Z',
    'M64 398 C64 408 68 416 74 420 C80 416 86 408 88 400 C80 404 70 404 64 398 Z'
  ),
};
const BACK_LINES = both('M101 84 L101 262');

function figure({ parts, neutral, lines, hair, face }, levels, offsetX, esc, interactive = true) {
  const shapes = Object.entries(parts)
    .map(([m, svg]) => {
      const r = levels.get(m);
      const title = `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
      return interactive
        ? `<g class="muscle" data-muscle="${m}" fill="var(--level-${r.level})" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${svg}</g>`
        : `<g class="muscle static" data-muscle="${m}" fill="var(--level-${r.level})">${svg}</g>`;
    })
    .join('');
  return `<g transform="translate(${offsetX} 0)">
    <g class="body-base">${both(OUTLINE)}${HEAD}</g>
    <g class="body-hair">${hair}</g>
    ${face ? `<g class="body-face">${face}</g>` : ''}
    <g class="body-neutral">${neutral}</g>${shapes}
    <g class="body-lines">${lines}</g>
  </g>`;
}

export function bodySvg(levels, esc, { interactive = true } = {}) {
  return `<div class="bodygraph-panel"><svg class="bodygraph" viewBox="0 -4 470 464" role="group" aria-label="Körpergraph: Kraft-Stufe pro Muskel, links von vorne, rechts von hinten">
    ${figure({ parts: FRONT, neutral: FRONT_NEUTRAL, lines: FRONT_LINES, hair: HAIR_FRONT, face: FACE }, levels, 0, esc, interactive)}
    ${figure({ parts: BACK, neutral: BACK_NEUTRAL, lines: BACK_LINES, hair: HAIR_BACK }, levels, 270, esc, interactive)}
  </svg></div>`;
}
