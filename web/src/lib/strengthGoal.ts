// Stärkeziel: Ziel-1RM (kg) für eine Übung, lokal gespeichert.
import { useSyncExternalStore } from 'react';

const KEY = 'gym-tracker-strength-goal';
export interface StrengthGoal { exerciseId: number; kg: number }
const listeners = new Set<() => void>();
let cache: string | null | undefined;
const read = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export function getStrengthGoal(): StrengthGoal | null {
  try {
    const g = JSON.parse(read() ?? 'null') as StrengthGoal | null;
    return g && Number.isFinite(g.exerciseId) && g.kg > 0 ? g : null;
  } catch {
    return null;
  }
}
export function setStrengthGoal(g: StrengthGoal | null) {
  try {
    if (g) localStorage.setItem(KEY, JSON.stringify(g));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignorieren */
  }
  cache = undefined;
  listeners.forEach((l) => l());
}
export const useStrengthGoal = () =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => (cache === undefined ? (cache = read()) : cache),
    () => null,
  );
