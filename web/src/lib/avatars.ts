// Profilbilder: Freunde und eigenes Bild (kleiner Store für React). Bilder liegen privat, die App holt kurzlebige Links.
import { useSyncExternalStore } from 'react';
import type { Social } from '../data/social';

let urls: Record<string, string> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Bilder von mir und meinen Freunden neu laden (fehlt das SQL noch, bleibt es bei den Anfangsbuchstaben) */
export async function refreshAvatars(social: Social) {
  try {
    const rows = await social.friendAvatars();
    const ids = Array.isArray(rows) ? rows.map((r) => r.user_id) : [];
    const signed = await social.avatarUrls(ids);
    urls = Object.fromEntries(Object.entries(signed).map(([id, u]) => [id, u]));
    // Cache-Buster pro Version, damit ein neues Bild sofort erscheint
    for (const r of rows) if (urls[r.user_id]) urls[r.user_id] += `${urls[r.user_id].includes('?') ? '&' : '?'}v=${r.v}`;
  } catch {
    urls = {};
  }
  emit();
}
export function clearAvatars() {
  urls = {};
  emit();
}
const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));
export const useAvatarUrl = (userId?: string) => useSyncExternalStore(subscribe, () => (userId ? urls[userId] : undefined));
