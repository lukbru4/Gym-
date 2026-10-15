import { describe, expect, test } from 'vitest';
import { dayStreak, trainingDaysThisWeek } from '../src/lib/stats';

// 2026-09-28 ist ein Montag
const w = (...dates: string[]) => dates.map((date) => ({ date }));
describe('Tages-Serie mit Wochenziel', () => {
  test('Beispiel: Ziel 2/Woche, Training am Mittwoch → 3 Tage', () => {
    expect(dayStreak(w('2026-09-30'), '2026-09-30', 2)).toBe(3);
    expect(dayStreak(w('2026-09-30'), '2026-10-02', 2)).toBe(3); // Fr: Ziel noch offen, bis Mi gezählt
  });
  test('Ziel erreicht → Tage bis heute, am Sonntag 7', () => {
    expect(dayStreak(w('2026-09-30', '2026-10-01'), '2026-10-01', 2)).toBe(4);
    expect(dayStreak(w('2026-09-30', '2026-10-01'), '2026-10-04', 2)).toBe(7);
  });
  test('Volle Wochen addieren sich, laufende Woche zählt dazu', () => {
    const list = w('2026-09-15', '2026-09-18', '2026-09-22', '2026-09-26', '2026-09-29');
    expect(dayStreak(list, '2026-09-30', 2)).toBe(7 + 7 + 2);
  });
  test('Verfehlte Woche setzt auf 0 zurück', () => {
    const list = w('2026-09-15', '2026-09-18', '2026-09-23', '2026-09-30');
    expect(dayStreak(list, '2026-09-30', 2)).toBe(3); // Woche 21.–27.9. nur 1×
  });
  test('Leere Woche dazwischen bricht ab; laufende Woche ohne Training bricht noch nicht ab', () => {
    expect(dayStreak(w('2026-09-15', '2026-09-17', '2026-09-30'), '2026-09-30', 2)).toBe(3);
    expect(dayStreak(w('2026-09-22', '2026-09-24'), '2026-09-29', 2)).toBe(7);
  });
  test('Zwei Trainings am selben Tag zählen als ein Trainingstag', () => {
    expect(dayStreak(w('2026-09-29', '2026-09-29'), '2026-10-01', 2)).toBe(2);
    expect(trainingDaysThisWeek(w('2026-09-29', '2026-09-29', '2026-09-30'), '2026-10-01')).toBe(2);
  });
  test('Ziel 1 und 7', () => {
    expect(dayStreak(w('2026-09-28'), '2026-10-01', 1)).toBe(4);
    expect(dayStreak(w('2026-09-28', '2026-09-29'), '2026-09-29', 7)).toBe(2);
    expect(dayStreak([], '2026-09-29', 2)).toBe(0);
  });
});
