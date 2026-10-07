import { describe, expect, test } from 'vitest';
import { calorieNeeds } from '../src/lib/calories';
import { QUESTIONS } from '../src/lib/plan';

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
});
