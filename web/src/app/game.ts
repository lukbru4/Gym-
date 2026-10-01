// Spielstand (Credits, Level, Serie, Aufgaben, Ränge) – aus dem Trainingsverlauf berechnet.
import type { Backend } from '../data/backend';
import { computeQuests, type QuestResult } from '../lib/quests';
import { overallPoints, rankFromPoints, type Rank } from '../lib/ranks';
import { todayISO, weekStreak } from '../lib/stats';
import type { ExerciseMap, ISODate, Workout, WorkoutSet } from '../lib/types';
import { computeProgress, playerLevel, type ExerciseProgressState, type LevelInfo, type Progress } from '../lib/xp';

export interface Game {
  workouts: Workout[];
  sets: WorkoutSet[];
  today: ISODate;
  progress: Progress;
  quests: QuestResult;
  credits: number;
  overall: Rank;
  /** Kraftübungen mit Fortschritt: [Übungs-ID, Stand] */
  strength: [number, ExerciseProgressState][];
  player: LevelInfo;
  streak: number;
}

export function computeGame(workouts: Workout[], sets: WorkoutSet[], exercises: ExerciseMap, today = todayISO()): Game {
  const progress = computeProgress(workouts, sets, exercises);
  const quests = computeQuests(progress.perWorkout, today);
  const credits = progress.total + quests.total;
  const strength = [...progress.perExercise.entries()].filter(([id]) => exercises.get(id)?.type !== 'cardio');
  const overall = rankFromPoints(overallPoints(strength.map(([, st]) => st.xp)));
  return {
    workouts, sets, today, progress, quests, credits, overall, strength,
    player: playerLevel(credits),
    streak: weekStreak(workouts, today),
  };
}

export async function loadGame(api: Backend, exercises: ExerciseMap): Promise<Game> {
  const [workouts, sets] = await Promise.all([api.listWorkouts(), api.listSets()]);
  return computeGame(workouts, sets, exercises);
}
