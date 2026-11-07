// Welche Übungen hat man schon gemacht? Für alle Ansichten, die Werte zu Übungen zeigen (Analyse, Rechner, Bestenliste).
import type { Exercise } from './types';

interface SetLike { exercise_id: number; weight_kg?: number | string | null; reps?: number | string | null; duration_min?: number | string | null; distance_km?: number | string | null; is_warmup?: boolean }

/** Übungen mit mindestens einem echten Satz (Kraft: Gewicht und Wiederholungen; Cardio: Dauer oder Distanz); Aufwärmsätze zählen nicht */
export function performedExercises<E extends Pick<Exercise, 'id' | 'type'>>(exercises: E[], sets: SetLike[]): E[] {
  const kraft = new Set<number>();
  const cardio = new Set<number>();
  for (const s of sets) {
    if (s.is_warmup) continue;
    if (Number(s.weight_kg) > 0 && Number(s.reps) > 0) kraft.add(s.exercise_id);
    if (Number(s.duration_min) > 0 || Number(s.distance_km) > 0) cardio.add(s.exercise_id);
  }
  return exercises.filter((e) => (e.type === 'strength' ? kraft.has(e.id) : cardio.has(e.id)));
}

/** Namen (klein) der selbst trainierten Kraftübungen – für den Abgleich mit der Bestenliste */
export const performedStrengthNames = (exercises: Pick<Exercise, 'id' | 'name' | 'type'>[], sets: SetLike[]): Set<string> =>
  new Set(performedExercises(exercises.filter((e) => e.type === 'strength'), sets).map((e) => e.name.trim().toLowerCase()));
