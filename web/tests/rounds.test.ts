import { describe, expect, it } from 'vitest';
import { accessState } from '../src/lib/access';
import { generatePlan } from '../src/lib/plan';
import { calorieNeeds } from '../src/lib/calories';
import { PRO_PRICES, yearSavingPct } from '../src/lib/pro';
import { activeSteps, deriveAnswers, monthsToExp, navyBodyFat, nearestDuration, ROUND1, ROUND2, toggleLimited } from '../src/lib/rounds';

const base = { paywallOn: true, pro: false, since: '2026-11-08', trialDays: 7, today: '2026-11-20' };

describe('Zugang (Testphase/Abo)', () => {
  it('Schranke aus oder Pro: frei', () => {
    expect(accessState({ ...base, paywallOn: false, accountCreated: '2026-12-01', trialStart: '2026-01-01' }).state).toBe('free');
    expect(accessState({ ...base, pro: true, accountCreated: '2026-12-01', trialStart: '2026-01-01' }).state).toBe('free');
  });
  it('Bestandskonten bleiben frei', () => {
    expect(accessState({ ...base, accountCreated: '2025-05-01T10:00:00Z', trialStart: '2026-01-01' }).state).toBe('free');
    expect(accessState({ ...base, accountCreated: null, trialStart: null }).state).toBe('free');
  });
  it('7 Tage Testphase ab Ende der Fragerunde, danach gesperrt', () => {
    const acc = '2026-11-10T09:00:00Z';
    expect(accessState({ ...base, accountCreated: acc, trialStart: null })).toEqual({ state: 'trial', daysLeft: 7 });
    expect(accessState({ ...base, accountCreated: acc, trialStart: '2026-11-20' })).toEqual({ state: 'trial', daysLeft: 7 });
    expect(accessState({ ...base, accountCreated: acc, trialStart: '2026-11-14' })).toEqual({ state: 'trial', daysLeft: 1 });
    expect(accessState({ ...base, accountCreated: acc, trialStart: '2026-11-13' }).state).toBe('locked');
  });
  it('Preise 8 € / 45 €', () => {
    expect(PRO_PRICES).toEqual({ month: 8, year: 45 });
    expect(yearSavingPct()).toBe(53);
  });
});

describe('Fragerunden', () => {
  it('Runde 1 hat etwa 20, Runde 2 etwa 12 Fragen', () => {
    expect(activeSteps(ROUND1, {}).filter((s) => s.kind !== 'info').length).toBeGreaterThanOrEqual(19);
    expect(activeSteps(ROUND2, {}).length).toBeGreaterThanOrEqual(10);
    expect(activeSteps(ROUND2, {}).length).toBeLessThanOrEqual(15);
  });
  it('Navy-Formel', () => {
    expect(navyBodyFat({ female: false, height: 180, neck: 38, waist: 85 })).toBe(16);
    const w = navyBodyFat({ female: true, height: 168, neck: 32, waist: 72, hip: 98 })!;
    expect(w).toBeGreaterThan(20);
    expect(w).toBeLessThan(32);
    expect(navyBodyFat({ female: true, height: 168, neck: 32, waist: 72 })).toBeNull();
    expect(navyBodyFat({ female: false, height: 180, neck: 40, waist: 39 })).toBeNull();
  });
  it('Fokus höchstens 2, „alles“ schließt aus', () => {
    expect(toggleLimited(['brust'], 'arme', 2)).toEqual(['brust', 'arme']);
    expect(toggleLimited(['brust', 'arme'], 'beine', 2)).toEqual(['arme', 'beine']);
    expect(toggleLimited(['brust'], 'alles', 2)).toEqual(['alles']);
    expect(toggleLimited(['alles'], 'bauch', 2)).toEqual(['bauch']);
  });
  it('Antworten werden für den Plan übersetzt', () => {
    expect(monthsToExp(0)).toBe('neu');
    expect(monthsToExp(30)).toBe('mittel');
    expect(nearestDuration(75)).toBe('60');
    expect(nearestDuration(120)).toBe('90');
    const a = deriveAnswers({ level: 'neuling', weekdays: ['Mo', 'Mi', 'Fr'], durationMin: '45', goal: 'rekomp' });
    expect(a).toMatchObject({ exp: 'neu', days: '3', duration: '45', style: 'maschinen', split: 'auto' });
    // Monate (Runde 2) gelten vor der Selbsteinschätzung
    expect(deriveAnswers({ level: 'neuling', expMonths: '40' }).exp).toBe('profi');
    expect(deriveAnswers({ expMonths: '20', expSteady: 'nein' }).exp).toBe('basis');
  });
  it('Neuling bekommt einen Plan mit Maschinen, Rekomposition hat Kalorien', () => {
    const a = deriveAnswers({ sex: 'm', age: '20', height: '180', weight: '80', goal: 'rekomp', job: 'sitzend', level: 'neuling', place: 'gym', weekdays: ['Mo', 'Do'], durationMin: '45' });
    const plan = generatePlan(a);
    expect(plan.templates.length).toBeGreaterThan(0);
    const names = plan.templates.flatMap((t) => t.exercises.filter((e) => !e.cardio).map((e) => e.name));
    expect(names.some((n) => /Maschine|Kabel|presse|zug/i.test(n))).toBe(true);
    const k = calorieNeeds(a)!;
    expect(k.adjust).toBe(-200);
  });
});

describe('Pläne (Splits)', () => {
  const base = { sex: 'm', age: '25', height: '180', weight: '80', goal: 'muskel', exp: 'mittel', place: 'gym', duration: '60' };
  it('Arnold-Split: Brust & Rücken, Schultern & Arme, Beine', () => {
    const p = generatePlan({ ...base, split: 'arnold', days: '6' });
    expect(p.templates.map((t) => t.name)).toEqual(['Plan · Brust & Rücken A', 'Plan · Schultern & Arme A', 'Plan · Beine A', 'Plan · Brust & Rücken B', 'Plan · Schultern & Arme B', 'Plan · Beine B']);
    expect(p.templates.every((t) => t.exercises.length >= 4)).toBe(true);
  });
  it('Bro-Split: 5 Tage, ein Muskel pro Tag', () => {
    const p = generatePlan({ ...base, split: 'bro', days: '5' });
    expect(p.templates.map((t) => t.name.replace('Plan · ', ''))).toEqual(['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine']);
    expect(generatePlan({ ...base, split: 'bro', days: '3' }).notes.some((n) => n.includes('Bro-Split'))).toBe(true);
  });
});
