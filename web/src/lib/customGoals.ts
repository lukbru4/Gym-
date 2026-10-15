// Eigene Ziele (Freitext, abhakbar): nur auf diesem Gerät gespeichert.
import { useSyncExternalStore } from 'react';

export interface CustomGoal { id: number; text: string; done: boolean }
const KEY = 'gym-tracker-custom-goals';
const listeners = new Set<() => void>();
let cache: CustomGoal[] | null = null;

function read(): CustomGoal[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((g) => g && typeof g.text === 'string').map((g) => ({ id: Number(g.id) || 0, text: String(g.text).slice(0, 80), done: g.done === true })) : [];
  } catch {
    return [];
  }
}
export const getCustomGoals = () => (cache ??= read());
function save(next: CustomGoal[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignorieren */
  }
  listeners.forEach((l) => l());
}
export const addCustomGoal = (text: string) => {
  const t = text.trim().slice(0, 80);
  if (t) save([...getCustomGoals(), { id: Date.now(), text: t, done: false }]);
};
export const toggleCustomGoal = (id: number) => save(getCustomGoals().map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
export const removeCustomGoal = (id: number) => save(getCustomGoals().filter((g) => g.id !== id));
export const useCustomGoals = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), getCustomGoals);
