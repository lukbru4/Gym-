// Fragebogen → persönlicher Trainingsplan. Reine Logik (ohne React), damit sie testbar ist.
// Der Plan besteht aus Vorlagen („Plan · Push“ …) mit Übungen aus dem Standard-Katalog, Sätzen und Wiederholungen,
// dazu ein Wochenplan (welcher Tag welche Vorlage) und das Wochenziel. Gewichte trägt man beim ersten Training ein.

export type Answers = Record<string, string | string[]>;

export interface Question {
  id: string;
  q: string;
  hint?: string;
  type: 'one' | 'multi' | 'range';
  options?: [string, string][];
  min?: number;
  max?: number;
  def?: number;
  step?: number;
  unit?: string;
  /** Frage nur stellen, wenn … */
  when?: (a: Answers) => boolean;
}

const WEEKDAYS: [string, string][] = [['Mo', 'Montag'], ['Di', 'Dienstag'], ['Mi', 'Mittwoch'], ['Do', 'Donnerstag'], ['Fr', 'Freitag'], ['Sa', 'Samstag'], ['So', 'Sonntag']];

export const QUESTIONS: Question[] = [
  { id: 'goal', q: 'Was ist dein Hauptziel?', type: 'one', options: [['muskel', 'Muskelaufbau'], ['kraft', 'Stärker werden'], ['abnehmen', 'Abnehmen / definieren'], ['fit', 'Fit & gesund bleiben'], ['ausdauer', 'Ausdauer verbessern']] },
  { id: 'sex', q: 'Dein Geschlecht', hint: 'Optional.', type: 'one', options: [['m', 'Männlich'], ['w', 'Weiblich'], ['d', 'Divers'], ['x', 'Keine Angabe']] },
  { id: 'age', q: 'Wie alt bist du?', type: 'range', min: 14, max: 90, def: 30, step: 1, unit: 'Jahre' },
  { id: 'height', q: 'Wie groß bist du?', type: 'range', min: 120, max: 220, def: 175, step: 1, unit: 'cm' },
  { id: 'weight', q: 'Wie viel wiegst du?', type: 'range', min: 35, max: 200, def: 75, step: 0.5, unit: 'kg' },
  { id: 'exp', q: 'Wie lange trainierst du schon mit Gewichten?', type: 'one', options: [['neu', 'Gar nicht / gerade angefangen'], ['basis', 'Unter 1 Jahr'], ['mittel', '1–3 Jahre'], ['profi', 'Über 3 Jahre']] },
  { id: 'days', q: 'Wie oft pro Woche willst du trainieren?', hint: 'Wird dein Wochenziel für die Serie.', type: 'one', options: [['1', '1× pro Woche'], ['2', '2× pro Woche'], ['3', '3× pro Woche'], ['4', '4× pro Woche'], ['5', '5× pro Woche'], ['6', '6× pro Woche']] },
  { id: 'duration', q: 'Wie lange darf ein Training dauern?', type: 'one', options: [['30', '30 Minuten'], ['45', '45 Minuten'], ['60', '60 Minuten'], ['90', '90 Minuten']] },
  { id: 'place', q: 'Wo trainierst du?', type: 'one', options: [['gym', 'Im Fitnessstudio'], ['homeDb', 'Zuhause mit Gewichten'], ['homeBw', 'Zuhause ohne Geräte']] },
  { id: 'equip', q: 'Welche Geräte hast du zuhause?', hint: 'Mehrere möglich.', type: 'multi', when: (a) => a.place === 'homeDb', options: [['lh', 'Langhantel'], ['kh', 'Kurzhanteln'], ['kl', 'Klimmzugstange'], ['ba', 'Bänder']] },
  { id: 'focus', q: 'Welche Muskeln sind dir besonders wichtig?', hint: 'Mehrere möglich.', type: 'multi', options: [['brust', 'Brust'], ['ruecken', 'Rücken'], ['schultern', 'Schultern'], ['arme', 'Arme'], ['beine', 'Beine'], ['bauch', 'Bauch'], ['alles', 'Alles gleich']] },
  { id: 'fav', q: 'Welche Übungen magst du?', hint: 'Kommen bevorzugt in deinen Plan. Mehrere möglich.', type: 'multi', options: [['bank', 'Bankdrücken'], ['squat', 'Kniebeuge'], ['dead', 'Kreuzheben'], ['pull', 'Klimmzüge'], ['ohp', 'Schulterdrücken'], ['row', 'Rudern'], ['lat', 'Latziehen'], ['curl', 'Bizepscurls']] },
  { id: 'pain', q: 'Hast du Beschwerden?', hint: 'Solche Übungen lassen wir weg. Bei Schmerzen bitte ärztlich abklären.', type: 'multi', options: [['keine', 'Keine'], ['knie', 'Knie'], ['ruecken', 'Unterer Rücken'], ['schulter', 'Schulter'], ['ellbogen', 'Ellbogen'], ['handgelenk', 'Handgelenk']] },
  { id: 'cardio', q: 'Wie viel Cardio möchtest du pro Training?', type: 'one', options: [['0', 'Keins'], ['10', 'Ein bisschen (10 Min.)'], ['20', 'Regelmäßig (20 Min.)']] },
  { id: 'weekdays', q: 'An welchen Tagen kannst du?', hint: 'Mehrere möglich – darauf verteilen wir die Trainings.', type: 'multi', options: WEEKDAYS },
  { id: 'time', q: 'Wann trainierst du meistens?', type: 'one', options: [['morgens', 'Morgens'], ['mittags', 'Mittags'], ['abends', 'Abends'], ['wechselnd', 'Wechselnd']] },
  { id: 'sleep', q: 'Wie viel schläfst du meistens?', type: 'one', options: [['5', 'Unter 6 Stunden'], ['7', '6–7 Stunden'], ['8', '7–8 Stunden'], ['9', 'Über 8 Stunden']] },
  { id: 'food', q: 'Achtest du auf deine Ernährung?', type: 'one', options: [['nein', 'Eher nicht'], ['etwas', 'Ein bisschen'], ['ja', 'Ja, auch auf Eiweiß']] },
  { id: 'motivation', q: 'Was motiviert dich am meisten?', hint: 'Mehrere möglich.', type: 'multi', options: [['freunde', 'Mit Freunden messen'], ['zahlen', 'Fortschritt in Zahlen sehen'], ['abzeichen', 'Level, Ränge & Abzeichen'], ['optik', 'Wie ich aussehe']] },
  { id: 'intensity', q: 'Wie hart willst du trainieren?', type: 'one', options: [['locker', 'Locker (2–3 Wiederholungen Reserve)'], ['mittel', 'Ordentlich (1–2 Reserve)'], ['hart', 'Bis ans Limit (0–1 Reserve)']] },
];

/** Fragen, die bei den bisherigen Antworten gestellt werden */
export const activeQuestions = (a: Answers) => QUESTIONS.filter((q) => !q.when || q.when(a));

export const isAnswered = (q: Question, a: Answers) => {
  const v = a[q.id];
  return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '';
};
export const answerLabel = (q: Question, a: Answers): string => {
  const v = a[q.id];
  if (q.type === 'range') return v === undefined ? '–' : `${v} ${q.unit ?? ''}`.trim();
  const name = (x: string) => q.options?.find((o) => o[0] === x)?.[1] ?? x;
  return Array.isArray(v) ? v.map(name).join(', ') || '–' : v === undefined ? '–' : name(v);
};

// ---- Übungen aus dem Standard-Katalog -----------------------------------------------------------
type Equip = 'lh' | 'kh' | 'ma' | 'ka' | 'kl' | 'ba' | 'none';
interface Pick { name: string; equip: Equip[]; pain?: string[]; muscles: string[] }
const E = (name: string, equip: Equip[], muscles: string[], pain: string[] = []): Pick => ({ name, equip, muscles, pain });

const P = {
  bank: E('Bankdrücken', ['lh'], ['brust'], ['schulter', 'handgelenk']),
  schraeg: E('Schrägbankdrücken', ['lh', 'kh'], ['brust', 'schultern'], ['schulter']),
  khBank: E('Kurzhantel-Bankdrücken', ['kh'], ['brust'], ['schulter']),
  butterfly: E('Butterfly', ['ma'], ['brust'], ['schulter']),
  dips: E('Dips', ['none'], ['brust', 'arme'], ['schulter', 'ellbogen']),
  squat: E('Kniebeuge', ['lh'], ['beine'], ['knie', 'ruecken']),
  presse: E('Beinpresse', ['ma'], ['beine'], ['knie']),
  lunge: E('Ausfallschritte', ['kh', 'none'], ['beine'], ['knie']),
  extension: E('Beinstrecker', ['ma'], ['beine'], ['knie']),
  curlLeg: E('Beinbeuger', ['ma'], ['beine']),
  calves: E('Wadenheben', ['ma', 'none'], ['beine']),
  dead: E('Kreuzheben', ['lh'], ['ruecken', 'beine'], ['ruecken']),
  rdl: E('Rumänisches Kreuzheben', ['lh', 'kh'], ['beine', 'ruecken'], ['ruecken']),
  pullup: E('Klimmzüge', ['kl'], ['ruecken', 'arme'], ['schulter', 'ellbogen']),
  lat: E('Latziehen', ['ma', 'ka'], ['ruecken'], ['schulter']),
  bbRow: E('Langhantelrudern', ['lh'], ['ruecken'], ['ruecken']),
  cableRow: E('Kabelrudern', ['ka', 'ma'], ['ruecken']),
  ohp: E('Schulterdrücken', ['kh', 'lh'], ['schultern'], ['schulter']),
  lateral: E('Seitheben', ['kh', 'ka'], ['schultern']),
  facePull: E('Face Pulls', ['ka', 'ba'], ['schultern', 'ruecken']),
  curl: E('Bizepscurls', ['kh', 'lh', 'ka', 'ba'], ['arme'], ['ellbogen']),
  hammer: E('Hammercurls', ['kh'], ['arme'], ['ellbogen']),
  pushdown: E('Trizepsdrücken am Kabel', ['ka'], ['arme'], ['ellbogen']),
  french: E('French Press', ['lh', 'kh'], ['arme'], ['ellbogen']),
  crunch: E('Crunches', ['none'], ['bauch']),
  plank: E('Plank', ['none'], ['bauch']),
};
const FAV: Record<string, Pick[]> = {
  bank: [P.bank, P.khBank], squat: [P.squat], dead: [P.dead], pull: [P.pullup], ohp: [P.ohp], row: [P.bbRow, P.cableRow], lat: [P.lat], curl: [P.curl, P.hammer],
};

/** Plätze pro Trainingsart: je Platz mehrere Kandidaten, der passendste wird gewählt */
type Kind = 'ganz' | 'push' | 'pull' | 'beine' | 'oben' | 'unten';
const SLOTS: Record<Kind, Pick[][]> = {
  push: [[P.bank, P.khBank, P.butterfly, P.dips], [P.schraeg, P.khBank, P.butterfly], [P.ohp, P.lateral], [P.lateral, P.ohp], [P.pushdown, P.french, P.dips], [P.french, P.pushdown], [P.plank, P.crunch]],
  pull: [[P.pullup, P.lat], [P.bbRow, P.cableRow, P.lat], [P.cableRow, P.lat, P.bbRow], [P.facePull, P.lateral], [P.curl, P.hammer], [P.hammer, P.curl], [P.rdl, P.crunch]],
  beine: [[P.squat, P.presse, P.lunge], [P.rdl, P.curlLeg, P.dead], [P.presse, P.lunge, P.extension], [P.curlLeg, P.rdl], [P.extension, P.lunge], [P.calves], [P.plank, P.crunch]],
  ganz: [[P.squat, P.presse, P.lunge], [P.bank, P.khBank, P.butterfly, P.dips], [P.lat, P.pullup, P.bbRow, P.cableRow], [P.rdl, P.curlLeg, P.dead], [P.ohp, P.lateral], [P.bbRow, P.cableRow, P.pullup], [P.curl, P.pushdown, P.hammer], [P.plank, P.crunch]],
  oben: [[P.bank, P.khBank, P.butterfly, P.dips], [P.lat, P.pullup, P.bbRow], [P.ohp, P.lateral], [P.cableRow, P.bbRow, P.lat], [P.curl, P.hammer], [P.pushdown, P.french], [P.facePull, P.lateral], [P.schraeg, P.khBank]],
  unten: [[P.squat, P.presse, P.lunge], [P.rdl, P.curlLeg, P.dead], [P.presse, P.lunge, P.extension], [P.curlLeg, P.rdl], [P.extension, P.lunge], [P.calves], [P.plank, P.crunch], [P.crunch, P.plank]],
};

export interface PlanExercise { name: string; muscles: string[]; sets: { warmup?: boolean; reps?: number | null; duration_min?: number | null }[]; cardio?: boolean }
export interface PlanTemplate { name: string; exercises: PlanExercise[] }
export interface Plan {
  templates: PlanTemplate[];
  /** Wochentag → Vorlagenname */
  week: { day: string; template: string }[];
  weekGoal: number;
  notes: string[];
}
export const PLAN_PREFIX = 'Plan · ';

const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

function available(a: Answers): Set<Equip> {
  const place = String(a.place ?? 'gym');
  if (place === 'gym') return new Set<Equip>(['lh', 'kh', 'ma', 'ka', 'kl', 'ba', 'none']);
  if (place === 'homeBw') return new Set<Equip>(['none', ...(asList(a.equip).includes('kl') ? (['kl'] as Equip[]) : [])]);
  const chosen = asList(a.equip) as Equip[];
  return new Set<Equip>(['none', ...(chosen.length ? chosen : (['kh'] as Equip[]))]);
}

const DEFAULT_DAYS: Record<number, string[]> = { 1: ['Mi'], 2: ['Mo', 'Do'], 3: ['Mo', 'Mi', 'Fr'], 4: ['Mo', 'Di', 'Do', 'Fr'], 5: ['Mo', 'Di', 'Mi', 'Do', 'Fr'], 6: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] };

export function generatePlan(a: Answers): Plan {
  const days = Math.min(6, Math.max(1, Number(a.days) || 3));
  const count = ({ '30': 4, '45': 5, '60': 6, '90': 8 } as Record<string, number>)[String(a.duration)] ?? 5;
  const kinds: Kind[] = days === 1 ? ['ganz'] : days === 2 ? ['ganz', 'ganz'] : days === 3 ? ['push', 'pull', 'beine'] : days === 4 ? ['oben', 'unten', 'oben', 'unten'] : ['push', 'pull', 'beine'];
  const names: Record<Kind, string> = { ganz: 'Ganzkörper', push: 'Push', pull: 'Pull', beine: 'Beine', oben: 'Oberkörper', unten: 'Unterkörper' };

  const equip = available(a);
  const pain = new Set(asList(a.pain).filter((p) => p !== 'keine'));
  const focus = new Set(asList(a.focus).filter((f) => f !== 'alles'));
  const favNames = new Set(asList(a.fav).flatMap((f) => (FAV[f] ?? []).map((p) => p.name)));
  const ok = (p: Pick) => p.equip.some((e) => equip.has(e)) && !p.pain?.some((x) => pain.has(x));
  const score = (p: Pick) => (favNames.has(p.name) ? 3 : 0) + (p.muscles.some((m) => focus.has(m)) ? 2 : 0);

  // Ziel → Sätze und Wiederholungen
  const goal = String(a.goal ?? 'muskel');
  const base = ({ muskel: [3, 10], kraft: [4, 5], abnehmen: [3, 12], fit: [3, 12], ausdauer: [3, 15] } as Record<string, [number, number]>)[goal] ?? [3, 10];
  let setCount = base[0];
  const exp = String(a.exp ?? 'basis');
  if (exp === 'neu') setCount = Math.min(setCount, 2);
  else if (a.intensity === 'hart' && exp !== 'basis') setCount = Math.min(5, setCount + 1);
  else if (a.intensity === 'locker') setCount = Math.max(2, setCount - 1);
  const reps = base[1];
  const cardioMin = Number(a.cardio) || 0;

  const seen: Record<string, number> = {};
  const templates: PlanTemplate[] = [];
  const order: string[] = [];
  for (const kind of kinds) {
    const variant = (seen[kind] = (seen[kind] ?? 0) + 1) - 1;
    const slots = SLOTS[kind];
    const used = new Set<string>();
    // Plätze mit gewünschten Muskeln zuerst, dann nach Reihenfolge
    const ranked = slots.map((cands, i) => ({ i, best: Math.max(0, ...cands.filter(ok).map(score)) })).sort((x, y) => y.best - x.best || x.i - y.i);
    const chosen: { i: number; p: Pick }[] = [];
    for (const { i } of ranked) {
      if (chosen.length >= count) break;
      const cands = slots[i].filter((p) => ok(p) && !used.has(p.name)).sort((x, y) => score(y) - score(x));
      if (!cands.length) continue;
      const top = cands.filter((p) => score(p) === score(cands[0]));
      const p = top[variant % top.length];
      used.add(p.name);
      chosen.push({ i, p });
    }
    chosen.sort((x, y) => x.i - y.i);
    const exercises: PlanExercise[] = chosen.map(({ p }, n) => {
      const isCore = p.muscles.includes('bauch');
      const sets: PlanExercise['sets'] = Array.from({ length: isCore ? 3 : setCount }, () => ({ reps: isCore ? 15 : reps }));
      if (n === 0 && !isCore) sets.unshift({ warmup: true, reps: 8 });
      return { name: p.name, muscles: p.muscles, sets };
    });
    if (cardioMin) {
      const outdoor = a.place !== 'gym';
      exercises.push({ name: outdoor ? 'Laufen (draußen)' : 'Laufband', muscles: [], cardio: true, sets: [{ duration_min: cardioMin }] });
    }
    const label = names[kind] + (kinds.filter((k) => k === kind).length > 1 ? ` ${'AB'[variant] ?? variant + 1}` : '');
    const name = PLAN_PREFIX + label;
    if (!templates.some((t) => t.name === name)) templates.push({ name, exercises });
    order.push(name);
  }

  // Wochenplan: gewählte Tage, sonst Standardverteilung
  const picked = asList(a.weekdays);
  const dayOrder = WEEKDAYS.map((d) => d[0]);
  let weekDays = dayOrder.filter((d) => picked.includes(d)).slice(0, days);
  for (const d of DEFAULT_DAYS[days]) if (weekDays.length < days && !weekDays.includes(d)) weekDays.push(d);
  weekDays = dayOrder.filter((d) => weekDays.includes(d));
  const week = weekDays.map((day, i) => ({ day, template: order[i % order.length] }));

  const notes: string[] = [
    'Gewichte trägst du beim ersten Training ein – die App merkt sich deine Werte und zeigt sie beim nächsten Mal.',
    'Wähle Gewichte, mit denen du die Wiederholungen sauber schaffst.',
  ];
  if (pain.size) notes.push('Übungen, die zu deinen Beschwerden passen, haben wir weggelassen. Bei Schmerzen bitte ärztlich abklären.');
  if (picked.length && picked.length < days) notes.push(`Du hast nur ${picked.length} Tage gewählt – die übrigen Tage haben wir passend ergänzt.`);
  return { templates, week, weekGoal: days, notes };
}

const KEY = 'gym-tracker-quiz';
export interface SavedQuiz { answers: Answers; plan: { week: Plan['week']; weekGoal: number } | null; savedAt: string }
export function loadQuiz(): SavedQuiz | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && typeof v === 'object' && v.answers ? v : null;
  } catch {
    return null;
  }
}
export function saveQuiz(q: SavedQuiz) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* nur lokal gespeichert */
  }
}
