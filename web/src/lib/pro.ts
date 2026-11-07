// Pro-Abo: Status vom Server (Konto), Preise und die Möglichkeit für den Besitzer, die Bezahlseite zu testen.
import { useSyncExternalStore } from 'react';

export const PRO_PRICES = { month: 8, year: 45 } as const;
/** Zusatz „Essen+“ (Rezepte mit Anleitung), monatlich, zusätzlich zu Pro */
export const FOOD_PLUS_PRICE = 2.99;
export const fmtEuro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
/** Ersparnis des Jahrespreises gegenüber 12 Monaten (in Prozent, gerundet) */
export const yearSavingPct = () => Math.round((1 - PRO_PRICES.year / (PRO_PRICES.month * 12)) * 100);

export interface ProState { /** alles freigeschaltet (Abo, Admin, Testphase oder Bezahlschranke aus) */ pro: boolean; /** wirklich bezahlt bzw. vom Server freigeschaltet */ paid: boolean; admin: boolean; /** Besitzer: darf Admins verwalten */ owner: boolean; until: string | null; /** Zusatz „Essen+“ */ food: boolean; loaded: boolean }
let server: ProState = { pro: false, paid: false, admin: false, owner: false, until: null, food: false, loaded: false };
const PREVIEW_KEY = 'gym-tracker-paywall-preview';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Antwort vom Server absichern (fehlt das SQL noch, kommt evtl. etwas anderes zurück) */
export function setPro(next: Partial<ProState> | null | undefined) {
  const raw = next && typeof next === 'object' ? next : {};
  server = { pro: raw.pro === true, paid: raw.pro === true, admin: raw.admin === true, owner: raw.owner === true, until: typeof raw.until === 'string' ? raw.until : null, food: raw.food === true, loaded: true };
  state = compute();
  emit();
}
/** Admin: Bezahlseite ansehen, als hätte man kein Pro (nur lokal, ändert nichts am Konto) */
export const paywallPreview = () => {
  try {
    return localStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
};
export function setPaywallPreview(on: boolean) {
  try {
    if (on) localStorage.setItem(PREVIEW_KEY, '1');
    else localStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* ignorieren */
  }
  state = compute();
  emit();
}
/** Testphase/Bestandskonto/Schranke aus: alles offen (setzt die App, siehe lib/access.ts) */
let fullAccess = false;
export function setFullAccess(on: boolean) {
  if (on === fullAccess) return;
  fullAccess = on;
  state = compute();
  emit();
}
const compute = (): ProState => (server.owner && paywallPreview() ? { ...server, pro: false, paid: false, food: false } : { ...server, pro: server.pro || fullAccess, food: server.food || fullAccess });
let state = compute();
export const getPro = () => state;
export const usePro = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), getPro);
