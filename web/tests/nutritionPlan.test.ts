import { describe, expect, it } from 'vitest';
import { bmrOf, computePlan, dailyAdjust, type PlanInput } from '../src/lib/nutritionPlan';

const base: PlanInput = { name: 'Lukas', age: 30, sex: 'm', heightCm: 180, weightKg: 85, goal: 'abnehmen', goalWeightKg: 78, activity: 'maessig', pace: 'stetig', diet: 'keine', notes: '' };

describe('nutritionPlan', () => {
  it('Grundumsatz nach Mifflin-St-Jeor', () => {
    expect(bmrOf('m', 85, 180, 30)).toBeCloseTo(10 * 85 + 6.25 * 180 - 150 + 5);
    expect(bmrOf('w', 60, 165, 25)).toBeCloseTo(10 * 60 + 6.25 * 165 - 125 - 161);
  });
  it('Gesamtumsatz = Grundumsatz × Faktor, Abnehmen stetig = 400 kcal Defizit', () => {
    const r = computePlan(base);
    expect(r.bmr).toBe(1830);
    expect(r.tdee).toBe(Math.round(1830.0 * 1.55));
    expect(r.adjust).toBeLessThan(0);
    expect(r.kcal).toBe(Math.round((r.tdee - 400) / 10) * 10);
  });
  it('Makros: Protein 2,2 g/kg beim Abnehmen, Fett 0,8 g/kg, Rest Kohlenhydrate, Wasser in Litern', () => {
    const r = computePlan(base);
    expect(r.protein).toBe(Math.round(85 * 2.2));
    expect(r.fat).toBe(68);
    expect(r.carbs).toBe(Math.round((r.kcal - r.protein * 4 - r.fat * 9) / 4));
    expect(r.waterL).toBeGreaterThan(2.5);
    expect(r.waterL).toBeLessThan(3.1);
  });
  it('Zeitrahmen passt zum Defizit (≈400 kcal ≈ 0,3–0,4 kg/Woche)', () => {
    const r = computePlan(base);
    expect(Math.abs(r.weeklyKg)).toBeGreaterThanOrEqual(0.3);
    expect(Math.abs(r.weeklyKg)).toBeLessThanOrEqual(0.45);
    expect(r.weeks).toBe(Math.ceil(7 / Math.abs(r.weeklyKg)));
  });
  it('Mindestkalorien: nie unter 1.500 (Männer) / 1.200 (Frauen)', () => {
    const w = computePlan({ ...base, sex: 'w', weightKg: 48, heightCm: 155, age: 55, activity: 'sitzend', pace: 'aggressiv', goalWeightKg: 45 });
    expect(w.kcal).toBeGreaterThanOrEqual(1200);
    const m = computePlan({ ...base, weightKg: 55, heightCm: 160, age: 60, activity: 'sitzend', pace: 'aggressiv', goalWeightKg: 50 });
    expect(m.kcal).toBeGreaterThanOrEqual(1500);
    expect(m.floored).toBe(true);
  });
  it('Halten: Gesamtumsatz, kein Zeitrahmen', () => {
    const r = computePlan({ ...base, goal: 'halten', goalWeightKg: null });
    expect(Math.abs(r.kcal - r.tdee)).toBeLessThanOrEqual(5);
    expect(r.weeks).toBeNull();
    expect(r.weeklyKg).toBe(0);
  });
  it('Zunehmen: Überschuss 250–400, Zeitrahmen mit positivem Zuwachs', () => {
    const r = computePlan({ ...base, goal: 'zunehmen', goalWeightKg: 90, pace: 'stetig' });
    expect(r.adjust).toBeGreaterThanOrEqual(250);
    expect(r.adjust).toBeLessThanOrEqual(405);
    expect(r.weeks).toBeGreaterThan(0);
  });
  it('Aggressiv abnehmen: höchstens 750 kcal bzw. 1 % pro Woche', () => {
    expect(dailyAdjust('abnehmen', 'aggressiv', 120)).toBe(-750);
    expect(dailyAdjust('abnehmen', 'aggressiv', 60)).toBe(-660);
  });
  it('Zielgewicht in falscher Richtung ergibt keinen Zeitrahmen', () => {
    expect(computePlan({ ...base, goalWeightKg: 95 }).weeks).toBeNull();
  });
});
