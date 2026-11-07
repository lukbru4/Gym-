// Lieblingsgerichte (Herz) – auf diesem Gerät gespeichert.
import { useSyncExternalStore } from 'react';

const KEY = 'gym-tracker-dish-favorites';
const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
let favs = read();
const subs = new Set<() => void>();
export function toggleFavorite(id: string) {
  favs = favs.includes(id) ? favs.filter((x) => x !== id) : [id, ...favs];
  try {
    localStorage.setItem(KEY, JSON.stringify(favs));
  } catch {
    /* ohne Speicher: nur bis zum Neuladen */
  }
  for (const f of subs) f();
}
export function useFavorites(): string[] {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => favs, () => favs);
}
