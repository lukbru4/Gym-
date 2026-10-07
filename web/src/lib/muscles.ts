// Muskelgruppen, Zuordnung der Übungen, Kraft-Stufe für den Körpergraphen und Übungs-Kategorien.
import { CATALOG_MUSCLES, keywordsOf } from './exerciseCatalog';
import { addDays, estimate1RM, isWorkingSet } from './stats';
import type { DatedSet, Exercise, ExerciseMap, ISODate, MuscleId } from './types';

export const MUSCLES: [MuscleId, string][] = [
  ['brust', 'Brust'],
  ['schultern', 'Schultern'],
  ['bizeps', 'Bizeps'],
  ['trizeps', 'Trizeps'],
  ['bauch', 'Bauch'],
  ['oberer_ruecken', 'Oberer Rücken'],
  ['lat', 'Latissimus'],
  ['unterer_ruecken', 'Unterer Rücken'],
  ['gesaess', 'Gesäß'],
  ['quadrizeps', 'Oberschenkel vorne'],
  ['beinbeuger', 'Oberschenkel hinten'],
  ['waden', 'Waden'],
];
export const MUSCLE_NAMES = new Map<MuscleId, string>(MUSCLES);

// Hauptmuskeln der Standardübungen (kommen aus exerciseCatalog.ts, gleiche Werte wie in supabase/schema.sql).
export const DEFAULT_MUSCLES: Record<string, MuscleId[]> = {
  ...CATALOG_MUSCLES,
  // Nur in der App (nicht in schema.sql): so wird eine selbst angelegte Übung dieses Namens automatisch zugeordnet
  'Hip Thrust': ['gesaess', 'beinbeuger'],
};

type MuscleSource = Pick<Exercise, 'name'> & { muscles?: MuscleId[] | null };
export const musclesOf = (exercise: MuscleSource | null | undefined): MuscleId[] =>
  exercise?.muscles?.length ? exercise.muscles : (exercise && DEFAULT_MUSCLES[exercise.name]) || [];

/** Grenzen der Stufen: Steigerung des geschätzten 1RM gegenüber dem ersten Training. */
export const LEVELS = [
  { level: 1, from: -Infinity, label: 'unter 5 %' },
  { level: 2, from: 0.05, label: '5–15 %' },
  { level: 3, from: 0.15, label: '15–30 %' },
  { level: 4, from: 0.3, label: '30–50 %' },
  { level: 5, from: 0.5, label: 'über 50 %' },
] as const;
const levelFor = (gain: number) => [...LEVELS].reverse().find((l) => gain >= l.from)!.level;

export interface MuscleExercise { name: string; first: number; current: number; gain: number }
export interface MuscleLevel {
  /** 0 = noch nicht trainiert, sonst 1–5 */
  level: number;
  gain: number | null;
  exercises: MuscleExercise[];
}

/** Kraft-Stufe pro Muskel: bester Wert der letzten `recentDays` Tage gegenüber dem ersten Training. */
export function strengthLevels(sets: DatedSet[], exercises: ExerciseMap, today: ISODate, recentDays = 30): Map<MuscleId, MuscleLevel> {
  const since = addDays(today, -recentDays);
  const sessions = new Map<number, Map<ISODate, number>>();
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const e = estimate1RM(Number(s.weight_kg) || 0, Number(s.reps) || 0);
    if (e <= 0) continue;
    if (!sessions.has(s.exercise_id)) sessions.set(s.exercise_id, new Map());
    const byDate = sessions.get(s.exercise_id)!;
    byDate.set(s.date, Math.max(byDate.get(s.date) || 0, e));
  }

  const result = new Map<MuscleId, MuscleLevel>(MUSCLES.map(([id]) => [id, { level: 0, gain: null, exercises: [] }]));
  for (const [exId, byDate] of sessions) {
    const ex = exercises.get(exId);
    if (!ex || ex.type === 'cardio') continue;
    const dates = [...byDate.keys()].sort();
    const first = byDate.get(dates[0])!;
    const recent = dates.filter((d) => d >= since);
    const current = recent.length ? Math.max(...recent.map((d) => byDate.get(d)!)) : byDate.get(dates[dates.length - 1])!;
    const gain = current / first - 1;
    for (const m of musclesOf(ex)) result.get(m)?.exercises.push({ name: ex.name, first, current, gain });
  }
  for (const r of result.values()) {
    if (!r.exercises.length) continue;
    r.gain = r.exercises.reduce((sum, e) => sum + e.gain, 0) / r.exercises.length;
    r.level = levelFor(r.gain);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Kategorien für die Übungsauswahl (Suche + Filter)
// ---------------------------------------------------------------------------
export type CategoryId = 'alle' | 'brust' | 'ruecken' | 'schultern' | 'arme' | 'bauch' | 'beine' | 'cardio' | 'eigene';
export const CATEGORIES: [CategoryId, string][] = [
  ['alle', 'Alle'],
  ['brust', 'Brust'],
  ['ruecken', 'Rücken'],
  ['schultern', 'Schultern'],
  ['arme', 'Arme'],
  ['bauch', 'Bauch'],
  ['beine', 'Beine'],
  ['cardio', 'Cardio'],
  ['eigene', 'Eigene'],
];
const CATEGORY_OF_MUSCLE: Record<MuscleId, CategoryId> = {
  brust: 'brust',
  oberer_ruecken: 'ruecken', lat: 'ruecken', unterer_ruecken: 'ruecken',
  schultern: 'schultern',
  bizeps: 'arme', trizeps: 'arme',
  bauch: 'bauch',
  quadrizeps: 'beine', beinbeuger: 'beine', waden: 'beine', gesaess: 'beine',
};

/** Kategorien einer Übung (eine Übung kann in mehreren stehen, z. B. Dips: Arme + Brust) */
export function exerciseCategories(ex: Exercise): Set<CategoryId> {
  const cats = new Set<CategoryId>();
  if (ex.type === 'cardio') cats.add('cardio');
  for (const m of musclesOf(ex)) if (CATEGORY_OF_MUSCLE[m]) cats.add(CATEGORY_OF_MUSCLE[m]);
  if (ex.user_id) cats.add('eigene');
  return cats;
}

/** Kleinschreibung ohne Akzente/Umlaut-Punkte: „drucken“ findet „Drücken“ */
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');

/** Filtert nach Kategorie und Suchtext. Jedes Suchwort muss im Namen oder in einem Muskelnamen vorkommen. */
export function filterExercises(exercises: Exercise[], { query = '', category = 'alle' }: { query?: string; category?: CategoryId } = {}): Exercise[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return exercises.filter((ex) => {
    if (category !== 'alle' && !exerciseCategories(ex).has(category)) return false;
    if (!words.length) return true;
    const hay = normalize([ex.name, keywordsOf(ex.name), ...musclesOf(ex).map((m) => MUSCLE_NAMES.get(m) || m)].join(' '));
    return words.every((w) => hay.includes(w));
  });
}
