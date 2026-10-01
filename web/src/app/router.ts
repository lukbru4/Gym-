// Hash-Routing (#/…): funktioniert auf GitHub Pages ohne Server-Konfiguration.
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
export const currentHash = () => location.hash || '#/';
export const useHash = () => useSyncExternalStore(subscribe, currentHash);

export const navigate = (hash: string) => {
  location.hash = hash;
};
/** Ersetzt den aktuellen Eintrag (z. B. nach „Start aus Vorlage“), ohne Zurück-Schritt */
export const redirect = (hash: string) => location.replace(hash);

/** Welche untere Registerkarte zu welcher Seite gehört */
export type Section = 'workouts' | 'home' | 'raenge' | 'freunde' | 'profil';
export function sectionOf(hash: string): Section {
  if (/^#\/(workouts|neu|vorlage|start)/.test(hash)) return 'workouts';
  if (/^#\/(raenge|rekorde|fortschritt|koerper)/.test(hash)) return 'raenge';
  if (/^#\/(profil|aufgaben|medaillen|verlauf|training|konto|backup|shop|admin)/.test(hash)) return 'profil';
  if (/^#\/freunde/.test(hash)) return 'freunde';
  return 'home';
}
