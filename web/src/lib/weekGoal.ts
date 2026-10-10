// Wochenziel (Trainings pro Woche) für die Tages-Serie. Lokal zwischengespeichert, im Konto auf dem Server.
import { useSyncExternalStore } from 'react';

const KEY = 'gym-tracker-week-goal';
export const DEFAULT_WEEK_GOAL = 2;
const listeners = new Set<() => void>();

const clamp = (n: unknown) => {
  const v = Math.round(Number(n));
  return v >= 1 && v <= 7 ? v : DEFAULT_WEEK_GOAL;
};
export function getWeekGoal(): number {
  try {
    return clamp(localStorage.getItem(KEY) ?? DEFAULT_WEEK_GOAL);
  } catch {
    return DEFAULT_WEEK_GOAL;
  }
}
/** Nur lokal setzen (z. B. nach dem Laden vom Server) */
export function setLocalWeekGoal(n: number) {
  try {
    localStorage.setItem(KEY, String(clamp(n)));
  } catch {
    /* ignorieren */
  }
  listeners.forEach((l) => l());
}
export const useWeekGoal = () =>
  useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), getWeekGoal);
