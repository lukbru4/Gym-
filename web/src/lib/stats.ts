// Reine Rechenfunktionen (ohne DOM/Netzwerk), damit sie testbar sind.
// Datumswerte sind immer Strings im Format 'YYYY-MM-DD'.
import type { DatedSet, ExerciseMap, ExerciseType, ISODate, Workout, WorkoutSet } from './types';

export function todayISO(now = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const toISO = (date: Date): ISODate => date.toISOString().slice(0, 10);

/** Montag der Woche, in der `iso` liegt. */
export function weekStart(iso: ISODate): ISODate {
  const d = parseISO(iso);
  const offset = (d.getUTCDay() + 6) % 7; // Mo=0 … So=6
  d.setUTCDate(d.getUTCDate() - offset);
  return toISO(d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Geschätztes 1RM nach Epley: Gewicht × (1 + Wdh / 30). Bei 1 Wdh = Gewicht. */
export function estimate1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Aufwärmsätze zählen nicht für Volumen, Fortschritt und Rekorde. */
export const isWorkingSet = (set: Pick<WorkoutSet, 'is_warmup'>): boolean => !set.is_warmup;

const num = (v: unknown): number => Number(v) || 0;

export function setVolume(set: WorkoutSet): number {
  if (!isWorkingSet(set)) return 0;
  return num(set.reps) * num(set.weight_kg);
}

export interface WeekBucket {
  start: ISODate;
  workouts: number;
  volume: number;
  cardioMin: number;
}

/** Wochenstatistik der letzten `weeks` Wochen (inkl. aktueller), älteste zuerst. */
export function weeklySummary(workouts: Workout[], sets: WorkoutSet[], today: ISODate, weeks = 8): WeekBucket[] {
  const current = weekStart(today);
  const buckets: WeekBucket[] = [];
  const byStart = new Map<ISODate, WeekBucket>();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(current, -7 * i);
    const bucket = { start, workouts: 0, volume: 0, cardioMin: 0 };
    buckets.push(bucket);
    byStart.set(start, bucket);
  }
  const workoutWeek = new Map<number, WeekBucket>();
  for (const w of workouts) {
    const bucket = byStart.get(weekStart(w.date));
    if (!bucket) continue;
    bucket.workouts++;
    workoutWeek.set(w.id, bucket);
  }
  for (const s of sets) {
    const bucket = workoutWeek.get(s.workout_id);
    if (!bucket) continue;
    bucket.volume += setVolume(s);
    bucket.cardioMin += num(s.duration_min);
  }
  return buckets;
}

export type StatsPeriod = 'week' | 'month' | 'year';
export interface StatBucket { label: string; workouts: number; volume: number; cardioMin: number }
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Statistik für diese Woche (pro Tag), diesen Monat (pro Tag) oder dieses Jahr (pro Monat) */
export function periodSummary(workouts: Workout[], sets: WorkoutSet[], today: ISODate, period: StatsPeriod): { buckets: StatBucket[]; total: StatBucket } {
  const [y, m] = today.split('-').map(Number);
  const keys: { key: string; label: string }[] = [];
  let keyOf: (d: ISODate) => string;
  if (period === 'week') {
    const start = weekStart(today);
    for (let i = 0; i < 7; i++) keys.push({ key: addDays(start, i), label: WEEKDAYS[i] });
    keyOf = (d) => d;
  } else if (period === 'month') {
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= days; d++) keys.push({ key: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, label: String(d) });
    keyOf = (d) => d;
  } else {
    for (let i = 0; i < 12; i++) keys.push({ key: `${y}-${String(i + 1).padStart(2, '0')}`, label: MONTHS[i] });
    keyOf = (d) => d.slice(0, 7);
  }
  const byKey = new Map(keys.map((k) => [k.key, { label: k.label, workouts: 0, volume: 0, cardioMin: 0 }]));
  const bucketOf = new Map<number, StatBucket>();
  for (const w of workouts) {
    const b = byKey.get(keyOf(w.date));
    if (!b) continue;
    b.workouts++;
    bucketOf.set(w.id, b);
  }
  for (const s of sets) {
    const b = bucketOf.get(s.workout_id);
    if (!b) continue;
    b.volume += setVolume(s);
    b.cardioMin += num(s.duration_min);
  }
  const buckets = [...byKey.values()];
  const total = buckets.reduce((t, b) => ({ ...t, workouts: t.workouts + b.workouts, volume: t.volume + b.volume, cardioMin: t.cardioMin + b.cardioMin }), { label: '', workouts: 0, volume: 0, cardioMin: 0 });
  return { buckets, total };
}

export interface StrengthPoint { date: ISODate; e1rm: number; maxWeight: number; volume: number }
export interface CardioPoint { date: ISODate; duration: number; distance: number }

/** Verlauf einer Übung: pro Trainingstag der beste Wert. */
export function exerciseProgress(sets: DatedSet[], type: ExerciseType): StrengthPoint[] | CardioPoint[] {
  const byDate = new Map<ISODate, StrengthPoint & CardioPoint>();
  for (const s of sets.filter(isWorkingSet)) {
    const prev = byDate.get(s.date) || { date: s.date, e1rm: 0, maxWeight: 0, volume: 0, duration: 0, distance: 0 };
    const w = num(s.weight_kg);
    const r = num(s.reps);
    prev.e1rm = Math.max(prev.e1rm, estimate1RM(w, r));
    prev.maxWeight = Math.max(prev.maxWeight, r > 0 ? w : 0);
    prev.volume += w * r;
    prev.duration += num(s.duration_min);
    prev.distance += num(s.distance_km);
    byDate.set(s.date, prev);
  }
  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return type === 'cardio'
    ? rows.map(({ date, duration, distance }) => ({ date, duration, distance }))
    : rows.map(({ date, e1rm, maxWeight, volume }) => ({ date, e1rm, maxWeight, volume }));
}

interface Dated<T> { value: T; date: ISODate }
export interface StrengthRecord {
  exercise: string;
  type: 'strength';
  heaviest: { weight: number; reps: number; date: ISODate } | null;
  bestE1RM: Dated<number> | null;
  bestVolume: Dated<number> | null;
}
export interface CardioRecord {
  exercise: string;
  type: 'cardio';
  longestDuration: Dated<number> | null;
  longestDistance: Dated<number> | null;
}
export type PersonalRecord = StrengthRecord | CardioRecord;

/** Persönliche Rekorde pro Übung. */
export function personalRecords(sets: DatedSet[], exercises: ExerciseMap): PersonalRecord[] {
  const records = new Map<number, PersonalRecord>();
  const sessionTotals = new Map<string, { date: ISODate; volume: number; duration: number; distance: number }>();
  for (const s of sets.filter(isWorkingSet)) {
    const ex = exercises.get(s.exercise_id);
    if (!ex) continue;
    let rec = records.get(s.exercise_id);
    if (!rec) {
      rec = ex.type === 'cardio'
        ? { exercise: ex.name, type: 'cardio', longestDuration: null, longestDistance: null }
        : { exercise: ex.name, type: 'strength', heaviest: null, bestE1RM: null, bestVolume: null };
      records.set(s.exercise_id, rec);
    }
    const key = `${s.exercise_id}|${s.workout_id}`;
    const total = sessionTotals.get(key) || { date: s.date, volume: 0, duration: 0, distance: 0 };
    if (rec.type === 'cardio') {
      total.duration += num(s.duration_min);
      total.distance += num(s.distance_km);
    } else {
      const w = num(s.weight_kg);
      const r = num(s.reps);
      if (r > 0 && (!rec.heaviest || w > rec.heaviest.weight)) rec.heaviest = { weight: w, reps: r, date: s.date };
      const e = estimate1RM(w, r);
      if (e > 0 && (!rec.bestE1RM || e > rec.bestE1RM.value)) rec.bestE1RM = { value: e, date: s.date };
      total.volume += w * r;
    }
    sessionTotals.set(key, total);
  }
  for (const [key, total] of sessionTotals) {
    const rec = records.get(Number(key.split('|')[0]))!;
    if (rec.type === 'cardio') {
      if (total.duration > 0 && (!rec.longestDuration || total.duration > rec.longestDuration.value)) {
        rec.longestDuration = { value: total.duration, date: total.date };
      }
      if (total.distance > 0 && (!rec.longestDistance || total.distance > rec.longestDistance.value)) {
        rec.longestDistance = { value: total.distance, date: total.date };
      }
    } else if (total.volume > 0 && (!rec.bestVolume || total.volume > rec.bestVolume.value)) {
      rec.bestVolume = { value: total.volume, date: total.date };
    }
  }
  return [...records.values()].sort((a, b) => a.exercise.localeCompare(b.exercise, 'de'));
}

/**
 * Serie: Wochen in Folge (Mo–So) mit mindestens einem Training.
 * Die laufende Woche zählt mit, sobald darin trainiert wurde; ohne Training bricht sie
 * die Serie noch nicht ab (die Woche ist ja noch nicht vorbei).
 */
export function weekStreak(workouts: Pick<Workout, 'date'>[], today: ISODate): number {
  const weeks = new Set(workouts.map((w) => weekStart(w.date)));
  let week = weekStart(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let n = 0;
  while (weeks.has(week)) {
    n++;
    week = addDays(week, -7);
  }
  return n;
}

/**
 * Tages-Serie mit Wochenziel (z. B. 2 Trainings pro Woche, Woche = Mo–So):
 * - Ein Training zählt alle Tage der Woche bis zum Trainingstag (Mittwoch → Mo, Di, Mi = 3 Tage).
 * - Ist das Wochenziel erreicht, zählen auch die übrigen Tage bis heute bzw. bis Sonntag (ganze Woche = 7).
 * - Wird das Ziel in einer abgeschlossenen Woche verfehlt, beginnt die Serie danach wieder bei 0.
 * Die laufende Woche bricht die Serie nicht ab, solange sie nicht vorbei ist.
 */
export function dayStreak(workouts: Pick<Workout, 'date'>[], today: ISODate, goal: number): number {
  const need = Math.min(7, Math.max(1, Math.round(goal) || 1));
  const days = new Map<ISODate, Set<ISODate>>(); // Wochenbeginn → Trainingstage
  for (const w of workouts) {
    if (!w.date || w.date > today) continue;
    const ws = weekStart(w.date);
    if (!days.has(ws)) days.set(ws, new Set());
    days.get(ws)!.add(w.date);
  }
  if (!days.size) return 0;
  const current = weekStart(today);
  let streak = 0;
  for (let ws = [...days.keys()].sort()[0]; ws < current; ws = addDays(ws, 7)) {
    streak = (days.get(ws)?.size ?? 0) >= need ? streak + 7 : 0;
  }
  const now = [...(days.get(current) ?? [])].sort();
  const dayIndex = (iso: ISODate) => Math.round((Date.parse(iso) - Date.parse(current)) / 864e5) + 1;
  if (now.length >= need) streak += dayIndex(today);
  else if (now.length) streak += dayIndex(now[now.length - 1]);
  return streak;
}

/** Trainingstage in der laufenden Woche (für „Wochenziel 1 von 2“) */
export function trainingDaysThisWeek(workouts: Pick<Workout, 'date'>[], today: ISODate): number {
  const ws = weekStart(today);
  return new Set(workouts.filter((w) => w.date >= ws && w.date <= today).map((w) => w.date)).size;
}
