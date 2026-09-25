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
// Alle Muskeln sind umrandet; untrainierte haben die Körperfarbe, trainierte die
// Farbe ihrer Stufe (CSS-Variablen --level-1 … --level-5).
// ---------------------------------------------------------------------------
const MIRROR = 'matrix(-1 0 0 1 200 0)';
const both = (...ds) => ds.map((d) => `<path d="${d}"/><path d="${d}" transform="${MIRROR}"/>`).join('');

// Umriss der linken Körperhälfte: Hals → Schulter → Arm mit Hand → Rumpf → Bein mit Fuß
const OUTLINE = `M101 70 L89 70 C89 78 88 84 86 88 C78 92 66 94 58 96 C46 98 40 108 40 120
  C39 136 36 152 35 168 C34 176 33 182 32 188 C29 204 27 222 26 240 C25 248 25 254 25 258
  C22 262 16 268 14 272 C13 274 15 276 17 274 L22 270 C20 276 18 284 18 288 C18 291 21 291 22 288
  L25 280 C25 286 25 292 26 295 C27 297 29 297 29 294 L30 283 C31 289 32 293 33 295 C34 297 36 296 36 293
  L35 280 C36 284 38 288 39 289 C41 290 42 288 41 286 C40 280 39 272 38 264 C38 260 38 256 39 252
  C41 236 44 220 47 204 C48 196 49 192 50 188 C53 172 56 150 58 132
  C60 150 62 168 66 190 C67 204 68 214 68 222 C66 236 64 246 64 258
  C62 285 64 312 70 336 C72 346 72 352 71 360 C66 374 66 392 70 408 C72 418 73 424 73 430
  C70 436 66 442 68 446 C70 448 82 448 92 448 C96 448 97 444 95 440 C93 434 92 428 92 422
  C92 412 93 400 94 388 C95 376 93 366 92 360 C92 354 93 348 95 340 C97 318 99 296 99 282 L101 282 Z`;

const HEAD = '<ellipse cx="100" cy="44" rx="23" ry="27"/><ellipse cx="77" cy="48" rx="5" ry="8"/><ellipse cx="123" cy="48" rx="5" ry="8"/>';
const HAIR_FRONT = '<path d="M77 44 C73 24 86 13 100 13 C115 13 128 23 123 44 C121 35 114 29 106 28 C104 31 100 33 96 31 C90 31 82 34 77 44 Z"/>';
const HAIR_BACK = '<path d="M76 50 C71 26 85 13 100 13 C115 13 129 26 124 50 C122 60 116 68 110 70 L90 70 C84 68 78 60 76 50 Z"/>';
const FACE = '<ellipse cx="91" cy="47" rx="2.6" ry="3"/><ellipse cx="109" cy="47" rx="2.6" ry="3"/><path d="M93 58 Q100 64 107 58" fill="none" stroke-width="2" stroke-linecap="round"/>';

const DELTOID = 'M60 96 C48 97 41 106 41 120 C41 130 43 138 46 144 C50 132 55 120 62 110 C66 104 66 98 60 96 Z';
const FOREARMS = [
  'M33 190 C29 206 27 224 27 240 C30 232 34 214 38 196 C37 192 35 189 33 190 Z',
  'M40 192 C38 210 34 230 30 250 C36 238 42 220 46 202 C46 196 43 190 40 192 Z',
];

// Muskeln ohne eigene Gruppe (nur Umriss, immer Körperfarbe)
const FRONT_NEUTRAL = both(
  'M89 72 C90 78 92 84 96 90 L100 92 L100 74 Z', // Hals
  ...FOREARMS,
  'M92 270 C90 284 90 300 91 314 C95 306 98 292 99 280 L99 272 Z', // Adduktoren
  'M76 364 C74 380 76 398 80 414 C82 400 82 382 80 366 Z', // Schienbeinmuskel
  'M78 344 C76 350 78 358 84 360 C90 358 92 350 90 344 C86 340 82 340 78 344 Z' // Kniescheibe
);
const BACK_NEUTRAL = both(
  ...FOREARMS,
  'M96 292 C94 304 94 316 96 324 C98 314 99 302 99 294 Z', // Adduktoren
  'M78 404 C78 414 80 424 82 432 C84 424 86 414 86 404 Z' // Achillessehne
);

const FRONT = {
  oberer_ruecken: both('M88 80 C86 86 74 91 62 94 C72 96 82 95 90 90 C91 87 90 83 88 80 Z'),
  schultern: both(DELTOID),
  brust: both('M100 100 L100 146 C90 152 76 152 66 144 C60 136 58 124 62 112 C66 104 74 100 86 99 C92 98 97 99 100 100 Z'),
  bizeps: both('M46 142 C42 154 40 168 42 182 C45 188 51 186 53 180 C56 166 57 152 56 140 C52 134 48 136 46 142 Z'),
  bauch: both(
    'M88 150 L100 150 L100 246 C95 252 89 246 88 238 Z', // gerader Bauchmuskel
    'M68 152 C66 170 66 190 68 210 C72 222 80 230 86 232 L86 170 C80 162 74 156 68 152 Z' // schräge Bauchmuskeln
  ),
  quadrizeps: both(
    'M65 260 C62 288 65 316 72 340 C76 334 78 316 77 294 C76 278 72 266 65 260 Z',
    'M79 262 C75 288 77 316 82 336 C87 330 91 310 91 290 C91 276 86 266 79 262 Z',
    'M91 308 C86 322 84 334 86 342 C90 347 95 342 96 334 C97 324 95 314 91 308 Z'
  ),
  waden: both('M69 364 C64 380 66 396 72 410 C76 396 77 378 75 364 Z', 'M91 366 C95 380 95 394 92 406 C89 394 88 380 89 366 Z'),
};
// Linien: Sixpack, Sägemuskel
const FRONT_LINES = both('M88 172 L100 172 M88 194 L100 194 M88 216 L100 216 M62 150 L69 156 M63 160 L70 165 M64 170 L70 174');

const BACK = {
  oberer_ruecken: both(
    'M101 72 L101 176 C96 166 90 150 84 134 C80 124 76 112 70 104 C66 100 62 98 60 97 C70 94 80 92 86 88 C90 84 91 78 92 72 Z', // Trapez
    'M66 108 C62 118 62 128 66 136 C72 140 80 136 84 128 C80 118 74 110 66 108 Z' // Unter-/Obergrätenmuskel
  ),
  schultern: both(DELTOID),
  trizeps: both(
    'M44 140 C40 154 39 168 41 182 C45 188 51 186 53 180 C56 166 57 152 56 138 C52 132 47 134 44 140 Z',
    'M41 124 C37 136 35 150 36 164 C38 156 40 146 44 138 Z'
  ),
  lat: both('M60 136 C60 156 64 176 70 196 C76 210 84 220 92 224 C92 206 90 188 88 172 C84 160 76 148 68 140 C66 138 62 136 60 136 Z'),
  unterer_ruecken: both('M100 178 L100 250 C95 252 91 248 90 242 L90 196 C92 188 96 182 100 178 Z'),
  gesaess: both(
    'M66 238 C64 246 64 254 66 262 C72 256 80 252 88 250 C82 244 74 240 66 238 Z', // mittlerer Gesäßmuskel
    'M100 252 L100 292 C90 300 76 298 68 288 C63 278 64 266 70 258 C78 252 90 250 100 252 Z'
  ),
  beinbeuger: both(
    'M68 296 C66 314 68 330 74 344 C78 338 80 322 80 306 C78 300 74 298 68 296 Z',
    'M82 304 C82 322 82 336 84 346 C90 342 94 330 94 316 C94 306 90 300 82 304 Z'
  ),
  waden: both(
    'M70 362 C66 374 66 388 70 398 C74 400 78 396 80 390 C80 378 78 368 70 362 Z',
    'M82 362 C80 374 80 386 82 396 C86 402 92 398 93 390 C94 378 92 368 82 362 Z',
    'M72 400 C72 410 76 418 80 422 C84 418 88 410 90 402 C84 406 76 406 72 400 Z'
  ),
};
const BACK_LINES = both('M101 72 L101 250');

function figure({ parts, neutral, lines, hair, face }, levels, label, offsetX, esc) {
  const shapes = Object.entries(parts)
    .map(([m, svg]) => {
      const r = levels.get(m);
      const title = `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
      return `<g class="muscle" data-muscle="${m}" fill="var(--level-${r.level})" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${svg}</g>`;
    })
    .join('');
  return `<g transform="translate(${offsetX} 0)">
    <g class="body-base">${both(OUTLINE)}${HEAD}</g>
    <g class="body-hair">${hair}</g>
    ${face ? `<g class="body-face">${face}</g>` : ''}
    <g class="body-neutral">${neutral}</g>${shapes}
    <g class="body-lines">${lines}</g>
    <text x="100" y="472" text-anchor="middle" class="body-label">${label}</text>
  </g>`;
}

export function bodySvg(levels, esc) {
  return `<svg class="bodygraph" viewBox="0 0 420 480" role="group" aria-label="Körpergraph: Kraft-Stufe pro Muskel">
    ${figure({ parts: FRONT, neutral: FRONT_NEUTRAL, lines: FRONT_LINES, hair: HAIR_FRONT, face: FACE }, levels, 'Vorne', 0, esc)}
    ${figure({ parts: BACK, neutral: BACK_NEUTRAL, lines: BACK_LINES, hair: HAIR_BACK }, levels, 'Hinten', 220, esc)}
  </svg>`;
}
