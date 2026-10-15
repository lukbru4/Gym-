import { describe, expect, test } from 'vitest';
import {
  cleanAdventure, companionFrom, journeyFrom, islandFrom, ISLAND_FULL_SETS, REGIONS, stateFor, moodFor, muscleShares, nextStopIndex, postcards, ROUTE, stageIndex, STAGES, workoutGain,
  HM_PER_SET, KM_PER_CARDIO_KM, KM_PER_SET,
} from '../src/lib/adventure';
import { readFileSync } from 'node:fs';
import type { ExerciseMap, Workout, WorkoutSet } from '../src/lib/types';

const ex: ExerciseMap = new Map([
  [1, { name: 'Kniebeuge', type: 'strength', muscles: ['quadrizeps', 'gesaess'], user_id: null }],
  [2, { name: 'Bankdrücken', type: 'strength', muscles: ['brust', 'trizeps'], user_id: null }],
  [3, { name: 'Laufen', type: 'cardio', muscles: [], user_id: null }],
]);
/** n Trainings mit je k Sätzen (ohne Gewicht) ab dem 1.1. */
function plan(n: number, k: number, exId = 1, extra: Partial<WorkoutSet> = {}) {
  const workouts: Workout[] = [], sets: WorkoutSet[] = [];
  for (let i = 0; i < n; i++) {
    workouts.push({ id: i + 1, date: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}` });
    for (let s = 0; s < k; s++) sets.push({ workout_id: i + 1, exercise_id: exId, reps: 10, ...extra });
  }
  return { workouts, sets };
}

describe('Begleiter', () => {
  test('Stufen nach Trainings', () => {
    expect(STAGES.map((s) => s.min)).toEqual([0, 3, 15, 40, 100]);
    expect([0, 2, 3, 14, 15, 40, 99, 100, 500].map(stageIndex)).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4]);
  });
  test('Stimmung nach Pause', () => {
    expect([null, 0, 2, 3, 6, 7, 30].map(moodFor)).toEqual(['froh', 'froh', 'froh', 'muede', 'muede', 'traurig', 'traurig']);
  });
  test('Muskeln wachsen dort, wo trainiert wird (nur letzte 30 Tage)', () => {
    const w: Workout[] = [{ id: 1, date: '2026-03-01' }, { id: 2, date: '2026-01-01' }];
    const sets: WorkoutSet[] = [
      ...Array.from({ length: 6 }, () => ({ workout_id: 1, exercise_id: 1 })),
      ...Array.from({ length: 2 }, () => ({ workout_id: 1, exercise_id: 2 })),
      ...Array.from({ length: 20 }, () => ({ workout_id: 2, exercise_id: 2 })), // zu alt
      { workout_id: 1, exercise_id: 2, is_warmup: true },
    ];
    const s = muscleShares(w, sets, ex, '2026-03-10');
    expect(s.beine).toBe(1);
    expect(s.brust).toBeCloseTo(2 / 6);
    expect(s.ruecken).toBe(0);
  });
  test('Zusammenfassung: Trainings ohne Arbeitssatz zählen nicht, Tage seit dem letzten Training', () => {
    const { workouts, sets } = plan(3, 2);
    workouts.push({ id: 99, date: '2026-01-20' }); // leer
    const c = companionFrom(workouts, sets, ex, '2026-01-10');
    expect(c.workouts).toBe(3);
    expect(c.stage.id).toBe('baby');
    expect(c.daysSince).toBe(7);
    expect(c.mood).toBe('traurig');
  });
  test('gespeicherte Daten werden geprüft', () => {
    expect(cleanAdventure({ species: 'wolf', name: '  Luna ' })).toEqual({ species: 'wolf', name: 'Luna' });
    expect(cleanAdventure({ species: 'einhorn', name: 'X' })).toBeNull();
    expect(cleanAdventure({ species: 'drache', name: '' })).toEqual({ species: 'drache', name: 'Drache' });
    expect(cleanAdventure({ species: 'gorilla', name: 'x'.repeat(40) })!.name).toHaveLength(16);
  });
});

describe('Weltreise', () => {
  test('Route: Start und Heimkehr in Berlin, Gipfel mit Höhen', () => {
    expect(ROUTE[0].id).toBe('berlin');
    expect(ROUTE[ROUTE.length - 1].name).toContain('Berlin');
    const peaks = ROUTE.filter((s) => s.peak);
    expect(peaks.map((p) => p.id)).toEqual(['montblanc', 'kilimandscharo', 'aconcagua', 'fuji', 'everest']);
    for (const p of peaks) expect(p.peak!.to).toBeGreaterThan(p.peak!.from);
  });
  test('Beitrag eines Trainings: Sätze, Gewicht und Cardio', () => {
    expect(workoutGain([{ workout_id: 1, exercise_id: 1, reps: 10, weight_kg: 100 }], ex)).toEqual({ km: KM_PER_SET, hm: HM_PER_SET + 100 });
    expect(workoutGain([{ workout_id: 1, exercise_id: 3, distance_km: 5 }], ex).km).toBe(5 * KM_PER_CARDIO_KM);
    expect(workoutGain([{ workout_id: 1, exercise_id: 1, is_warmup: true }], ex)).toEqual({ km: 0, hm: 0 });
  });
  test('Unterwegs nach Paris, dann Mont Blanc: am Berg zählen Höhenmeter', () => {
    // 880 km bis Paris = 35,2 Sätze
    let j = journeyFrom(...Object.values(plan(1, 20)) as [Workout[], WorkoutSet[]], ex);
    expect(j.at).toBe(0); expect(j.legDone).toBe(500); expect(j.legKm).toBe(880);
    j = journeyFrom(...Object.values(plan(2, 20)) as [Workout[], WorkoutSet[]], ex);
    expect(ROUTE[j.at].id).toBe('paris'); expect(j.legDone).toBeCloseTo(1000 - 880);
    // weiter bis zum Mont Blanc (600 km) → Aufstieg beginnt, km zählen am Berg nicht
    j = journeyFrom(...Object.values(plan(4, 20)) as [Workout[], WorkoutSet[]], ex);
    expect(j.legDone).toBe(0);
    expect(ROUTE[j.at].id).toBe('montblanc');
    expect(j.climb).not.toBeNull();
    expect(j.climb!.need).toBe(4808 - 1035);
    expect(postcards(j).map((p) => p.id)).toEqual(['paris']); // Gipfel-Postkarte erst oben
  });
  test('Schwere Sätze bringen schneller auf den Gipfel, danach geht die Reise weiter', () => {
    const { workouts, sets } = plan(12, 20, 1, { weight_kg: 100 });
    const j = journeyFrom(workouts, sets, ex);
    expect(j.reached).toBeGreaterThanOrEqual(3);
    expect(ROUTE[j.at].id === 'montblanc' ? j.climb : null).toBeNull();
    expect(ROUTE[nextStopIndex(j)].id).not.toBe('montblanc');
  });
  test('Nach der Heimkehr beginnt Runde 2', () => {
    const { workouts, sets } = plan(400, 30, 1, { weight_kg: 200 });
    const j = journeyFrom(workouts, sets, ex);
    expect(j.round).toBeGreaterThanOrEqual(2);
    expect(postcards(j)).toHaveLength(ROUTE.length - 1);
  });
});

describe('Datenbank-Update 65', () => {
  const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
  test('Funktionen und Freundesprofil', () => {
    expect(sql).toContain('create or replace function public.set_my_adventure(p_adv jsonb)');
    expect(sql).toContain("'adventure', p.adventure");
    expect(sql).toMatch(/select 65 \$\$;/);
  });
});

describe('Trainings-Insel', () => {
  const day = (d: number) => `2026-03-${String(d).padStart(2, '0')}`;
  test('Gebiete wachsen mit den Sätzen der letzten 30 Tage, Cardio separat', () => {
    const w: Workout[] = [{ id: 1, date: day(1) }, { id: 2, date: day(10) }];
    const sets: WorkoutSet[] = [
      ...Array.from({ length: 24 }, () => ({ workout_id: 1, exercise_id: 1 })), // Beine voll
      ...Array.from({ length: 6 }, () => ({ workout_id: 2, exercise_id: 2 })), // Brust ein Viertel
      { workout_id: 2, exercise_id: 3, distance_km: 5 },
    ];
    const isl = islandFrom(w, sets, ex, day(12));
    expect(isl.level.beine).toBe(1);
    expect(isl.level.brust).toBeCloseTo(0.25);
    expect(isl.counts.cardio).toBe(1);
    expect(stateFor(isl.level.beine)).toBe('praechtig');
    expect(stateFor(isl.level.ruecken)).toBe('kahl');
    expect(isl.weakest).not.toBeNull();
    expect(isl.last).toBe('brust'); // zuletzt Bankdrücken
    expect(isl.balance).toBeGreaterThan(0);
    expect(isl.balance).toBeLessThan(40);
  });
  test('Ohne Training: alles kahl, kein Tipp', () => {
    const isl = islandFrom([], [], ex, day(12));
    expect(isl.balance).toBe(0);
    expect(isl.weakest).toBeNull();
    expect(isl.last).toBeNull();
  });
  test('Alles ausgewogen trainiert → 100 %', () => {
    const all: ExerciseMap = new Map([
      [1, { name: 'A', type: 'strength', muscles: ['quadrizeps'], user_id: null }], [2, { name: 'B', type: 'strength', muscles: ['brust'], user_id: null }],
      [4, { name: 'C', type: 'strength', muscles: ['lat'], user_id: null }], [5, { name: 'D', type: 'strength', muscles: ['schultern'], user_id: null }],
      [6, { name: 'E', type: 'strength', muscles: ['bizeps'], user_id: null }], [7, { name: 'F', type: 'strength', muscles: ['bauch'], user_id: null }],
      [3, { name: 'Laufen', type: 'cardio', muscles: [], user_id: null }],
    ]);
    const sets: WorkoutSet[] = [1, 2, 3, 4, 5, 6, 7].flatMap((e) => Array.from({ length: ISLAND_FULL_SETS }, () => ({ workout_id: 1, exercise_id: e })));
    expect(islandFrom([{ id: 1, date: day(5) }], sets, all, day(6)).balance).toBe(100);
  });
  test('Alle Gebiete haben eine Muskelgruppe', () => {
    expect(REGIONS.map((r) => r.area).sort()).toEqual(['arme', 'bauch', 'beine', 'brust', 'cardio', 'ruecken', 'schultern']);
  });
});
