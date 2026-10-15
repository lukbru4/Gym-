// Live-Aktualisierung: Signale vom Server (neuer Kommentar, Anfeuern, Freundes-Training, Anfrage, Challenge)
// lösen sofortiges Neuladen der betroffenen Anzeigen aus. Inhalte kommen weiter über die geprüften Funktionen.
import { useEffect, useSyncExternalStore } from 'react';
import type { LiveSignal, Social } from '../data/social';
import { refreshNotifications } from './notifications';

const counters = new Map<string, number>();
const subs = new Set<() => void>();
let snapshot = 0;
const bump = (key: string) => counters.set(key, (counters.get(key) ?? 0) + 1);

/** Signal verarbeiten (auch für Tests aufrufbar) */
export function handleLive(s: LiveSignal) {
  bump(s.kind);
  if (s.workout_id != null) bump(`${s.kind}:${s.workout_id}`);
  bump('*');
  snapshot++;
  for (const f of subs) f();
  void refreshNotifications();
}
/** Zähler für eine oder mehrere Arten – als Abhängigkeit für useAsync (ändert sich bei jedem passenden Signal) */
export function useLive(...keys: string[]): number {
  useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snapshot, () => snapshot);
  return keys.reduce((n, k) => n + (counters.get(k) ?? 0), 0);
}

/** Verbindung für die angemeldete Person halten; beim Zurückkehren in die App alles einmal auffrischen */
export function useLiveConnection(social: Social | null | undefined) {
  useEffect(() => {
    if (!social) return;
    let stop: (() => void) | null = null;
    let alive = true;
    social.subscribeLive(handleLive).then((s) => (alive ? (stop = s) : s())).catch(() => { /* ohne Realtime: wie bisher beim Öffnen laden */ });
    const onVisible = () => {
      if (document.visibilityState === 'visible') handleLive({ kind: 'resume', workout_id: null });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      stop?.();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [social]);
}
