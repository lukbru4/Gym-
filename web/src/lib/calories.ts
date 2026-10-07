// Kalorienbedarf aus den Antworten der Fragen (Einstellungen → Fragen): Grundumsatz + Alltag + Training + Ziel.
// Nur eine Schätzung mit üblichen Formeln (Mifflin-St-Jeor, MET-Werte), kein ärztlicher Rat.
type Answers = Record<string, string | string[] | undefined>;

export const JOB_FACTORS: Record<string, number> = { sitzend: 1.2, gemischt: 1.3, beine: 1.4, koerper: 1.55 };
export const JOB_OPTIONS: [string, string][] = [['sitzend', 'Überwiegend sitzend'], ['gemischt', 'Gemischt'], ['beine', 'Viel auf den Beinen'], ['koerper', 'Körperlich anstrengend']];
const STRENGTH_MET: Record<string, number> = { locker: 4, mittel: 5, hart: 6 };
const CARDIO_MET = 7;
/** Durchschnittlicher Energieverbrauch (MET) der Sportarten außerhalb vom Gym (Richtwerte aus dem „Compendium of Physical Activities“) */
export const SPORT_MET: Record<string, number> = { hockey: 8, tennis: 7, fussball: 8, laufen: 9.8, rad: 7.5, schwimmen: 7, basketball: 8, handball: 8, volleyball: 4, badminton: 5.5, kampf: 10, klettern: 8, wandern: 5.3, tanzen: 5, yoga: 3, ski: 7, andere: 6 };

export interface CalorieNeeds {
  bmr: number;
  /** Grundumsatz × Alltagsfaktor */
  daily: number;
  /** durchschnittlich pro Tag durch das Training */
  training: number;
  /** durchschnittlich pro Tag durch Sport außerhalb vom Gym */
  sport: number;
  tdee: number;
  adjust: number;
  target: number;
  protein: number;
  fat: number;
  carbs: number;
  goalNote: string;
}

const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function calorieNeeds(a: Answers): CalorieNeeds | null {
  const weight = num(a.weight), height = num(a.height), age = num(a.age);
  if (!weight || !height || !age) return null;
  const offset = a.sex === 'm' ? 5 : a.sex === 'w' ? -161 : -78; // divers/keine Angabe: Mittelwert
  const bmr = 10 * weight + 6.25 * height - 5 * age + offset;
  const daily = bmr * (JOB_FACTORS[String(a.job)] ?? JOB_FACTORS.gemischt);
  const days = Math.min(7, Math.max(0, num(a.days) ?? 3));
  const minutes = num(a.duration) ?? 60;
  const cardioMin = num(a.cardio) ?? 0;
  const perSession = (STRENGTH_MET[String(a.intensity)] ?? 5) * weight * (minutes / 60) + CARDIO_MET * weight * (cardioMin / 60);
  const training = (days * perSession) / 7;
  // Sport außerhalb vom Gym: Durchschnitt der gewählten Sportarten × Häufigkeit × Dauer (ohne den Ruheverbrauch, daher MET − 1)
  const sports = (Array.isArray(a.sports) ? a.sports : []).filter((x) => x !== 'keine');
  const sportDays = sports.length ? Math.min(7, num(a.sportDays) ?? 0) : 0;
  const meanMet = sports.length ? sports.reduce((m, x) => m + (SPORT_MET[x] ?? 6), 0) / sports.length : 0;
  const sport = (sportDays * Math.max(0, meanMet - 1) * weight * ((num(a.sportMin) ?? 60) / 60)) / 7;
  const tdee = daily + training + sport;
  const goal = String(a.goal ?? '');
  const adjust = goal === 'abnehmen' ? -400 : goal === 'muskel' ? 250 : goal === 'kraft' ? 150 : 0;
  const goalNote = goal === 'abnehmen' ? 'zum Abnehmen etwa 400 kcal unter deinem Verbrauch' : goal === 'muskel' ? 'zum Muskelaufbau etwa 250 kcal über deinem Verbrauch' : goal === 'kraft' ? 'etwas über deinem Verbrauch für mehr Kraft' : 'etwa dein geschätzter Verbrauch';
  const target = Math.min(6000, Math.max(1200, Math.round((tdee + adjust) / 50) * 50));
  const perKg = goal === 'muskel' || goal === 'abnehmen' ? 2 : goal === 'kraft' ? 1.8 : goal === 'ausdauer' ? 1.5 : 1.6;
  const protein = Math.round(perKg * weight);
  const fat = Math.round((target * 0.25) / 9);
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), daily: Math.round(daily), training: Math.round(training), sport: Math.round(sport), tdee: Math.round(tdee), adjust, target, protein, fat, carbs, goalNote };
}
