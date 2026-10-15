// Stand der Datenbank (public.schema_version) – gemeinsam für den roten Update-Hinweis und die Admin-Karte.
import { useSyncExternalStore } from 'react';
import type { Social } from '../data/social';

let version: number | null = null; // null = noch nicht geprüft, 0 = sehr alt (Funktion fehlt)
const subs = new Set<() => void>();
export async function checkDbVersion(social: Social): Promise<number> {
  const v = await social.schemaVersion().then((x) => Number(x) || 0, () => 0);
  version = v;
  for (const f of subs) f();
  return v;
}
export const useDbVersion = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => version, () => version);
