// Anzeigename: selbst gewählt (Einstellungen), sonst E-Mail-Anfang (Cloud) bzw. „Du“ (lokal).
import type { Backend } from '../data/backend';
import type { User } from '../lib/types';

const NAME_KEY = 'gym-tracker-name';

export function displayName(api: Backend, user: User | null): string {
  try {
    const n = localStorage.getItem(NAME_KEY);
    if (n) return n;
  } catch {
    /* ignorieren */
  }
  return api.mode === 'cloud' && user?.email ? user.email.split('@')[0] : 'Du';
}

export function setDisplayName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    /* ignorieren */
  }
}
