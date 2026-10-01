import { describe, expect, test } from 'vitest';
import { change, computeRecap, greeting, recapRange } from '../src/lib/recap';
import type { ExerciseMap, Workout, WorkoutSet } from '../src/lib/types';

const ex: ExerciseMap = new Map([
  [1, { name: 'Bankdrücken', type: 'strength', muscles: ['brust'], user_id: null }],
  [2, { name: 'Laufband', type: 'cardio', muscles: [], user_id: null }],
]);

describe('Zeiträume', () => {
  test('Woche: Montag bis heute, Vergleich bis zum gleichen Wochentag', () => {
    expect(recapRange('week', '2026-10-01')).toEqual({ from: '2026-09-28', prevFrom: '2026-09-21', prevTo: '2026-09-24' });
  });
  test('Monat: ab dem 1., Vergleich bis zum gleichen Tag (kürzerer Vormonat)', () => {
    expect(recapRange('month', '2026-03-31')).toEqual({ from: '2026-03-01', prevFrom: '2026-02-01', prevTo: '2026-02-28' });
    expect(recapRange('month', '2026-01-15')).toEqual({ from: '2026-01-01', prevFrom: '2025-12-01', prevTo: '2025-12-15' });
  });
});

describe('Rückblick', () => {
  const workouts: Workout[] = [
    { id: 1, date: '2026-09-15' },
    { id: 2, date: '2026-09-22' }, // Vorwoche (Di)
    { id: 3, date: '2026-09-29' }, // diese Woche
    { id: 4, date: '2026-10-01' },
  ];
  const sets: WorkoutSet[] = [
    { workout_id: 1, exercise_id: 1, reps: 5, weight_kg: 80 },
    { workout_id: 2, exercise_id: 1, reps: 5, weight_kg: 80 },
    { workout_id: 3, exercise_id: 1, reps: 5, weight_kg: 20, is_warmup: true },
    { workout_id: 3, exercise_id: 1, reps: 5, weight_kg: 85 },
    { workout_id: 3, exercise_id: 1, reps: 5, weight_kg: 85 },
    { workout_id: 4, exercise_id: 2, duration_min: 30, distance_km: 5 },
  ];
  const r = computeRecap(workouts, sets, ex, '2026-10-01', 'week');
  test('zählt Trainings, Arbeitssätze, Volumen, Cardio', () => {
    expect(r).toMatchObject({ workouts: 2, days: 2, sets: 3, volume: 850, cardioMin: 30, distanceKm: 5 });
  });
  test('Vergleich mit der Vorwoche bis Donnerstag', () => {
    expect(r.previous).toEqual({ workouts: 1, volume: 400, sets: 1 });
    expect(change(r.volume, r.previous.volume)).toBe(113);
  });
  test('neuer Bestwert, Lieblingsübung, Muskel, Serie', () => {
    expect(r.prs).toHaveLength(1);
    expect(r.prs[0].exercise).toBe('Bankdrücken');
    expect(r.topExercise).toEqual({ name: 'Bankdrücken', sets: 2 });
    expect(r.topMuscle).toBe('Brust');
    expect(r.streak).toBe(3);
  });
  test('erste Ausführung einer Übung ist kein Rekord', () => {
    const first = computeRecap(workouts.slice(2), sets.filter((s) => s.workout_id >= 3), ex, '2026-10-01', 'week');
    expect(first.prs).toEqual([]);
  });
  test('kein Vergleich ohne Vorzeitraum', () => expect(change(5, 0)).toBeNull());
  test('Gruß nach Tageszeit', () => {
    expect(greeting(8)).toBe('Guten Morgen');
    expect(greeting(14)).toBe('Hallo');
    expect(greeting(20)).toBe('Guten Abend');
  });
});
