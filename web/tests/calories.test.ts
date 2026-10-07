import { describe, expect, test } from 'vitest';
import { calorieNeeds } from '../src/lib/calories';
import { activeQuestions, QUESTIONS } from '../src/lib/plan';

const base = { sex: 'm', age: '30', height: '180', weight: '80', job: 'sitzend', days: '3', duration: '60', intensity: 'mittel', cardio: '0', goal: 'muskel' };

describe('Kalorienbedarf', () => {
  test('Beispielrechnung: Mann, 30 J., 180 cm, 80 kg', () => {
    const n = calorieNeeds(base)!;
    expect(n.bmr).toBe(1780); // 10·80 + 6,25·180 − 5·30 + 5
    expect(n.daily).toBe(2136); // × 1,2 (sitzend)
    expect(n.training).toBe(171); // 5 MET · 80 kg · 1 h = 400 kcal pro Training · 3 / 7
    expect(n.tdee).toBe(2307);
    expect(n.adjust).toBe(250);
    expect(n.target).toBe(2550); // 2557 auf 50 gerundet
    expect(n.protein).toBe(160); // 2 g pro kg
    expect(n.fat).toBe(71); // 25 % der Kalorien
    expect(n.carbs).toBe(318);
  });
  test('mehr Training und aktiverer Alltag erhöhen den Bedarf', () => {
    const low = calorieNeeds({ ...base, days: '2' })!.target;
    const high = calorieNeeds({ ...base, days: '6' })!.target;
    expect(high).toBeGreaterThan(low);
    expect(calorieNeeds({ ...base, job: 'koerper' })!.target).toBeGreaterThan(calorieNeeds(base)!.target);
    expect(calorieNeeds({ ...base, cardio: '20' })!.training).toBeGreaterThan(calorieNeeds(base)!.training);
  });
  test('Ziel: Abnehmen unter, Muskelaufbau über dem Verbrauch', () => {
    const cut = calorieNeeds({ ...base, goal: 'abnehmen' })!;
    expect(cut.target).toBe(1900); // 2307 − 400 = 1907 → 1900
    expect(cut.target).toBeLessThan(cut.tdee);
    expect(calorieNeeds({ ...base, goal: 'fit' })!.adjust).toBe(0);
  });
  test('ohne Angabe zum Alltag gilt „gemischt“; fehlende Werte → null; Untergrenze 1.200', () => {
    expect(calorieNeeds({ ...base, job: undefined })!.daily).toBe(Math.round(1780 * 1.3));
    expect(calorieNeeds({ age: '30', height: '180' })).toBeNull();
    expect(calorieNeeds({ sex: 'w', age: '70', height: '140', weight: '35', days: '1', goal: 'abnehmen' })!.target).toBe(1200);
  });
  test('Frage „job“ steht nach dem Gewicht', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(ids.indexOf('job')).toBe(ids.indexOf('weight') + 1);
  });
  test('Sport außerhalb vom Gym (z. B. Feldhockey, Tennis) erhöht den Bedarf', () => {
    const none = calorieNeeds(base)!;
    expect(none.sport).toBe(0);
    const hockey = calorieNeeds({ ...base, sports: ['hockey'], sportDays: '2', sportMin: '90' })!;
    // (8 − 1) MET · 80 kg · 1,5 h = 840 kcal pro Einheit · 2 / 7 = 240 kcal pro Tag
    expect(hockey.sport).toBe(240);
    expect(hockey.tdee).toBe(none.tdee + 240);
    // Mittelwert zweier Sportarten: Hockey (8) und Tennis (7) → 7,5
    expect(calorieNeeds({ ...base, sports: ['hockey', 'tennis'], sportDays: '2', sportMin: '90' })!.sport).toBe(223); // (7,5 − 1) · 80 · 1,5 · 2 / 7
    // „Keinen“ oder keine Häufigkeit → kein Zuschlag
    expect(calorieNeeds({ ...base, sports: ['keine'], sportDays: '3' })!.sport).toBe(0);
    expect(calorieNeeds({ ...base, sports: ['tennis'] })!.sport).toBe(0);
  });
  test('Zusatzfragen erscheinen nur, wenn Sport angegeben wurde', () => {
    const ids = (a: Record<string, string | string[]>) => activeQuestions(a).map((q) => q.id);
    expect(ids({})).not.toContain('sportDays');
    expect(ids({ sports: ['keine'] })).not.toContain('sportDays');
    expect(ids({ sports: ['hockey'] })).toEqual(expect.arrayContaining(['sportDays', 'sportMin']));
  });
  test('Mit Zielgewicht: Tempo und Wochen', () => {
    // 80 kg → 72 kg: 0,5 % pro Woche = 0,4 kg ≈ 440 kcal Defizit, 8 kg / 0,4 = 20 Wochen
    const cut = calorieNeeds({ ...base, goal: 'fit', goalKg: 'ja', goalWeight: '72' })!;
    expect(cut.adjust).toBe(-440);
    expect(cut.weeks).toBe(20);
    expect(cut.goalNote).toContain('72');
    // 80 → 84 kg: 0,25 % pro Woche = 0,2 kg ≈ 220 kcal Überschuss, 20 Wochen
    const gain = calorieNeeds({ ...base, goal: 'fit', goalKg: 'ja', goalWeight: '84' })!;
    expect(gain.adjust).toBe(220);
    expect(gain.weeks).toBe(20);
    // schon nah dran → halten; „kein Zielgewicht“ → altes Verhalten
    expect(calorieNeeds({ ...base, goalKg: 'ja', goalWeight: '80.5' })!.adjust).toBe(0);
    expect(calorieNeeds({ ...base, goalKg: 'kein' })!.weeks).toBeNull();
    expect(calorieNeeds(base)!.adjust).toBe(250);
  });
});
