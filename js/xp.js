// Credits & Level – werden jedes Mal aus dem Trainingsverlauf berechnet (nichts extra gespeichert).
import { estimate1RM, isWorkingSet } from './stats.js';

// Wie viele Credits es wofür gibt (wird in der App so angezeigt)
export const RULES = {
  workout: 20, // Training abgeschlossen
  set: 2, // pro Arbeitssatz (Aufwärmsätze zählen nicht)
  improvement: 10, // Übung stärker als beim letzten Mal (geschätztes 1RM)
  record: 25, // neuer Rekord für die Übung (zusätzlich)
};
// Übungs-XP: pro Training mit der Übung, plus Bonus für Steigerung/Rekord
const EXERCISE_XP = { session: 10, improvement: 10, record: 15 };
export const KG_PER_WEIGHT_LEVEL = 5;

// Level L braucht insgesamt factor · (L−1) · L Punkte → jedes Level etwas mehr als das vorige.
function levelFrom(xp, factor) {
  let level = 1;
  while (factor * level * (level + 1) <= xp) level++;
  const start = factor * (level - 1) * level;
  const next = factor * level * (level + 1);
  return { level, xp, into: xp - start, needed: next - start, next };
}
export const playerLevel = (credits) => levelFrom(credits, 50); // L2: 100, L3: 300, L4: 600 …
export const exerciseLevel = (xp) => levelFrom(xp, 20); // L2: 40, L3: 120, L4: 240 …
// Gewichts-Level: 1 Level pro 5 kg geschätztem Maximalgewicht (1RM)
export const weightLevel = (e1rm) => 1 + Math.floor((e1rm || 0) / KG_PER_WEIGHT_LEVEL);

// workouts: [{ id, date }], sets: [{ workout_id, exercise_id, reps, weight_kg, is_warmup }]
// exercises: Map(id -> { name, type })
export function computeProgress(workouts, sets, exercises) {
  const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const setsByWorkout = new Map();
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    if (!setsByWorkout.has(s.workout_id)) setsByWorkout.set(s.workout_id, []);
    setsByWorkout.get(s.workout_id).push(s);
  }

  // perWorkout: id -> { date, sets, improvements, records, credits, before, after, items: [{ label, credits }] }
  const perWorkout = new Map();
  const perExercise = new Map(); // id -> { xp, sessions, improvements, records, last, best }
  let total = 0;

  for (const w of ordered) {
    const ws = setsByWorkout.get(w.id) || [];
    const items = [];
    let improvements = 0;
    let records = 0;
    if (ws.length) {
      items.push({ label: 'Training abgeschlossen', credits: RULES.workout });
      items.push({ label: `${ws.length} ${ws.length === 1 ? 'Arbeitssatz' : 'Arbeitssätze'}`, credits: ws.length * RULES.set });
    }
    const byExercise = new Map();
    for (const s of ws) {
      if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
      byExercise.get(s.exercise_id).push(s);
    }
    for (const [exId, exSets] of byExercise) {
      const ex = exercises.get(exId);
      const state = perExercise.get(exId) || { xp: 0, sessions: 0, improvements: 0, records: 0, last: 0, best: 0 };
      state.sessions++;
      state.xp += EXERCISE_XP.session;
      if (ex?.type !== 'cardio') {
        const best = Math.max(0, ...exSets.map((s) => estimate1RM(Number(s.weight_kg) || 0, Number(s.reps) || 0)));
        const name = ex?.name ?? 'Übung';
        if (state.sessions > 1 && best > state.last + 1e-9) {
          items.push({ label: `${name} gesteigert`, credits: RULES.improvement });
          state.xp += EXERCISE_XP.improvement;
          state.improvements++;
          improvements++;
        }
        if (state.sessions > 1 && best > state.best + 1e-9) {
          items.push({ label: `Neuer Rekord: ${name}`, credits: RULES.record });
          state.xp += EXERCISE_XP.record;
          state.records++;
          records++;
        }
        state.last = best;
        state.best = Math.max(state.best, best);
      }
      perExercise.set(exId, state);
    }
    const credits = items.reduce((sum, i) => sum + i.credits, 0);
    perWorkout.set(w.id, { date: w.date, sets: ws.length, improvements, records, credits, before: total, after: total + credits, items });
    total += credits;
  }
  return { total, perWorkout, perExercise };
}
