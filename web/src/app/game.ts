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
  /** Guthaben im Shop = Credits − ausgegeben */
  balance: number;
  overall: Rank;
  /** Kraftübungen mit Fortschritt: [Übungs-ID, Stand] */
  strength: [number, ExerciseProgressState][];
  player: LevelInfo;
  streak: number;
}

/** bonus: Credits aus Challenges (vom Server, nur Cloud) */
export function computeGame(workouts: Workout[], sets: WorkoutSet[], exercises: ExerciseMap, today = todayISO(), bonus = 0, spent = 0): Game {
  const progress = computeProgress(workouts, sets, exercises);
  const quests = computeQuests(progress.perWorkout, today);
  const credits = progress.total + quests.total + bonus;
  const strength = [...progress.perExercise.entries()].filter(([id]) => exercises.get(id)?.type !== 'cardio');
  const overall = rankFromPoints(overallPoints(strength.map(([, st]) => st.xp)));
  return {
    workouts, sets, today, progress, quests, credits, overall, strength,
    balance: credits - spent,
    player: playerLevel(credits),
    streak: weekStreak(workouts, today),
  };
}

export async function loadGame(api: Backend, exercises: ExerciseMap): Promise<Game> {
  const [workouts, sets, bonus, wallet] = await Promise.all([
    api.listWorkouts(),
    api.listSets(),
    // Challenge-Bonus und Shop gibt es nur in der Cloud; fehlt das SQL dafür noch, zählt 0
    api.social ? api.social.challengeBonus().catch(() => 0) : 0,
    api.social ? api.social.wallet().catch(() => null) : null,
  ]);
  return computeGame(workouts, sets, exercises, todayISO(), Number(bonus) || 0, Number(wallet?.spent) || 0);
}
