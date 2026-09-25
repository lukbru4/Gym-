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
// Körper-Silhouette (vorne + hinten) als SVG. Farben kommen aus CSS-Variablen
// --level-0 … --level-5, damit Hell- und Dunkelmodus eigene Stufen haben.
// ---------------------------------------------------------------------------
const FRONT = {
  schultern: '<ellipse cx="35" cy="52" rx="9" ry="8"/><ellipse cx="85" cy="52" rx="9" ry="8"/>',
  brust: '<ellipse cx="49" cy="62" rx="11" ry="9"/><ellipse cx="71" cy="62" rx="11" ry="9"/>',
  bizeps: '<ellipse cx="29" cy="79" rx="6" ry="13"/><ellipse cx="91" cy="79" rx="6" ry="13"/>',
  bauch: '<rect x="50" y="74" width="20" height="40" rx="6"/>',
  quadrizeps: '<ellipse cx="50" cy="152" rx="9.5" ry="26"/><ellipse cx="70" cy="152" rx="9.5" ry="26"/>',
};
const BACK = {
  oberer_ruecken: '<path d="M60 36 L78 48 L60 72 L42 48 Z"/>',
  schultern: '<ellipse cx="35" cy="52" rx="9" ry="8"/><ellipse cx="85" cy="52" rx="9" ry="8"/>',
  trizeps: '<ellipse cx="29" cy="79" rx="6" ry="13"/><ellipse cx="91" cy="79" rx="6" ry="13"/>',
  lat: '<ellipse cx="46" cy="80" rx="8" ry="16"/><ellipse cx="74" cy="80" rx="8" ry="16"/>',
  unterer_ruecken: '<rect x="52" y="90" width="16" height="24" rx="5"/>',
  gesaess: '<ellipse cx="51" cy="128" rx="10" ry="10"/><ellipse cx="69" cy="128" rx="10" ry="10"/>',
  beinbeuger: '<ellipse cx="50" cy="162" rx="8.5" ry="22"/><ellipse cx="70" cy="162" rx="8.5" ry="22"/>',
  waden: '<ellipse cx="50" cy="206" rx="7" ry="18"/><ellipse cx="70" cy="206" rx="7" ry="18"/>',
};
// Neutrale Körperteile (Kopf, Rumpf, Unterarme, Unterschenkel …)
const BASE = `
  <circle cx="60" cy="20" r="13"/>
  <rect x="54" y="31" width="12" height="9" rx="3"/>
  <rect x="37" y="42" width="46" height="80" rx="14"/>
  <rect x="40" y="112" width="40" height="24" rx="10"/>
  <ellipse cx="29" cy="79" rx="6.5" ry="14"/><ellipse cx="91" cy="79" rx="6.5" ry="14"/>
  <ellipse cx="26" cy="110" rx="5" ry="15"/><ellipse cx="94" cy="110" rx="5" ry="15"/>
  <circle cx="25" cy="129" r="4.5"/><circle cx="95" cy="129" r="4.5"/>
  <ellipse cx="50" cy="152" rx="10" ry="27"/><ellipse cx="70" cy="152" rx="10" ry="27"/>
  <ellipse cx="50" cy="206" rx="7" ry="20"/><ellipse cx="70" cy="206" rx="7" ry="20"/>
  <ellipse cx="49" cy="230" rx="7" ry="4"/><ellipse cx="71" cy="230" rx="7" ry="4"/>`;

function figure(parts, levels, label, offsetX, esc) {
  const shapes = Object.entries(parts)
    .map(([m, svg]) => {
      const r = levels.get(m);
      const title = `${MUSCLE_NAMES.get(m)}: ${r.level ? `Stufe ${r.level}` : 'noch nicht trainiert'}`;
      return `<g class="muscle" data-muscle="${m}" fill="var(--level-${r.level})" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${svg}</g>`;
    })
    .join('');
  return `<g transform="translate(${offsetX} 0)">
    <g class="body-base">${BASE}</g>${shapes}
    <text x="60" y="252" text-anchor="middle" class="body-label">${label}</text>
  </g>`;
}

export function bodySvg(levels, esc) {
  return `<svg class="bodygraph" viewBox="0 0 250 260" role="group" aria-label="Körpergraph: Kraft-Stufe pro Muskel">
    ${figure(FRONT, levels, 'Vorne', 0, esc)}
    ${figure(BACK, levels, 'Hinten', 130, esc)}
  </svg>`;
}
