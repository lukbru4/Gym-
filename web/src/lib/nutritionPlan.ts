// Ernährungsplan aus dem Interview: Grundumsatz, Gesamtumsatz, Kalorienziel, Makros, Wasser und Zeitrahmen.
// Nur etablierte Standards (Mifflin-St-Jeor, übliche Aktivitätsfaktoren, ca. 7.700 kcal je kg, sportmedizinische
// Protein-/Fettrichtwerte). Allgemeine Orientierung, keine medizinische Beratung.

export type Sex = 'm' | 'w';
export type Goal = 'abnehmen' | 'halten' | 'zunehmen';
export type Activity = 'sitzend' | 'leicht' | 'maessig' | 'sehr' | 'athlet';
export type Pace = 'sanft' | 'stetig' | 'aggressiv';
export type Diet = 'keine' | 'protein' | 'lowcarb' | 'keto' | 'vegetarisch' | 'vegan';

export interface PlanInput {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  goalWeightKg: number | null;
  activity: Activity;
  pace: Pace;
  diet: Diet;
  notes: string;
}

export const ACTIVITY_FACTORS: Record<Activity, number> = { sitzend: 1.2, leicht: 1.375, maessig: 1.55, sehr: 1.725, athlet: 1.9 };
export const KCAL_PER_KG = 7700;
const MIN_KCAL: Record<Sex, number> = { m: 1500, w: 1200 };

export interface PlanResult {
  bmr: number;
  tdee: number;
  /** tägliche Anpassung gegenüber dem Gesamtumsatz (negativ = Defizit) */
  adjust: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterL: number;
  /** erwartete Gewichtsänderung pro Woche in kg (negativ = Abnahme) */
  weeklyKg: number;
  /** Wochen bis zum Zielgewicht (nur Abnehmen/Zunehmen mit Zielgewicht) */
  weeks: number | null;
  /** true, wenn die Mindestkalorien das Defizit begrenzt haben */
  floored: boolean;
  safety: string;
}

/** Grundumsatz nach Mifflin-St-Jeor */
export const bmrOf = (sex: Sex, kg: number, cm: number, age: number) => 10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161);

const round = (n: number, step = 1) => Math.round(n / step) * step;

/** Tägliches Defizit/Überschuss in kcal je Ziel und Tempo */
export function dailyAdjust(goal: Goal, pace: Pace, weightKg: number): number {
  if (goal === 'halten') return 0;
  if (goal === 'abnehmen') {
    // sanft 250, stetig 400, aggressiv bis 750 – höchstens etwa 1 % des Körpergewichts pro Woche
    const kcal = pace === 'sanft' ? 250 : pace === 'stetig' ? 400 : Math.min(750, round((weightKg * 0.01 * KCAL_PER_KG) / 7, 10));
    return -kcal;
  }
  return pace === 'sanft' ? 250 : pace === 'stetig' ? 300 : 400;
}

export function computePlan(i: PlanInput): PlanResult {
  const bmr = bmrOf(i.sex, i.weightKg, i.heightCm, i.age);
  const tdee = bmr * ACTIVITY_FACTORS[i.activity];
  let adjust = dailyAdjust(i.goal, i.pace, i.weightKg);
  let kcal = round(tdee + adjust, 10);
  let floored = false;
  if (kcal < MIN_KCAL[i.sex]) {
    kcal = MIN_KCAL[i.sex];
    floored = true;
  }
  adjust = kcal - Math.round(tdee);
  const proteinPerKg = i.goal === 'abnehmen' || i.activity === 'athlet' ? 2.2 : i.goal === 'zunehmen' ? 2 : 1.8;
  const protein = Math.round(i.weightKg * proteinPerKg);
  const fat = Math.round(i.weightKg * 0.8);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const waterL = Math.round(((i.weightKg * 33) / 1000) * 10) / 10;
  // Wöchentliche Lücke = (Gesamtumsatz − Ziel) × 7; Gewichtsänderung = Lücke / 7700
  const weeklyKg = i.goal === 'halten' ? 0 : -((tdee - kcal) * 7) / KCAL_PER_KG;
  let weeks: number | null = null;
  if (i.goal !== 'halten' && i.goalWeightKg !== null && Math.abs(weeklyKg) > 0.01) {
    const diff = i.goalWeightKg - i.weightKg;
    if ((diff < 0 && weeklyKg < 0) || (diff > 0 && weeklyKg > 0)) weeks = Math.ceil(Math.abs(diff) / Math.abs(weeklyKg));
  }
  const rate = Math.abs(weeklyKg);
  const safety =
    i.goal === 'halten'
      ? 'Du isst genau so viel, wie du verbrauchst – dein Gewicht bleibt stabil.'
      : i.goal === 'abnehmen'
        ? `Rund ${String(Math.round(rate * 100) / 100).replace('.', ',')} kg pro Woche (${String(Math.round((rate / i.weightKg) * 1000) / 10).replace(".", ",")} % deines Gewichts) liegen im üblichen sicheren Bereich bis 1 %: Du schützt Muskeln und behältst Energie.${floored ? ' Wir bleiben dabei nicht unter ' + MIN_KCAL[i.sex].toLocaleString('de-DE') + ' kcal.' : ''}`
        : `Mit etwa ${Math.abs(adjust)} kcal Überschuss baust du langsam auf: möglichst viel Muskel, wenig zusätzliches Fett.`;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), adjust, kcal, protein, carbs, fat, waterL, weeklyKg: Math.round(weeklyKg * 100) / 100, weeks, floored, safety };
}

export const ACTIVITY_OPTIONS: [Activity, string, string][] = [
  ['sitzend', 'Sitzend', 'Bürojob, kaum Bewegung'],
  ['leicht', 'Leicht aktiv', '1–3 Trainingstage pro Woche'],
  ['maessig', 'Mäßig aktiv', '3–5 Trainingstage pro Woche'],
  ['sehr', 'Sehr aktiv', '6–7 Trainingstage pro Woche'],
  ['athlet', 'Athlet', 'Training mehrmals täglich oder körperlich harte Arbeit'],
];
export const GOAL_OPTIONS: [Goal, string, string][] = [
  ['abnehmen', 'Abnehmen', 'Körperfett reduzieren'],
  ['halten', 'Halten', 'Gewicht stabil halten'],
  ['zunehmen', 'Zunehmen', 'Muskeln aufbauen'],
];
export const PACE_OPTIONS: [Pace, string, string][] = [
  ['sanft', 'Sanft', 'Langsam, ohne Verzicht'],
  ['stetig', 'Stetig', 'Guter Mittelweg'],
  ['aggressiv', 'Aggressiv', 'Schneller, aber anstrengender'],
];
export const DIET_OPTIONS: [Diet, string][] = [
  ['keine', 'Keine Präferenz'], ['protein', 'Proteinreich'], ['lowcarb', 'Low Carb'], ['keto', 'Keto'], ['vegetarisch', 'Vegetarisch'], ['vegan', 'Vegan'],
];
