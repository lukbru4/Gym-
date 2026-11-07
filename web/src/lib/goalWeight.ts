// Zielgewicht (kg): steht in den Antworten des Trainingsplans (wird im Konto mitgespeichert),
// auf Geräten ohne diese Antworten gilt der alte lokale Wert.
import { useSyncExternalStore } from 'react';
import { loadQuiz, saveQuiz, subscribeQuiz } from './plan';

const KEY = 'gym-tracker-goal-weight';
const listeners = new Set<() => void>();
const valid = (v: unknown) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return n >= 30 && n <= 250 ? n : null;
};

export function getGoalWeight(): number | null {
  const a = loadQuiz()?.answers;
  if (a?.goalKg === 'kein') return null;
  if (a?.goalKg === 'ja' && valid(a.goalWeight)) return valid(a.goalWeight);
  try {
    return valid(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
export function setGoalWeight(kg: number | null) {
  try {
    if (kg === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(kg));
  } catch {
    /* ignorieren */
  }
  const saved = loadQuiz();
  const answers = { ...(saved?.answers ?? {}) };
  if (kg === null) {
    answers.goalKg = 'kein';
    delete answers.goalWeight;
  } else {
    answers.goalKg = 'ja';
    answers.goalWeight = String(kg);
  }
  saveQuiz({ answers, plan: saved?.plan ?? null, savedAt: new Date().toISOString() });
  listeners.forEach((l) => l());
}
export const useGoalWeight = () =>
  useSyncExternalStore((cb) => {
    listeners.add(cb);
    const off = subscribeQuiz(cb);
    return () => {
      listeners.delete(cb);
      off();
    };
  }, getGoalWeight);
