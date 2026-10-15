// Einstieg für neue Nutzer: Begrüßung (einmal pro Konto und Gerät), Start-Checkliste, einmalige Tipps.
import { useSyncExternalStore } from 'react';

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* nur Komfort */
  }
  for (const f of subs) f();
};
const subs = new Set<() => void>();
let tick = 0;
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const welcomeKey = (uid: string) => `gym-tracker-welcome:${uid}`;
export const welcomeSeen = (uid: string) => get(welcomeKey(uid)) === '1';
export const markWelcomeSeen = (uid: string) => set(welcomeKey(uid), '1');

const CHECK_KEY = 'gym-tracker-checklist-hidden';
export const checklistHidden = () => get(CHECK_KEY) === '1';
export const hideChecklist = () => { tick++; set(CHECK_KEY, '1'); };

const tipKey = (id: string) => `gym-tracker-tip:${id}`;
export const tipSeen = (id: string) => get(tipKey(id)) === '1';
export const dismissTip = (id: string) => { tick++; set(tipKey(id), '1'); };
/** Neu zeichnen, wenn Tipps/Checkliste ausgeblendet werden */
export const useOnboardingTick = () => useSyncExternalStore(subscribe, () => tick, () => tick);

/** Spiel-Modus: was man sammeln möchte – Mein Gym, das Abenteuer (Ei) oder beides (null = noch nicht gewählt) */
export type FunMode = 'gym' | 'ei' | 'beides';
const funKey = (uid: string) => `gym-tracker-fun:${uid}`;
export const funMode = (uid: string): FunMode | null => {
  const v = get(funKey(uid));
  return v === 'gym' || v === 'ei' || v === 'beides' ? v : null;
};
export const setFunMode = (uid: string, m: FunMode) => { tick++; set(funKey(uid), m); };
/** Was angezeigt wird: ohne Wahl beides */
export const showsGym = (m: FunMode | null) => m !== 'ei';
export const showsEgg = (m: FunMode | null) => m !== 'gym';
/** Aktueller Modus, zeichnet bei Änderung neu */
export function useFunMode(uid: string): FunMode | null {
  useOnboardingTick();
  return funMode(uid);
}
