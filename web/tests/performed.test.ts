import { describe, expect, test } from 'vitest';
import { performedExercises, performedStrengthNames } from '../src/lib/performed';

const ex = [
  { id: 1, name: 'Bankdrücken', type: 'strength' as const },
  { id: 2, name: 'Kniebeuge', type: 'strength' as const },
  { id: 3, name: 'Laufen', type: 'cardio' as const },
  { id: 4, name: 'Rudern', type: 'strength' as const },
];
describe('Schon gemachte Übungen', () => {
  test('nur Übungen mit echten Sätzen', () => {
    const sets = [
      { exercise_id: 1, weight_kg: 60, reps: 8 },
      { exercise_id: 2, weight_kg: 40, reps: 5, is_warmup: true }, // Aufwärmen zählt nicht
      { exercise_id: 4, weight_kg: 0, reps: 10 }, // ohne Gewicht zählt nicht
      { exercise_id: 3, duration_min: 20 },
    ];
    expect(performedExercises(ex, sets).map((e) => e.id)).toEqual([1, 3]);
  });
  test('ohne Training ist die Liste leer', () => {
    expect(performedExercises(ex, [])).toEqual([]);
  });
  test('Namen für die Bestenliste (klein, nur Kraft)', () => {
    const names = performedStrengthNames(ex, [{ exercise_id: 1, weight_kg: 60, reps: 8 }, { exercise_id: 3, duration_min: 30 }]);
    expect([...names]).toEqual(['bankdrücken']);
  });
});
