// Zielgewicht (kg): nur auf diesem Gerät gespeichert.
import { useSyncExternalStore } from 'react';

const KEY = 'gym-tracker-goal-weight';
const listeners = new Set<() => void>();

export function getGoalWeight(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return v >= 30 && v <= 250 ? v : null;
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
  listeners.forEach((l) => l());
}
export const useGoalWeight = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), getGoalWeight);
