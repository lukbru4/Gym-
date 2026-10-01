// Gekaufte und ausgerüstete Shop-Artikel des angemeldeten Nutzers (kleiner Store für React).
import { useSyncExternalStore } from 'react';
import type { Equipped } from './shop';

export interface Cosmetics { owned: string[]; equipped: Equipped }
let state: Cosmetics = { owned: [], equipped: {} };
const listeners = new Set<() => void>();

export const getCosmetics = () => state;
/** Antwort vom Server absichern (fehlt das SQL noch, kommt evtl. etwas anderes zurück) */
export function setCosmetics(next: Partial<Cosmetics> | null | undefined) {
  const raw = next && typeof next === 'object' && !Array.isArray(next) ? next : {};
  state = {
    owned: Array.isArray(raw.owned) ? raw.owned.filter((x): x is string => typeof x === 'string') : [],
    equipped: raw.equipped && typeof raw.equipped === 'object' && !Array.isArray(raw.equipped) ? raw.equipped : {},
  };
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
export const useCosmetics = () => useSyncExternalStore(subscribe, getCosmetics);
