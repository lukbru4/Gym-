// Zwei Fragerunden: Runde 1 „Über dich“ (nach dem Anmelden, Pflicht) und Runde 2 „Dein Training“ (freiwillig, vor dem Training angeboten).
// Antworten landen in denselben Answers wie der Trainingsplan (lib/plan.ts) und werden mit dem Konto gespeichert.
import type { Answers } from './plan';

export type StepKind = 'cards' | 'multi' | 'slider' | 'bodyfat' | 'text' | 'info' | 'week' | 'focus' | 'months' | 'level';
export interface Opt { v: string; label: string; sub?: string; icon?: string }
export interface Help { title: string; lines: string[] }
export interface Step {
  id: string;
  section: string;
  title: string;
  hint?: string;
  kind: StepKind;
  options?: Opt[];
  min?: number; max?: number; step?: number; def?: number; unit?: string;
  /** Startwert aus einer anderen Antwort */
  defFrom?: string;
  help?: Help;
  /** darf übersprungen werden */
  optional?: boolean;
  /** höchstens so viele (Mehrfachauswahl) */
  limit?: number;
  when?: (a: Answers) => boolean;
}

const has = (a: Answers, id: string) => a[id] !== undefined && a[id] !== '' && !(Array.isArray(a[id]) && !a[id].length);
const list = (v: unknown): string[] => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []);

export const ROUND1: Step[] = [
  { id: 'name', section: 'Dein Profil', title: 'Wie dürfen wir dich nennen?', kind: 'text', optional: true },
  { id: 'sex', section: 'Dein Profil', title: 'Dein Geschlecht', hint: 'Brauchen wir für Kalorien und Körperfett.', kind: 'cards', options: [{ v: 'm', label: 'Männlich' }, { v: 'w', label: 'Weiblich' }, { v: 'd', label: 'Divers' }, { v: 'x', label: 'Keine Angabe' }] },
  { id: 'age', section: 'Dein Profil', title: 'Wie alt bist du?', kind: 'slider', min: 14, max: 90, def: 25, step: 1, unit: 'Jahre' },
  {
    id: 'height', section: 'Dein Körper', title: 'Wie groß bist du?', kind: 'slider', min: 130, max: 215, def: 175, step: 1, unit: 'cm',
    help: { title: 'So misst du deine Größe', lines: ['Schuhe aus, mit dem Rücken gerade an eine Wand stellen.', 'Ein Buch flach auf den Kopf legen und an der Unterkante einen kleinen Strich an die Wand machen.', 'Vom Boden bis zum Strich messen.'] },
  },
  {
    id: 'weight', section: 'Dein Körper', title: 'Wie viel wiegst du?', kind: 'slider', min: 35, max: 180, def: 75, step: 0.5, unit: 'kg',
    help: { title: 'So wiegst du dich richtig', lines: ['Morgens nach dem Aufstehen und nach der Toilette, vor dem Frühstück.', 'Ohne Kleidung oder nur in Unterwäsche.', 'Das Gewicht schwankt am Tag um 1–2 kg – das ist normal.'] },
  },
  {
    id: 'bodyfat', section: 'Dein Körper', title: 'Wie hoch ist dein Körperfettanteil ungefähr?', hint: 'Eine Schätzung reicht. Schieb den Regler, bis die Figur ungefähr wie du aussieht.', kind: 'bodyfat', min: 5, max: 45, step: 1, unit: '%', optional: true,
    help: { title: 'Wie finde ich das raus?', lines: ['Vergleichen: Sind Bauchmuskeln klar zu sehen, liegst du als Mann bei etwa 10–12 %, als Frau bei etwa 18–20 %.', 'Messen: Tippe auf „Mit Maßband ausrechnen“ – dafür brauchst du Hals- und Bauchumfang (Frauen auch Hüfte).', 'Körperfett-Waagen schwanken stark – nimm lieber den Mittelwert aus ein paar Tagen.'] },
  },
  {
    id: 'waist', section: 'Dein Körper', title: 'Wie viel misst dein Bauch?', hint: 'Optional. Den Wert übernehmen wir in deine Körpermaße.', kind: 'slider', min: 50, max: 160, def: 85, step: 0.5, unit: 'cm', optional: true,
    help: { title: 'So misst du den Bauchumfang', lines: ['Maßband waagerecht auf Höhe des Bauchnabels um den Bauch legen.', 'Normal ausatmen, Bauch nicht einziehen.', 'Das Band liegt an, schneidet aber nicht ein.'] },
  },
  {
    id: 'goal', section: 'Deine Ziele', title: 'Was strebst du an?', kind: 'cards', options: [
      { v: 'muskel', label: 'Muskeln aufbauen', sub: 'Mehr Muskeln, etwas mehr Gewicht', icon: 'muscle' },
      { v: 'fit', label: 'Gewicht halten', sub: 'Fit bleiben, Form halten', icon: 'scale' },
      { v: 'rekomp', label: 'Rekomposition', sub: 'Fett verlieren und gleichzeitig Muskeln aufbauen', icon: 'rotate' },
      { v: 'abnehmen', label: 'Abnehmen', sub: 'Fett verlieren, Muskeln behalten', icon: 'down' },
      { v: 'kraft', label: 'Stärker werden', sub: 'Mehr Gewicht bewegen', icon: 'trophy' },
      { v: 'ausdauer', label: 'Ausdauer verbessern', sub: 'Länger durchhalten', icon: 'run' },
    ],
  },
  { id: 'goalWeight', section: 'Deine Ziele', title: 'Hast du ein Zielgewicht?', hint: 'Optional – sonst einfach überspringen.', kind: 'slider', min: 35, max: 180, step: 0.5, unit: 'kg', defFrom: 'weight', optional: true, when: (a) => a.goal === 'abnehmen' || a.goal === 'muskel' },
  {
    id: 'everyday', section: 'Dein Alltag', title: 'Was machst du im Alltag?', kind: 'cards', options: [
      { v: 'schule', label: 'Schule', icon: 'pencil' }, { v: 'studium', label: 'Studium / Ausbildung', icon: 'cards' }, { v: 'buero', label: 'Büro / am Schreibtisch', icon: 'window' },
      { v: 'handwerk', label: 'Handwerk / körperliche Arbeit', icon: 'brick' }, { v: 'schicht', label: 'Schichtarbeit', icon: 'clock' }, { v: 'zuhause', label: 'Zuhause / Familie', icon: 'gym' },
    ],
  },
  { id: 'job', section: 'Dein Alltag', title: 'Wie viel bewegst du dich im Alltag?', hint: 'Ohne Training. Wichtig für deinen Kalorienbedarf.', kind: 'cards', options: [{ v: 'sitzend', label: 'Wenig', sub: 'Überwiegend sitzend' }, { v: 'gemischt', label: 'Mittel', sub: 'Mal sitzen, mal laufen' }, { v: 'beine', label: 'Viel', sub: 'Viel auf den Beinen' }, { v: 'koerper', label: 'Sehr viel', sub: 'Körperlich anstrengend' }] },
  {
    id: 'steps', section: 'Dein Alltag', title: 'Wie viele Schritte machst du am Tag?', kind: 'cards', optional: true,
    options: [{ v: '3000', label: 'Unter 4.000' }, { v: '6000', label: '4.000 – 8.000' }, { v: '10000', label: '8.000 – 12.000' }, { v: '14000', label: 'Über 12.000' }, { v: '?', label: 'Weiß ich nicht' }],
    help: { title: 'Wo sehe ich das?', lines: ['iPhone: App „Health“ → Übersicht → Schritte.', 'Android: App „Google Fit“ oder „Samsung Health“.', 'Nimm ungefähr den Durchschnitt der letzten Woche.'] },
  },
  { id: 'commute', section: 'Dein Alltag', title: 'Wie kommst du meistens zur Arbeit oder Schule?', kind: 'cards', optional: true, options: [{ v: 'auto', label: 'Auto', icon: 'arrow' }, { v: 'oepnv', label: 'Bus & Bahn', icon: 'clock' }, { v: 'rad', label: 'Fahrrad', icon: 'wave' }, { v: 'fuss', label: 'Zu Fuß', icon: 'run' }, { v: 'home', label: 'Ich bleibe zuhause', icon: 'gym' }] },
  {
    id: 'sports', section: 'Dein Alltag', title: 'Machst du außerhalb vom Gym noch Sport?', hint: 'Mehrere möglich.', kind: 'multi', options: [
      { v: 'keine', label: 'Keinen' }, { v: 'fussball', label: 'Fußball' }, { v: 'laufen', label: 'Laufen' }, { v: 'rad', label: 'Radfahren' }, { v: 'schwimmen', label: 'Schwimmen' },
      { v: 'tennis', label: 'Tennis' }, { v: 'hockey', label: 'Hockey' }, { v: 'basketball', label: 'Basketball' }, { v: 'handball', label: 'Handball' }, { v: 'kampf', label: 'Kampfsport' },
      { v: 'klettern', label: 'Klettern' }, { v: 'tanzen', label: 'Tanzen' }, { v: 'yoga', label: 'Yoga' }, { v: 'andere', label: 'Anderer Sport' },
    ],
  },
  { id: 'sportDays', section: 'Dein Alltag', title: 'Wie oft pro Woche?', kind: 'cards', when: (a) => list(a.sports).some((x) => x !== 'keine'), options: ['1', '2', '3', '4', '5', '6'].map((v) => ({ v, label: `${v}× pro Woche` })) },
  { id: 'sportMin', section: 'Dein Alltag', title: 'Wie lange jeweils?', kind: 'cards', when: (a) => list(a.sports).some((x) => x !== 'keine'), options: [{ v: '30', label: '30 Minuten' }, { v: '60', label: '1 Stunde' }, { v: '90', label: '1,5 Stunden' }, { v: '120', label: '2 Stunden oder mehr' }] },
  { id: 'info1', section: 'Gut zu wissen', title: 'Training ist nur ein Teil', hint: 'Muskeln wachsen in der Pause: Schlaf, Essen und wenig Stress machen mindestens so viel aus wie das Training. Deshalb fragen wir auch danach.', kind: 'info' },
  { id: 'sleep', section: 'Erholung', title: 'Wie viel schläfst du meistens?', kind: 'cards', options: [{ v: '5', label: 'Unter 6 Stunden', icon: 'moon' }, { v: '7', label: '6–7 Stunden', icon: 'moon' }, { v: '8', label: '7–8 Stunden', icon: 'bed' }, { v: '9', label: 'Über 8 Stunden', icon: 'bed' }] },
  { id: 'stress', section: 'Erholung', title: 'Wie gestresst bist du im Moment?', kind: 'cards', options: [{ v: 'wenig', label: 'Kaum', icon: 'leaf' }, { v: 'mittel', label: 'Normal', icon: 'wave' }, { v: 'viel', label: 'Ziemlich', icon: 'bolt' }, { v: 'sehr', label: 'Sehr', icon: 'flame' }] },
  { id: 'food', section: 'Ernährung', title: 'Achtest du auf deine Ernährung?', kind: 'cards', options: [{ v: 'nein', label: 'Eher nicht' }, { v: 'etwas', label: 'Ein bisschen' }, { v: 'ja', label: 'Ja, auch auf Eiweiß' }] },
  { id: 'meals', section: 'Ernährung', title: 'Wie viele Mahlzeiten isst du am Tag?', kind: 'cards', optional: true, options: [{ v: '2', label: '1–2' }, { v: '3', label: '3' }, { v: '4', label: '4' }, { v: '5', label: '5 oder mehr' }] },
  { id: 'drink', section: 'Ernährung', title: 'Wie viel trinkst du am Tag?', hint: 'Wasser, Tee, ungesüßte Getränke.', kind: 'cards', optional: true, options: [{ v: '1', label: 'Unter 1 Liter', icon: 'drop' }, { v: '2', label: '1–2 Liter', icon: 'drop' }, { v: '3', label: 'Über 2 Liter', icon: 'drop' }] },
  {
    id: 'level', section: 'Deine Erfahrung', title: 'Wie würdest du dich selbst einschätzen?', kind: 'level', options: [
      { v: 'neuling', label: 'Neuling', sub: 'Ich war noch nie oder kaum im Gym' }, { v: 'anfaenger', label: 'Anfänger', sub: 'Ich kenne ein paar Übungen' },
      { v: 'fortgeschritten', label: 'Fortgeschritten', sub: 'Ich trainiere regelmäßig' }, { v: 'erfahren', label: 'Erfahren', sub: 'Ich trainiere seit Jahren' }, { v: 'profi', label: 'Profi', sub: 'Wettkampf oder Trainer' },
    ],
  },
  { id: 'motivation', section: 'Deine Ziele', title: 'Was motiviert dich am meisten?', hint: 'Mehrere möglich.', kind: 'multi', options: [{ v: 'freunde', label: 'Mit Freunden messen', icon: 'people' }, { v: 'zahlen', label: 'Fortschritt in Zahlen', icon: 'up' }, { v: 'abzeichen', label: 'Level & Abzeichen', icon: 'star' }, { v: 'optik', label: 'Wie ich aussehe', icon: 'camera' }, { v: 'gesund', label: 'Gesundheit', icon: 'leaf' }] },
];

const ROUND2_BASE: Step[] = [
  { id: 'expMonths', section: 'Deine Erfahrung', title: 'Wie lange trainierst du schon mit Gewichten?', kind: 'months', min: 0, max: 120, step: 1, def: 0, unit: 'Monate' },
  { id: 'knowEx', section: 'Deine Erfahrung', title: 'Kennst du die Übungen im Gym?', kind: 'cards', options: [{ v: 'kaum', label: 'Kaum', sub: 'Ich brauche Anleitungen' }, { v: 'paar', label: 'Ein paar', sub: 'Die bekannten schon' }, { v: 'meisten', label: 'Die meisten', sub: 'Ich weiß, wie es geht' }] },
  { id: 'place', section: 'Dein Training', title: 'Wo trainierst du?', kind: 'cards', options: [{ v: 'gym', label: 'Im Fitnessstudio', icon: 'gym' }, { v: 'homeDb', label: 'Zuhause mit Gewichten', icon: 'dumbbell' }, { v: 'homeBw', label: 'Zuhause ohne Geräte', icon: 'person' }] },
  { id: 'equip', section: 'Dein Training', title: 'Welche Geräte hast du zuhause?', hint: 'Mehrere möglich.', kind: 'multi', when: (a) => a.place === 'homeDb', options: [{ v: 'lh', label: 'Langhantel' }, { v: 'kh', label: 'Kurzhanteln' }, { v: 'kl', label: 'Klimmzugstange' }, { v: 'ba', label: 'Bänder' }] },
  { id: 'weekdays', section: 'Deine Woche', title: 'Deine Wochenplanung', hint: 'An welchen Tagen kannst du – und wie lange?', kind: 'week', min: 30, max: 120, step: 15 },
  { id: 'split', section: 'Deine Woche', title: 'Wie sollen die Trainings aufgeteilt sein?', kind: 'cards', options: [{ v: 'auto', label: 'Automatisch', sub: 'Passend zu deinen Tagen (empfohlen)' }, { v: 'ganz', label: 'Ganzkörper', sub: 'Jedes Mal alles' }, { v: 'ob', label: 'Oberkörper / Unterkörper' }, { v: 'ppl', label: 'Push / Pull / Beine' }] },
  { id: 'focus', section: 'Dein Fokus', title: 'Wo liegt dein Fokus?', hint: 'Höchstens 2 Muskelgruppen – oder alles gleich.', kind: 'focus', limit: 2, options: [{ v: 'brust', label: 'Brust' }, { v: 'ruecken', label: 'Rücken' }, { v: 'schultern', label: 'Schultern' }, { v: 'arme', label: 'Arme' }, { v: 'beine', label: 'Beine & Po' }, { v: 'bauch', label: 'Bauch' }, { v: 'alles', label: 'Alles gleich' }] },
  { id: 'pain', section: 'Dein Körper', title: 'Hast du Beschwerden?', hint: 'Solche Übungen lassen wir weg. Bei Schmerzen bitte ärztlich abklären.', kind: 'multi', options: [{ v: 'keine', label: 'Keine' }, { v: 'knie', label: 'Knie' }, { v: 'ruecken', label: 'Unterer Rücken' }, { v: 'schulter', label: 'Schulter' }, { v: 'ellbogen', label: 'Ellbogen' }, { v: 'handgelenk', label: 'Handgelenk' }] },
  { id: 'style', section: 'Dein Training', title: 'Welche Übungen magst du lieber?', kind: 'cards', options: [{ v: 'alles', label: 'Alles – egal' }, { v: 'maschinen', label: 'Maschinen & Kabelzüge', sub: 'Leicht zu lernen, gut für Anfänger' }, { v: 'frei', label: 'Freie Gewichte', sub: 'Hanteln, Stange, Körpergewicht' }, { v: 'ohnelh', label: 'Ohne Langhantel' }] },
  { id: 'cardio', section: 'Dein Training', title: 'Wie viel Cardio pro Training?', kind: 'cards', options: [{ v: '0', label: 'Keins' }, { v: '10', label: 'Ein bisschen', sub: '10 Minuten' }, { v: '20', label: 'Regelmäßig', sub: '20 Minuten' }] },
  { id: 'intensity', section: 'Dein Training', title: 'Wie hart willst du trainieren?', kind: 'cards', options: [{ v: 'locker', label: 'Locker', sub: '2–3 Wiederholungen bleiben übrig' }, { v: 'mittel', label: 'Ordentlich', sub: '1–2 bleiben übrig' }, { v: 'hart', label: 'Bis ans Limit', sub: '0–1 bleibt übrig' }] },
  { id: 'time', section: 'Deine Woche', title: 'Wann trainierst du meistens?', kind: 'cards', optional: true, options: [{ v: 'morgens', label: 'Morgens', icon: 'sun' }, { v: 'mittags', label: 'Mittags', icon: 'sun' }, { v: 'abends', label: 'Abends', icon: 'moon' }, { v: 'wechselnd', label: 'Wechselnd', icon: 'clock' }] },
];
/** Runde 2 (Training); Lieblings-/Ausschluss-Übungen bleiben in der Plan-Ansicht änderbar */
export const ROUND2 = ROUND2_BASE;

export const activeSteps = (steps: Step[], a: Answers) => steps.filter((s) => !s.when || s.when(a));

/** Ist der Schritt beantwortet (oder darf er leer bleiben)? */
export function stepDone(s: Step, a: Answers): boolean {
  if (s.optional || s.kind === 'info' || s.kind === 'slider' || s.kind === 'months') return true;
  if (s.kind === 'week') return list(a.weekdays).length > 0;
  return has(a, s.id);
}

const LEVEL_EXP: Record<string, string> = { neuling: 'neu', anfaenger: 'basis', fortgeschritten: 'mittel', erfahren: 'profi', profi: 'profi' };
export const monthsToExp = (m: number) => (m < 3 ? 'neu' : m < 12 ? 'basis' : m < 36 ? 'mittel' : 'profi');
/** Erlaubte Trainingsdauern des Plans (Minuten) */
const DURATIONS = [30, 45, 60, 90];
export const nearestDuration = (min: number) => String(DURATIONS.reduce((b, d) => (Math.abs(d - min) < Math.abs(b - min) ? d : b), 60));

/** Abgeleitete Plan-Antworten aus den neuen Fragen (Erfahrung, Tage, Dauer, Ziel …), ohne vorhandene Angaben zu überschreiben */
export function deriveAnswers(a: Answers): Answers {
  const out: Answers = { ...a };
  // Erfahrung: Monate (Runde 2) sind genauer als die Selbsteinschätzung (Runde 1)
  if (has(a, 'expMonths')) {
    const m = Number(a.expMonths) || 0;
    // Nicht durchgehend trainiert → eine Stufe vorsichtiger
    out.exp = monthsToExp(a.expSteady === 'nein' && m >= 3 ? Math.max(0, m / 2) : m);
  } else if (has(a, 'level') && !has(a, 'exp')) out.exp = LEVEL_EXP[String(a.level)] ?? 'basis';
  // Wer die Übungen kaum kennt, bekommt einfache Maschinen (wenn im Studio und nichts anderes gewählt)
  if ((a.knowEx === 'kaum' || out.exp === 'neu') && !has(a, 'style') && a.place !== 'homeBw' && a.place !== 'homeDb') out.style = 'maschinen';
  const days = list(a.weekdays).length;
  if (days) out.days = String(Math.min(6, days));
  if (has(a, 'durationMin')) out.duration = nearestDuration(Number(a.durationMin) || 60);
  if (has(a, 'goalWeight')) out.goalKg = 'ja';
  if (!has(out, 'split')) out.split = 'auto';
  if (has(a, 'sports') && list(a.sports).every((x) => x === 'keine')) { delete out.sportDays; delete out.sportMin; }
  return out;
}

/** Fokus: höchstens `limit` Gruppen, „alles“ schließt die anderen aus */
export function toggleLimited(cur: string[], v: string, limit: number): string[] {
  if (v === 'alles' || v === 'keine') return cur.includes(v) ? [] : [v];
  const base = cur.filter((x) => x !== 'alles' && x !== 'keine');
  if (base.includes(v)) return base.filter((x) => x !== v);
  return base.length >= limit ? [...base.slice(1), v] : [...base, v];
}

/**
 * Körperfett mit Maßband (Methode der US Navy), Maße in cm.
 * Männer: Hals + Bauch, Frauen: Hals + Bauch + Hüfte. Ergebnis gerundet auf ganze %, null bei unmöglichen Werten.
 */
export function navyBodyFat(p: { female: boolean; height: number; neck: number; waist: number; hip?: number }): number | null {
  const { female, height, neck, waist } = p;
  const hip = p.hip ?? 0;
  if (!(height > 100 && neck > 20 && waist > 40)) return null;
  const x = female ? waist + hip - neck : waist - neck;
  if (female && !(hip > 50)) return null;
  if (x <= 0) return null;
  const bf = female
    ? 495 / (1.29579 - 0.35004 * Math.log10(x) + 0.221 * Math.log10(height)) - 450
    : 495 / (1.0324 - 0.19077 * Math.log10(x) + 0.15456 * Math.log10(height)) - 450;
  if (!Number.isFinite(bf)) return null;
  return Math.round(Math.min(60, Math.max(3, bf)));
}

/** Grobe Einordnung des Körperfetts (Richtwerte, je nach Geschlecht) */
export function bodyFatLabel(bf: number, female: boolean): string {
  const t = female ? [14, 21, 25, 32] : [6, 14, 18, 25];
  return bf < t[0] ? 'sehr niedrig' : bf < t[1] ? 'sportlich' : bf < t[2] ? 'fit' : bf < t[3] ? 'durchschnittlich' : 'erhöht';
}

// ---- Status der Runden (in den Antworten gespeichert, dadurch mit dem Konto synchron) ----
export const round1Done = (a: Answers | undefined | null) => Boolean(a && typeof a.r1 === 'string' && a.r1);
export const round2Done = (a: Answers | undefined | null) => Boolean(a && typeof a.r2 === 'string' && a.r2);

const laterKey = (uid: string) => `gym-tracker-r2-later:${uid}`;
/** Runde 2 vor dem Training anbieten? Nicht, wenn erledigt oder vor weniger als 3 Tagen „Später“ gewählt */
export function offerRound2(a: Answers | null | undefined, uid: string, today: string): boolean {
  if (round2Done(a)) return false;
  try {
    const later = localStorage.getItem(laterKey(uid));
    if (later && (Date.parse(today) - Date.parse(later)) / 864e5 < 3) return false;
  } catch {
    /* ignorieren */
  }
  return true;
}
export function snoozeRound2(uid: string, today: string) {
  try {
    localStorage.setItem(laterKey(uid), today);
  } catch {
    /* nur Komfort */
  }
}
