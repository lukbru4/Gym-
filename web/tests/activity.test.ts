import { describe, expect, it } from 'vitest';
import { activities } from '../src/lib/activity';
import type { ExerciseMap } from '../src/lib/types';

const ex: ExerciseMap = new Map([[1, { name: 'Bankdrücken', type: 'strength', muscles: ['brust'], user_id: null }]]);
describe('Deine Aktivitäten', () => {
  const base = {
    from: '2026-11-02', to: '2026-11-04',
    workouts: [{ id: 1, date: '2026-11-03' }, { id: 2, date: '2026-10-20' }],
    sets: [{ workout_id: 1, exercise_id: 1, reps: 10, weight_kg: 60 }, { workout_id: 1, exercise_id: 1, reps: 8, weight_kg: '62,5' }],
    exercises: ex,
  };
  it('Training im Zeitraum mit Sätzen und Volumen', () => {
    const a = activities(base);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ date: '2026-11-03', kind: 'workout' });
    expect(a[0].text).toBe('Bankdrücken · 2 Sätze · 1.100 kg');
  });
  it('alle Quellen, neueste zuerst, Bestwerte oben', () => {
    const a = activities({
      ...base,
      prs: [{ exercise: 'Bankdrücken', e1rm: 79.2 }],
      taken: { '2026-11-04': ['k', 'x'], '2026-10-01': ['k'] }, suppNames: new Map([['k', 'Kreatin']]),
      water: { '2026-11-02': 1500 },
      weights: [{ id: 1, date: '2026-11-02', weight_kg: 80.4 }],
      gymLog: [{ date: '2026-11-03', text: 'Seitenwand gebaut' }],
    });
    expect(a.map((x) => x.kind)).toEqual(['pr', 'supp', 'workout', 'gym', 'weight', 'water']);
    expect(a[1].text).toBe('Kreatin genommen');
    expect(a[5].text).toBe('1,5 l Wasser getrunken');
  });
});
