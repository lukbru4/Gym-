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
  /** Startwert aus einer anderen Antwort (z. B. Zielgewicht startet beim Gewicht) */
  defFrom?: string;
  step?: number;
  unit?: string;
  /** Frage nur stellen, wenn … */
  when?: (a: Answers) => boolean;
}

const WEEKDAYS: [string, string][] = [['Mo', 'Montag'], ['Di', 'Dienstag'], ['Mi', 'Mittwoch'], ['Do', 'Donnerstag'], ['Fr', 'Freitag'], ['Sa', 'Samstag'], ['So', 'Sonntag']];

/** Hat die Person außerhalb vom Gym noch Sport angegeben? */
export const hasOtherSport = (a: Answers) => {
  const v = a.sports;
  return Array.isArray(v) && v.some((x) => x !== 'keine');
};

export const QUESTIONS: Question[] = [
  { id: 'goal', q: 'Was ist dein Hauptziel?', type: 'one', options: [['muskel', 'Muskelaufbau'], ['kraft', 'Stärker werden'], ['abnehmen', 'Abnehmen / definieren'], ['fit', 'Fit & gesund bleiben'], ['ausdauer', 'Ausdauer verbessern']] },
  { id: 'sex', q: 'Dein Geschlecht', hint: 'Optional.', type: 'one', options: [['m', 'Männlich'], ['w', 'Weiblich'], ['d', 'Divers'], ['x', 'Keine Angabe']] },
  { id: 'age', q: 'Wie alt bist du?', type: 'range', min: 14, max: 90, def: 30, step: 1, unit: 'Jahre' },
  { id: 'height', q: 'Wie groß bist du?', type: 'range', min: 120, max: 220, def: 175, step: 1, unit: 'cm' },
  { id: 'weight', q: 'Wie viel wiegst du?', type: 'range', min: 35, max: 200, def: 75, step: 0.5, unit: 'kg' },
  { id: 'job', q: 'Wie aktiv bist du im Alltag (ohne Training)?', hint: 'Für deinen Kalorienbedarf.', type: 'one', options: [['sitzend', 'Überwiegend sitzend (Büro, Schule)'], ['gemischt', 'Gemischt'], ['beine', 'Viel auf den Beinen'], ['koerper', 'Körperlich anstrengend']] },
  { id: 'goalKg', q: 'Hast du ein Zielgewicht?', type: 'one', options: [['kein', 'Kein bestimmtes'], ['ja', 'Ja, ich gebe es ein']] },
  { id: 'goalWeight', q: 'Wie viel möchtest du wiegen?', hint: 'Daraus rechnen wir mit, ob du abnehmen oder zunehmen solltest.', type: 'range', min: 35, max: 200, def: 75, step: 0.5, unit: 'kg', defFrom: 'weight', when: (a) => a.goalKg === 'ja' },
  { id: 'exp', q: 'Wie lange trainierst du schon mit Gewichten?', type: 'one', options: [['neu', 'Gar nicht / gerade angefangen'], ['basis', 'Unter 1 Jahr'], ['mittel', '1–3 Jahre'], ['profi', 'Über 3 Jahre']] },
  { id: 'days', q: 'Wie oft pro Woche willst du trainieren?', hint: 'Wird dein Wochenziel für die Serie.', type: 'one', options: [['1', '1× pro Woche'], ['2', '2× pro Woche'], ['3', '3× pro Woche'], ['4', '4× pro Woche'], ['5', '5× pro Woche'], ['6', '6× pro Woche']] },
  { id: 'split', q: 'Welche Aufteilung möchtest du?', hint: 'Wie die Trainings über die Woche verteilt werden.', type: 'one', options: [['auto', 'Automatisch (passend zu meinen Tagen)'], ['ppl', 'Push / Pull / Beine'], ['ganz', 'Ganzkörper'], ['ob', 'Oberkörper / Unterkörper']] },
  { id: 'duration', q: 'Wie lange darf ein Training dauern?', type: 'one', options: [['30', '30 Minuten'], ['45', '45 Minuten'], ['60', '60 Minuten'], ['90', '90 Minuten']] },
  { id: 'place', q: 'Wo trainierst du?', type: 'one', options: [['gym', 'Im Fitnessstudio'], ['homeDb', 'Zuhause mit Gewichten'], ['homeBw', 'Zuhause ohne Geräte']] },
  { id: 'equip', q: 'Welche Geräte hast du zuhause?', hint: 'Mehrere möglich.', type: 'multi', when: (a) => a.place === 'homeDb', options: [['lh', 'Langhantel'], ['kh', 'Kurzhanteln'], ['kl', 'Klimmzugstange'], ['ba', 'Bänder']] },
  { id: 'focus', q: 'Welche Muskeln sind dir besonders wichtig?', hint: 'Mehrere möglich.', type: 'multi', options: [['brust', 'Brust'], ['ruecken', 'Rücken'], ['schultern', 'Schultern'], ['arme', 'Arme'], ['beine', 'Beine'], ['bauch', 'Bauch'], ['alles', 'Alles gleich']] },
  { id: 'fav', q: 'Welche Übungen willst du unbedingt machen?', hint: 'Kommen bevorzugt in deinen Plan (wenn sie zu Aufteilung, Geräten und Beschwerden passen). Mehrere möglich.', type: 'multi', options: [] },
  { id: 'pain', q: 'Hast du Beschwerden?', hint: 'Solche Übungen lassen wir weg. Bei Schmerzen bitte ärztlich abklären.', type: 'multi', options: [['keine', 'Keine'], ['knie', 'Knie'], ['ruecken', 'Unterer Rücken'], ['schulter', 'Schulter'], ['ellbogen', 'Ellbogen'], ['handgelenk', 'Handgelenk']] },
  { id: 'cardio', q: 'Wie viel Cardio möchtest du pro Training?', type: 'one', options: [['0', 'Keins'], ['10', 'Ein bisschen (10 Min.)'], ['20', 'Regelmäßig (20 Min.)']] },
  { id: 'sports', q: 'Machst du außerhalb vom Gym noch Sport?', hint: 'Mehrere möglich – das zählt für deinen Kalorienbedarf.', type: 'multi', options: [['keine', 'Keinen'], ['hockey', 'Feldhockey'], ['tennis', 'Tennis'], ['fussball', 'Fußball'], ['laufen', 'Laufen / Joggen'], ['rad', 'Radfahren'], ['schwimmen', 'Schwimmen'], ['basketball', 'Basketball'], ['handball', 'Handball'], ['volleyball', 'Volleyball'], ['badminton', 'Badminton / Tischtennis'], ['kampf', 'Kampfsport / Boxen'], ['klettern', 'Klettern'], ['wandern', 'Wandern / Spazieren'], ['tanzen', 'Tanzen'], ['yoga', 'Yoga / Pilates'], ['ski', 'Ski / Snowboard'], ['andere', 'Anderer Sport']] },
  { id: 'sportDays', q: 'Wie oft pro Woche machst du diesen Sport?', type: 'one', when: (a) => hasOtherSport(a), options: [['1', '1× pro Woche'], ['2', '2× pro Woche'], ['3', '3× pro Woche'], ['4', '4× pro Woche'], ['5', '5× pro Woche'], ['6', '6× pro Woche']] },
  { id: 'sportMin', q: 'Wie lange dauert das jeweils ungefähr?', type: 'one', when: (a) => hasOtherSport(a), options: [['30', '30 Minuten'], ['60', '1 Stunde'], ['90', '1,5 Stunden'], ['120', '2 Stunden oder mehr']] },
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
/** compound = Grundübung (mehrere Gelenke), iso = Isolationsübung, core = Rumpf */
type Kind0 = 'compound' | 'iso' | 'core';
interface Pick { name: string; equip: Equip[]; pain?: string[]; muscles: string[]; kind: Kind0 }
const E = (name: string, equip: Equip[], muscles: string[], pain: string[] = [], kind: Kind0 = 'iso'): Pick => ({ name, equip, muscles, pain, kind });
const G = (name: string, equip: Equip[], muscles: string[], pain: string[] = []): Pick => E(name, equip, muscles, pain, 'compound');
const R = (name: string, equip: Equip[], muscles: string[], pain: string[] = []): Pick => E(name, equip, muscles, pain, 'core');

const P = {
  bank: G('Bankdrücken', ['lh'], ['brust'], ['schulter', 'handgelenk']),
  schraeg: G('Schrägbankdrücken', ['lh', 'kh'], ['brust', 'schultern'], ['schulter']),
  khBank: G('Kurzhantel-Bankdrücken', ['kh'], ['brust'], ['schulter']),
  butterfly: E('Butterfly', ['ma'], ['brust'], ['schulter']),
  dips: G('Dips', ['none'], ['brust', 'arme'], ['schulter', 'ellbogen']),
  squat: G('Kniebeuge', ['lh'], ['beine'], ['knie', 'ruecken']),
  presse: G('Beinpresse', ['ma'], ['beine'], ['knie']),
  lunge: G('Ausfallschritte', ['kh', 'none'], ['beine'], ['knie']),
  extension: E('Beinstrecker', ['ma'], ['beine'], ['knie']),
  curlLeg: E('Beinbeuger', ['ma'], ['beine']),
  calves: E('Wadenheben', ['ma', 'none'], ['beine']),
  dead: G('Kreuzheben', ['lh'], ['ruecken', 'beine'], ['ruecken']),
  rdl: G('Rumänisches Kreuzheben', ['lh', 'kh'], ['beine', 'ruecken'], ['ruecken']),
  pullup: G('Klimmzüge', ['kl'], ['ruecken', 'arme'], ['schulter', 'ellbogen']),
  lat: G('Latziehen', ['ma', 'ka'], ['ruecken'], ['schulter']),
  bbRow: G('Langhantelrudern', ['lh'], ['ruecken'], ['ruecken']),
  cableRow: G('Kabelrudern', ['ka', 'ma'], ['ruecken']),
  ohp: G('Schulterdrücken', ['kh', 'lh'], ['schultern'], ['schulter']),
  lateral: E('Seitheben', ['kh', 'ka'], ['schultern']),
  facePull: E('Face Pulls', ['ka', 'ba'], ['schultern', 'ruecken']),
  curl: E('Bizepscurls', ['kh', 'lh', 'ka', 'ba'], ['arme'], ['ellbogen']),
  hammer: E('Hammercurls', ['kh'], ['arme'], ['ellbogen']),
  pushdown: E('Trizepsdrücken am Kabel', ['ka'], ['arme'], ['ellbogen']),
  french: E('French Press', ['lh', 'kh'], ['arme'], ['ellbogen']),
  crunch: R('Crunches', ['none'], ['bauch']),
  plank: R('Plank', ['none'], ['bauch']),
};

/** Weitere Übungen (Maschinen, Kabel, Varianten) – kommen in den Plan, stehen aber nicht in der Liste „Welche Übungen willst du unbedingt machen?“ */
const X = {
  brustpresse: G('Brustpresse (Maschine)', ['ma'], ['brust', 'arme'], ['schulter']),
  schraegPresse: G('Schrägbank-Brustpresse (Maschine)', ['ma'], ['brust', 'schultern'], ['schulter']),
  flys: E('Fliegende (Kurzhantel)', ['kh'], ['brust'], ['schulter']),
  crossover: E('Cable Crossover (Kabelzug)', ['ka'], ['brust'], ['schulter']),
  pushup: G('Liegestütze', ['none'], ['brust', 'arme'], ['handgelenk', 'schulter']),
  ohpKh: G('Schulterdrücken (Kurzhantel)', ['kh'], ['schultern', 'arme'], ['schulter']),
  ohpMa: G('Schulterdrücken (Maschine)', ['ma'], ['schultern', 'arme'], ['schulter']),
  lateralMa: E('Seitheben (Maschine)', ['ma'], ['schultern']),
  lateralKabel: E('Seitheben (Kabel)', ['ka'], ['schultern']),
  reverseFly: E('Reverse Butterfly (Maschine)', ['ma'], ['schultern', 'ruecken']),
  klimmMa: G('Klimmzug-Maschine (unterstützt)', ['ma'], ['ruecken', 'arme'], ['schulter']),
  latEng: G('Latziehen (enger Griff)', ['ma', 'ka'], ['ruecken', 'arme'], ['schulter']),
  rowMa: G('Rudern (Maschine, Brustpolster)', ['ma'], ['ruecken']),
  khRow: G('Kurzhantelrudern (einarmig)', ['kh'], ['ruecken', 'arme']),
  scott: E('Scott-Curls (Maschine)', ['ma'], ['arme'], ['ellbogen']),
  cableCurl: E('Bizepscurls (Kabel)', ['ka'], ['arme'], ['ellbogen']),
  ropePushdown: E('Trizepsdrücken (Seil)', ['ka'], ['arme'], ['ellbogen']),
  overhead: E('Überkopf-Trizepsstrecken (Kabel)', ['ka'], ['arme'], ['ellbogen']),
  hack: G('Hackenschmidt-Kniebeuge (Maschine)', ['ma'], ['beine'], ['knie']),
  bulgarian: G('Bulgarische Kniebeuge', ['kh', 'none'], ['beine'], ['knie']),
  stepups: G('Step-ups', ['kh', 'none'], ['beine'], ['knie']),
  hipthrust: G('Hip Thrust (Langhantel)', ['lh'], ['beine']),
  glute: E('Glute Bridge', ['none'], ['beine']),
  curlLegSit: E('Beinbeuger (sitzend)', ['ma'], ['beine']),
  calvesSit: E('Wadenheben (sitzend)', ['ma'], ['beine']),
  hyper: E('Hyperextensions', ['none'], ['ruecken']),
  legRaise: R('Beinheben (hängend)', ['kl'], ['bauch']),
  cableCrunch: R('Cable Crunches (Kabel)', ['ka'], ['bauch']),
  absMa: R('Bauchmaschine', ['ma'], ['bauch']),
};
// Alle Kraftübungen als Auswahl bei „Welche Übungen willst du unbedingt machen?“
QUESTIONS.find((q) => q.id === 'fav')!.options = Object.values(P).map((p) => [p.name, p.name] as [string, string]);

/** Plätze pro Trainingsart: je Platz mehrere Kandidaten, der passendste wird gewählt */
type Kind = 'ganz' | 'push' | 'pull' | 'beine' | 'oben' | 'unten';
const MUST: Record<Kind, number[]> = { ganz: [0, 1, 2], push: [0, 1], pull: [0, 1], beine: [0, 1], oben: [0, 1], unten: [0, 1] };
const SLOTS: Record<Kind, Pick[][]> = {
  push: [[P.bank, P.khBank, X.brustpresse, P.butterfly, P.dips, X.pushup], [P.schraeg, P.khBank, X.schraegPresse, X.flys, P.butterfly, X.crossover], [P.ohp, X.ohpKh, X.ohpMa, P.lateral], [P.lateral, X.lateralMa, X.lateralKabel, P.ohp], [P.pushdown, X.ropePushdown, P.french, P.dips], [P.french, X.overhead, P.pushdown, X.ropePushdown], [P.plank, P.crunch, X.cableCrunch]],
  pull: [[P.pullup, P.lat, X.klimmMa, X.latEng], [P.bbRow, X.khRow, X.rowMa, P.cableRow, P.lat], [P.cableRow, X.rowMa, P.lat, P.bbRow, X.khRow], [P.facePull, X.reverseFly, P.lateral], [P.curl, X.scott, X.cableCurl, P.hammer], [P.hammer, P.curl, X.cableCurl], [P.rdl, X.hyper, P.crunch]],
  beine: [[P.squat, X.hack, P.presse, X.bulgarian, P.lunge], [P.rdl, X.curlLegSit, P.curlLeg, P.dead], [P.presse, X.bulgarian, P.lunge, P.extension, X.stepups], [P.curlLeg, X.curlLegSit, P.rdl, X.hipthrust, X.glute], [P.extension, P.lunge], [P.calves, X.calvesSit], [P.plank, P.crunch, X.legRaise, X.cableCrunch]],
  ganz: [[P.squat, X.hack, P.presse, P.lunge], [P.bank, P.khBank, X.brustpresse, P.butterfly, P.dips, X.pushup], [P.lat, P.pullup, P.bbRow, P.cableRow, X.rowMa, X.khRow], [P.rdl, P.curlLeg, X.hipthrust, X.glute, P.dead], [P.ohp, X.ohpKh, X.ohpMa, P.lateral], [P.bbRow, P.cableRow, X.khRow, X.rowMa, P.pullup], [P.curl, P.pushdown, P.hammer, X.ropePushdown, X.scott], [P.plank, P.crunch, X.cableCrunch]],
  oben: [[P.bank, P.khBank, X.brustpresse, P.butterfly, P.dips, X.pushup], [P.lat, P.pullup, P.bbRow, X.latEng, X.klimmMa], [P.ohp, X.ohpKh, X.ohpMa, P.lateral], [P.cableRow, X.rowMa, X.khRow, P.bbRow, P.lat], [P.curl, X.scott, P.hammer, X.cableCurl], [P.pushdown, X.ropePushdown, P.french, X.overhead], [P.facePull, X.reverseFly, P.lateral], [P.schraeg, P.khBank, X.schraegPresse, X.flys]],
  unten: [[P.squat, X.hack, P.presse, P.lunge, X.bulgarian], [P.rdl, X.curlLegSit, P.curlLeg, X.hipthrust, P.dead], [P.presse, P.lunge, X.bulgarian, P.extension], [P.curlLeg, X.curlLegSit, P.rdl, X.glute], [P.extension, P.lunge, X.stepups], [P.calves, X.calvesSit], [P.plank, P.crunch, X.legRaise], [P.crunch, P.plank, X.cableCrunch, X.absMa]],
};

export interface PlanExercise {
  name: string;
  muscles: string[];
  sets: { warmup?: boolean; reps?: number | null; duration_min?: number | null }[];
  cardio?: boolean;
  /** Wiederholungsbereich (Doppelte Progression: oben angekommen → mehr Gewicht) */
  range?: [number, number];
  /** Pause zwischen den Sätzen in Sekunden */
  rest?: number;
}
export interface PlanTemplate { name: string; exercises: PlanExercise[]; /** geschätzte Dauer in Minuten */ minutes: number }
export interface Plan {
  templates: PlanTemplate[];
  /** Wochentag → Vorlagenname */
  week: { day: string; template: string }[];
  weekGoal: number;
  notes: string[];
  /** Arbeitssätze pro Woche je Muskelgruppe (Hauptmuskel voll, Nebenmuskel halb) */
  volume: { group: string; sets: number }[];
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

const GROUP_NAMES: Record<string, string> = { brust: 'Brust', ruecken: 'Rücken', schultern: 'Schultern', arme: 'Arme', beine: 'Beine & Gesäß', bauch: 'Bauch' };

/** Sätze, Wiederholungen und Pause je Übungsart, Ziel, Erfahrung und Härte */
function prescribe(kind: Kind0, a: Answers): { sets: number; lo: number; hi: number; rest: number } {
  const goal = String(a.goal ?? 'muskel');
  const exp = String(a.exp ?? 'basis');
  const table: Record<string, Record<Kind0, [number, number, number, number]>> = {
    //            [Sätze, von, bis, Pause s]
    kraft: { compound: [4, 3, 6, 180], iso: [3, 8, 10, 90], core: [3, 10, 15, 60] },
    muskel: { compound: [3, 6, 10, 120], iso: [3, 10, 15, 75], core: [3, 12, 20, 60] },
    abnehmen: { compound: [3, 8, 12, 90], iso: [3, 12, 15, 60], core: [3, 15, 20, 45] },
    fit: { compound: [3, 8, 12, 90], iso: [3, 12, 15, 60], core: [3, 15, 20, 45] },
    ausdauer: { compound: [3, 12, 15, 60], iso: [3, 15, 20, 45], core: [3, 15, 25, 45] },
  };
  let [sets, lo, hi, rest] = (table[goal] ?? table.muskel)[kind];
  if (exp === 'neu') {
    sets = Math.max(2, sets - 1);
    lo = Math.max(lo, 8); // Anfänger lernen die Technik mit leichteren Gewichten
    hi = Math.max(hi, 12);
  } else if (a.intensity === 'locker') sets = Math.max(2, sets - 1);
  else if (a.intensity === 'hart' && (exp === 'mittel' || exp === 'profi') && kind === 'compound') sets = Math.min(5, sets + 1);
  return { sets, lo, hi, rest };
}

/** Grob geschätzte Dauer: je Satz Pause + Ausführung (~40 s), Aufwärmsätze 1 Minute, dazu 5 Minuten Aufwärmen */
function estimateMinutes(exercises: PlanExercise[]): number {
  let sec = 180;
  for (const e of exercises) {
    if (e.cardio) {
      sec += (e.sets[0].duration_min ?? 0) * 60;
      continue;
    }
    for (const st of e.sets) sec += st.warmup ? 60 : (e.rest ?? 90) + 30;
  }
  return Math.round(sec / 60 / 5) * 5;
}

export function generatePlan(a: Answers): Plan {
  const days = Math.min(6, Math.max(1, Number(a.days) || 3));
  const exp = String(a.exp ?? 'basis');
  const count = ({ '30': 4, '45': 5, '60': 6, '90': 8 } as Record<string, number>)[String(a.duration)] ?? 5;
  const split = String(a.split ?? 'auto');
  const cycle = (list: Kind[]) => Array.from({ length: days }, (_, i) => list[i % list.length]);
  // Automatisch: Anfänger bis 3 Tage → Ganzkörper (jeder Muskel 2–3× pro Woche, das lernt man am schnellsten);
  // sonst 3 Tage Push/Pull/Beine, 4 Tage Oberkörper/Unterkörper, 5–6 Tage Push/Pull/Beine
  const beginner = exp === 'neu' || exp === 'basis';
  const kinds: Kind[] =
    split === 'ganz' ? cycle(['ganz'])
    : split === 'ppl' ? cycle(['push', 'pull', 'beine'])
    : split === 'ob' ? cycle(['oben', 'unten'])
    : days === 1 ? ['ganz'] : days === 2 ? ['ganz', 'ganz'] : days === 3 ? (beginner ? cycle(['ganz']) : ['push', 'pull', 'beine']) : days === 4 ? ['oben', 'unten', 'oben', 'unten'] : ['push', 'pull', 'beine'];
  const names: Record<Kind, string> = { ganz: 'Ganzkörper', push: 'Push', pull: 'Pull', beine: 'Beine', oben: 'Oberkörper', unten: 'Unterkörper' };

  const equip = available(a);
  const pain = new Set(asList(a.pain).filter((p) => p !== 'keine'));
  const focus = new Set(asList(a.focus).filter((f) => f !== 'alles'));
  const favNames = new Set(asList(a.fav));
  const ok = (p: Pick) => p.equip.some((e) => equip.has(e)) && !p.pain?.some((x) => pain.has(x));
  const isMachine = (p: Pick) => p.equip.every((e) => e === 'ma' || e === 'ka');
  // Wunschübungen und Fokus-Muskeln zuerst; Anfänger bevorzugen Maschinen (leichter zu lernen), Fortgeschrittene freie Gewichte
  const score = (p: Pick) =>
    (favNames.has(p.name) ? 3 : 0) + (focus.has(p.muscles[0]) ? 2 : p.muscles.some((m) => focus.has(m)) ? 1 : 0) + (exp === 'neu' ? (isMachine(p) ? 1 : 0) : exp === 'profi' ? (isMachine(p) ? 0 : 1) : 0);
  const cardioMin = Number(a.cardio) || 0;

  const seen: Record<string, number> = {};
  const templates: PlanTemplate[] = [];
  const order: string[] = [];
  for (const kind of kinds) {
    const variant = (seen[kind] = (seen[kind] ?? 0) + 1) - 1;
    const slots = SLOTS[kind];
    const used = new Set<string>();
    // Plätze mit gewünschten Muskeln zuerst, dann nach Reihenfolge
    // Pflichtplätze (z. B. Beine, Brust, Rücken beim Ganzkörper) kommen immer vor den Wunsch-Muskeln dran,
    // damit auch mit Fokus und kurzer Zeit nichts Wichtiges fehlt.
    const must = MUST[kind];
    const ranked = slots
      .map((cands, i) => ({ i, best: Math.max(0, ...cands.filter(ok).map(score)) + (must.includes(i) ? 100 : 0) }))
      .sort((x, y) => y.best - x.best || x.i - y.i);
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
      const rx = prescribe(p.kind, a);
      const sets: PlanExercise['sets'] = Array.from({ length: rx.sets }, () => ({ reps: rx.hi }));
      // Aufwärmsatz vor der ersten Grundübung (kraftorientiert zwei Sätze)
      if (n === 0 && p.kind === 'compound') {
        if (a.goal === 'kraft') sets.unshift({ warmup: true, reps: 8 }, { warmup: true, reps: 4 });
        else sets.unshift({ warmup: true, reps: 8 });
      }
      return { name: p.name, muscles: p.muscles, sets, range: [rx.lo, rx.hi], rest: rx.rest };
    });
    // Passt es nicht in die gewünschte Zeit, fliegt zuerst die letzte Wunsch-/Zusatzübung raus (Pflichtplätze bleiben)
    const minutesWanted = Number(a.duration) || 45;
    const mustNames = new Set(chosen.filter((c) => must.includes(c.i)).map((c) => c.p.name));
    while (estimateMinutes(exercises) > minutesWanted + 3 && exercises.length > 3) {
      let idx = -1;
      for (let k = exercises.length - 1; k >= 0 && idx < 0; k--) if (!mustNames.has(exercises[k].name)) idx = k;
      if (idx < 0) break;
      exercises.splice(idx, 1);
    }
    // Immer noch zu lang (z. B. Kraft mit langen Pausen in 30 Minuten): zuerst Pausen kürzen, dann Sätze
    const fit = (apply: (e: PlanExercise) => void) => {
      if (estimateMinutes(exercises) <= minutesWanted + 3) return;
      for (const e of exercises) apply(e);
    };
    fit((e) => { if (e.rest) e.rest = Math.min(e.rest, e.range && e.range[1] <= 6 ? 120 : 90); });
    fit((e) => { if (e.rest) e.rest = Math.min(e.rest, 75); });
    for (const maxSets of [3, 2]) {
      fit((e) => {
        let work = e.sets.filter((x) => !x.warmup).length;
        while (work > maxSets) {
          const i = e.sets.map((x) => !x.warmup).lastIndexOf(true);
          e.sets.splice(i, 1);
          work--;
        }
      });
    }
    if (cardioMin) {
      const outdoor = a.place !== 'gym';
      exercises.push({ name: outdoor ? 'Laufen (draußen)' : 'Laufband', muscles: [], cardio: true, sets: [{ duration_min: cardioMin }] });
    }
    const label = names[kind] + (kinds.filter((k) => k === kind).length > 1 ? ` ${'ABCDEF'[variant] ?? variant + 1}` : '');
    const name = PLAN_PREFIX + label;
    if (!templates.some((t) => t.name === name)) {
      templates.push({ name, exercises, minutes: estimateMinutes(exercises) });
    }
    order.push(name);
  }

  // Wochenplan: gewählte Tage, sonst Standardverteilung
  const picked = asList(a.weekdays);
  const dayOrder = WEEKDAYS.map((d) => d[0]);
  let weekDays = dayOrder.filter((d) => picked.includes(d)).slice(0, days);
  for (const d of DEFAULT_DAYS[days]) if (weekDays.length < days && !weekDays.includes(d)) weekDays.push(d);
  weekDays = dayOrder.filter((d) => weekDays.includes(d));
  const week = weekDays.map((day, i) => ({ day, template: order[i % order.length] }));

  // Wochenvolumen: Arbeitssätze je Muskelgruppe (Hauptmuskel voll, weitere halb), über alle Trainingstage der Woche
  const vol: Record<string, number> = {};
  for (const w of week) {
    const t = templates.find((x) => x.name === w.template)!;
    t.exercises.forEach((e) => {
      if (e.cardio) return;
      const n = e.sets.filter((x) => !x.warmup).length;
      e.muscles.forEach((m, i) => (vol[m] = (vol[m] ?? 0) + (i === 0 ? n : n / 2)));
    });
  }
  const volume = Object.entries(GROUP_NAMES).map(([k, group]) => ({ group, sets: Math.round(vol[k] ?? 0) })).filter((v) => v.sets > 0);

  const hard = a.intensity === 'hart' ? '0–1' : a.intensity === 'locker' ? '2–3' : '1–2';
  const notes: string[] = [
    'Gewichte trägst du beim ersten Training ein – die App merkt sich deine Werte und zeigt sie beim nächsten Mal.',
    `Doppelte Progression: Schaffst du bei allen Sätzen die obere Zahl des Wiederholungsbereichs sauber, nimm beim nächsten Mal etwas mehr Gewicht (Hanteln +1–2 kg, Langhantel +2,5 kg, Maschine eine Stufe).`,
    `Wähle das Gewicht so, dass du am Satzende noch ${hard} Wiederholungen übrig hättest.`,
    'Alle 5–6 Wochen eine Entlastungswoche: gleiche Übungen mit der Hälfte der Sätze und leichteren Gewichten.',
  ];
  if (split === 'ppl' && days < 3) notes.push('Push / Pull / Beine braucht mindestens 3 Trainingstage, damit alle Teile drankommen – mit weniger Tagen ist Ganzkörper besser.');
  if (split === 'ob' && days < 2) notes.push('Oberkörper / Unterkörper braucht mindestens 2 Trainingstage.');
  if (beginner && days === 3 && split === 'auto') notes.push('Als Einsteiger trainierst du jeden Muskel drei Mal pro Woche (Ganzkörper) – so lernst du die Übungen am schnellsten.');
  if (pain.size) notes.push('Übungen, die zu deinen Beschwerden passen, haben wir weggelassen. Bei Schmerzen bitte ärztlich abklären.');
  if (picked.length && picked.length < days) notes.push(`Du hast nur ${picked.length} Tage gewählt – die übrigen Tage haben wir passend ergänzt.`);
  const sportDays = Number(a.sportDays) || 0;
  const hardSports = asList(a.sports).some((x) => ['hockey', 'fussball', 'laufen', 'basketball', 'handball', 'kampf', 'tennis'].includes(x));
  if (hasOtherSport(a) && hardSports && sportDays >= 2) notes.push('Wegen deines Sports außerhalb vom Gym: Leg das Beintraining nicht direkt vor einen intensiven Sporttag und plane an Spieltagen lieber Oberkörper.');
  if (hasOtherSport(a) && sportDays >= 4 && days >= 4) notes.push('Du trainierst insgesamt sehr viel. Achte auf mindestens einen freien Tag pro Woche und genug Schlaf.');
  if (a.sleep === '5') notes.push('Du schläfst unter 6 Stunden: Muskeln wachsen im Schlaf. Schon eine Stunde mehr bringt spürbar mehr als ein zusätzlicher Satz.');
  if (a.food === 'nein' && (a.goal === 'muskel' || a.goal === 'kraft' || a.goal === 'abnehmen')) notes.push('Für dein Ziel zählt die Ernährung mindestens so viel wie das Training – nutze den Kalorienbedarf unten und tracke ein paar Tage.');
  for (const v of volume) {
    if (v.sets < 8 && ['Brust', 'Rücken', 'Beine & Gesäß'].includes(v.group) && focus.size && [...focus].some((f) => GROUP_NAMES[f] === v.group)) notes.push(`${v.group} bekommt nur ${v.sets} Sätze pro Woche – für Wachstum sind etwa 10–20 sinnvoll. Mehr Trainingstage oder ein längeres Training helfen.`);
  }
  return { templates, week, weekGoal: days, notes, volume };
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
type Syncer = (answers: Answers) => void;
let syncer: Syncer | null = null;
const quizListeners = new Set<() => void>();
/** Das Konto speichert die Antworten mit (gesetzt, solange jemand angemeldet ist) */
export const setQuizSyncer = (fn: Syncer | null) => void (syncer = fn);
export const subscribeQuiz = (cb: () => void) => (quizListeners.add(cb), () => void quizListeners.delete(cb));
let syncTimer: ReturnType<typeof setTimeout> | undefined;
/** `fromServer`: Antworten kommen vom Konto und werden nicht zurückgeschickt */
export function saveQuiz(q: SavedQuiz, fromServer = false) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* nur lokal gespeichert */
  }
  quizListeners.forEach((l) => l());
  if (syncer && !fromServer) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncer?.(q.answers), 600);
  }
}
