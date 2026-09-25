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
// Anatomische Körper-Silhouette (vorne + hinten) als SVG, 200 × 450 pro Figur.
// Gezeichnet wird jeweils die linke Bildhälfte; die rechte entsteht durch Spiegeln
// an der Mittelachse x = 100. Farben kommen aus CSS-Variablen --level-0 … --level-5,
// damit Hell- und Dunkelmodus eigene Stufen haben.
// ---------------------------------------------------------------------------
const MIRROR = 'matrix(-1 0 0 1 200 0)';
const both = (d) => `<path d="${d}"/><path d="${d}" transform="${MIRROR}"/>`;

// Umriss der linken Körperhälfte (Hals → Schulter → Arm → Rumpf → Bein)
const OUTLINE = `M101 62 L88 64 C88 72 87 78 84 82 C74 86 60 86 50 90 C40 94 36 104 36 116
  C35 135 32 155 30 180 C28 190 26 196 25 205 C22 225 20 245 21 262
  C18 272 18 286 24 292 C30 296 34 290 34 282 C35 274 36 268 36 262
  C40 245 44 225 46 205 C47 196 48 190 50 182 C52 160 54 140 56 128
  C58 150 62 175 66 200 C64 220 60 235 62 255 C62 290 66 320 70 345
  C71 355 70 362 71 370 C66 385 66 405 72 420 C70 428 66 434 70 438 L94 438
  C96 432 94 426 92 420 C94 405 95 385 92 370 C92 362 93 355 94 345
  C96 320 98 290 100 268 L101 268 Z`; // endet 1px hinter der Mitte → keine Naht beim Spiegeln
const BASE = `<ellipse cx="100" cy="38" rx="21" ry="26"/>${both(OUTLINE)}`;

// Deltamuskel und Oberarm sind vorne und hinten gleich geformt
const DELTOID = 'M52 90 C42 93 37 104 37 118 C38 128 42 134 46 138 C50 126 54 112 60 100 C62 95 58 90 52 90 Z';
const UPPER_ARM = 'M41 130 C37 144 36 160 38 177 C42 184 48 182 50 176 C53 160 54 144 53 132 C49 125 43 125 41 130 Z';

const FRONT = {
  schultern: both(DELTOID),
  brust: both('M100 96 L100 139 C88 146 73 146 63 137 C58 128 58 113 62 102 C72 96 86 94 100 96 Z'),
  bizeps: both(UPPER_ARM),
  bauch: both('M88 146 L100 146 L100 234 C94 239 88 237 86 229 L84 160 C84 152 85 148 88 146 Z') +
    both('M80 150 C74 170 72 195 74 215 C77 225 81 228 83 222 L82 160 C82 154 81 150 80 150 Z'),
  quadrizeps: both('M68 256 C66 285 70 318 76 340 C82 346 90 344 92 338 C96 310 97 285 96 270 C88 264 76 258 68 256 Z'),
  waden: both('M71 372 C67 388 68 404 74 414 C77 400 77 385 75 372 Z'),
  // vorne sichtbarer Teil des Trapezmuskels zwischen Hals und Schulter
  oberer_ruecken: both('M87 76 C84 82 70 86 56 89 C66 92 78 91 88 86 C90 83 89 79 87 76 Z'),
};
// Sixpack-Unterteilung und Trennlinie im Oberschenkel (nur Linien)
const FRONT_DETAIL = both('M85 170 L100 170 M85 192 L100 192 M85 213 L100 213 M84 266 C82 292 84 318 88 336');
// Trennlinien zwischen den Muskelköpfen von Beinbeuger und Wade
const BACK_DETAIL = both('M82 292 C81 310 82 326 84 342 M80 362 C79 380 80 395 81 409');

const BACK = {
  oberer_ruecken: both('M100 64 L100 150 C94 140 86 122 78 108 C70 100 60 94 53 91 C64 86 78 84 86 78 C90 72 92 66 100 64 Z'),
  schultern: both(DELTOID),
  trizeps: both(UPPER_ARM),
  lat: both('M58 112 C54 138 60 170 72 204 C78 214 85 219 88 213 C88 196 86 176 88 158 C84 140 72 118 58 112 Z'),
  // Rückenstrecker: zwei Stränge links und rechts der Wirbelsäule
  unterer_ruecken: both('M98 164 L98 238 C94 241 90 238 90 232 L90 172 C91 167 95 163 98 164 Z'),
  gesaess: both('M100 241 L100 280 C88 288 72 286 65 274 C60 262 62 248 68 239 C78 234 90 236 100 241 Z'),
  beinbeuger: both('M68 287 C66 307 70 326 76 342 C82 348 90 346 92 340 C96 318 96 302 95 290 C86 294 76 292 68 287 Z'),
  waden: both('M70 360 C64 375 66 395 74 410 C80 414 86 412 90 405 C94 390 94 372 90 360 C84 356 76 356 70 360 Z'),
};

function figure(parts, levels, label, offsetX, esc, detail = '') {
  const shapes = Object.entries(parts)
    .map(([m, svg]) => {
      const r = levels.get(m);
      const title = `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
      return `<g class="muscle" data-muscle="${m}" fill="var(--level-${r.level})" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${svg}</g>`;
    })
    .join('');
  return `<g transform="translate(${offsetX} 0)">
    <g class="body-base">${BASE}</g>${shapes}<g class="body-detail">${detail}</g>
    <text x="100" y="458" text-anchor="middle" class="body-label">${label}</text>
  </g>`;
}

export function bodySvg(levels, esc) {
  return `<svg class="bodygraph" viewBox="0 0 420 466" role="group" aria-label="Körpergraph: Kraft-Stufe pro Muskel">
    ${figure(FRONT, levels, 'Vorne', 0, esc, FRONT_DETAIL)}
    ${figure(BACK, levels, 'Hinten', 220, esc, BACK_DETAIL)}
  </svg>`;
}
