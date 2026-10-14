// Echte Fotos zu Gerichten (vom Besitzer hochgeladen). Einmal laden, dann für alle Bilder benutzen.
import { useEffect, useSyncExternalStore } from 'react';

/** Dateiname im Speicher: Gericht-ID ohne Umlaute/Sonderzeichen */
export const dishPhotoFile = (dishId: string) =>
  `${dishId.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9-]+/g, '-').slice(0, 90)}.jpg`;

let photos: Record<string, string> = {};
let state: 'idle' | 'loading' | 'done' = 'idle';
const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

type Loader = { dishPhotos(): Promise<Record<string, string>> } | null | undefined;
/** lädt die Liste einmal (ohne Konto: keine Fotos) */
export function loadDishPhotos(social: Loader, force = false) {
  if (!social || (state !== 'idle' && !force)) return;
  state = 'loading';
  social.dishPhotos().then((p) => { photos = p; state = 'done'; emit(); }).catch(() => { state = 'done'; }); // kein erneuter Versuch bei jedem Bild
}
export function setDishPhotoLocal(dishId: string, url: string | null) {
  photos = { ...photos };
  if (url) photos[dishId] = url;
  else delete photos[dishId];
  emit();
}
export function useDishPhotos(social: Loader): Record<string, string> {
  useEffect(() => loadDishPhotos(social), [social]);
  return useSyncExternalStore(subscribe, () => photos, () => photos);
}
