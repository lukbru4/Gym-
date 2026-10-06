// Pro-Abo: Status vom Server (Konto), Preise und die Möglichkeit für Admins, die Bezahlseite zu testen.
import { useSyncExternalStore } from 'react';

export const PRO_PRICES = { month: 9.99, year: 64.99 } as const;
export const fmtEuro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;
/** Ersparnis des Jahrespreises gegenüber 12 Monaten (in Prozent, gerundet) */
export const yearSavingPct = () => Math.round((1 - PRO_PRICES.year / (PRO_PRICES.month * 12)) * 100);

export interface ProState { pro: boolean; admin: boolean; until: string | null; loaded: boolean }
let server: ProState = { pro: false, admin: false, until: null, loaded: false };
const PREVIEW_KEY = 'gym-tracker-paywall-preview';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Antwort vom Server absichern (fehlt das SQL noch, kommt evtl. etwas anderes zurück) */
export function setPro(next: Partial<ProState> | null | undefined) {
  const raw = next && typeof next === 'object' ? next : {};
  server = { pro: raw.pro === true, admin: raw.admin === true, until: typeof raw.until === 'string' ? raw.until : null, loaded: true };
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
const compute = (): ProState => (server.admin && paywallPreview() ? { ...server, pro: false } : server);
let state = compute();
export const getPro = () => state;
export const usePro = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), getPro);
