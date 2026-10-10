// Rückblick für die Begrüßung auf Home: Was wurde diese Woche / diesen Monat geschafft?
// Verglichen wird fair mit dem gleichen Zeitraum davor (bis zum gleichen Wochentag bzw. Tag im Monat).
import { musclesOf, MUSCLE_NAMES } from './muscles';
import { addDays, dayStreak, estimate1RM, isWorkingSet, setVolume, weekStart } from './stats';
import type { ExerciseMap, ISODate, MuscleId, Workout, WorkoutSet } from './types';

export type RecapPeriod = 'week' | 'month' | 'year';

export interface RecapPR { exercise: string; e1rm: number; previous: number }

export interface Recap {
  period: RecapPeriod;
  from: ISODate;
  to: ISODate;
  workouts: number;
  days: number;
  sets: number;
  volume: number;
  cardioMin: number;
  distanceKm: number;
  prs: RecapPR[];
  topExercise: { name: string; sets: number } | null;
  topMuscle: string | null;
  /** Tages-Serie mit Wochenziel */
  streak: number;
  previous: { workouts: number; volume: number; sets: number };
}

const num = (v: unknown) => Number(v) || 0;

/** Zeitraum (inkl. heute) und der vergleichbare Zeitraum davor */
export function recapRange(period: RecapPeriod, today: ISODate): { from: ISODate; prevFrom: ISODate; prevTo: ISODate } {
  if (period === 'week') {
    const from = weekStart(today);
    const length = Math.round((Date.parse(today) - Date.parse(from)) / 864e5);
    const prevFrom = addDays(from, -7);
    return { from, prevFrom, prevTo: addDays(prevFrom, length) };
  }
  const [y, m, d] = today.split('-').map(Number);
  if (period === 'year') {
    const prevTo = `${y - 1}-${String(m).padStart(2, '0')}-${String(m === 2 && d === 29 ? 28 : d).padStart(2, '0')}`;
    return { from: `${y}-01-01`, prevFrom: `${y - 1}-01-01`, prevTo };
  }
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const prevFrom = `${py}-${String(pm).padStart(2, '0')}-01`;
  const daysInPrev = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  const prevTo = `${py}-${String(pm).padStart(2, '0')}-${String(Math.min(d, daysInPrev)).padStart(2, '0')}`;
  return { from, prevFrom, prevTo };
}

export function computeRecap(workouts: Workout[], sets: WorkoutSet[], exercises: ExerciseMap, today: ISODate, period: RecapPeriod, weekGoal = 2): Recap {
  const { from, prevFrom, prevTo } = recapRange(period, today);
  const dateOf = new Map(workouts.map((w) => [w.id, w.date]));
  const inRange = (d: ISODate | undefined, a: ISODate, b: ISODate) => !!d && d >= a && d <= b;
  const current = workouts.filter((w) => inRange(w.date, from, today));
  const prev = workouts.filter((w) => inRange(w.date, prevFrom, prevTo));

  let setsN = 0, volume = 0, cardioMin = 0, distanceKm = 0, prevSets = 0, prevVolume = 0;
  const perExercise = new Map<number, number>();
  const perMuscle = new Map<MuscleId, number>();
  const bestBefore = new Map<number, number>();
  const bestNow = new Map<number, number>();
  for (const s of sets) {
    const date = dateOf.get(s.workout_id);
    if (!date || !isWorkingSet(s)) continue;
    const ex = exercises.get(s.exercise_id);
    const e1 = ex?.type === 'cardio' ? 0 : estimate1RM(num(s.weight_kg), num(s.reps));
    if (date < from) bestBefore.set(s.exercise_id, Math.max(bestBefore.get(s.exercise_id) ?? 0, e1));
    if (inRange(date, prevFrom, prevTo)) {
      prevSets++;
      prevVolume += setVolume(s);
    }
    if (!inRange(date, from, today)) continue;
    setsN++;
    volume += setVolume(s);
    cardioMin += num(s.duration_min);
    distanceKm += num(s.distance_km);
    perExercise.set(s.exercise_id, (perExercise.get(s.exercise_id) ?? 0) + 1);
    for (const m of musclesOf(ex)) perMuscle.set(m, (perMuscle.get(m) ?? 0) + 1);
    if (e1 > 0) bestNow.set(s.exercise_id, Math.max(bestNow.get(s.exercise_id) ?? 0, e1));
  }

  // Neuer Bestwert nur, wenn die Übung schon vorher trainiert wurde (das erste Mal ist kein Rekord)
  const prs: RecapPR[] = [];
  for (const [id, best] of bestNow) {
    const before = bestBefore.get(id) ?? 0;
    if (before > 0 && best > before + 1e-9) prs.push({ exercise: exercises.get(id)?.name ?? 'Übung', e1rm: best, previous: before });
  }
  prs.sort((a, b) => b.e1rm / b.previous - a.e1rm / a.previous);

  const top = [...perExercise].sort((a, b) => b[1] - a[1])[0];
  const muscle = [...perMuscle].sort((a, b) => b[1] - a[1])[0];
  return {
    period,
    from,
    to: today,
    workouts: current.length,
    days: new Set(current.map((w) => w.date)).size,
    sets: setsN,
    volume,
    cardioMin,
    distanceKm,
    prs,
    topExercise: top ? { name: exercises.get(top[0])?.name ?? 'Übung', sets: top[1] } : null,
    topMuscle: muscle ? MUSCLE_NAMES.get(muscle[0]) ?? null : null,
    streak: dayStreak(workouts, today, weekGoal),
    previous: { workouts: prev.length, volume: prevVolume, sets: prevSets },
  };
}

/** Veränderung in Prozent (gerundet), null wenn kein Vergleich möglich */
export function change(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

/** Tageszeit-Gruß */
export function greeting(hour: number): string {
  if (hour < 5) return 'Hey';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Hallo';
  return 'Guten Abend';
}
