// Mitteilungen (Glocke): einmal laden, alle 2 Minuten bei sichtbarer App neu – gemeinsam für Kopfleiste und Seite.
import { useEffect, useSyncExternalStore } from 'react';
import type { AppNotification, Social as SocialApi } from '../data/social';

let list: AppNotification[] | null = null;
let social: SocialApi | null = null;
let timer = 0;
const subs = new Set<() => void>();
const emit = () => { for (const f of subs) f(); };

export async function refreshNotifications() {
  if (!social) return;
  try {
    list = await social.notifications();
    emit();
  } catch {
    /* Datenbank noch ohne Mitteilungen oder offline: Glocke bleibt leer */
  }
}
export async function markAllSeen() {
  if (!social || !list?.some((n) => n.unread)) return;
  list = list.map((n) => ({ ...n, unread: false }));
  emit();
  await social.markNotificationsSeen().catch(() => {});
}
function start(s: SocialApi | null) {
  if (s === social) return;
  social = s;
  list = null;
  window.clearInterval(timer);
  if (!s) return emit();
  void refreshNotifications();
  timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshNotifications(); }, 120000);
}
export function useNotifications(s: SocialApi | null | undefined): AppNotification[] | null {
  useEffect(() => start(s ?? null), [s]);
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => list, () => list);
}

const METRIC: Record<string, string> = { workouts: 'Trainings', sets: 'Sätze', volume: 'Volumen' };
/** Text und Ziel einer Mitteilung */
export function describe(n: AppNotification): { text: string; href: string; icon: string } {
  const who = n.actor_name;
  switch (n.kind) {
    case 'like': return { icon: '🔥', text: `${who} hat dein Training angefeuert`, href: n.workout_id ? `#/training/${n.workout_id}` : '#/workouts' };
    case 'comment': return { icon: '💬', text: `${who} hat kommentiert: „${n.body ?? ''}“`, href: n.workout_id ? `#/training/${n.workout_id}` : '#/workouts' };
    case 'friend_request': return { icon: '👋', text: `${who} möchte mit dir befreundet sein`, href: '#/freunde' };
    case 'friend_accepted': return { icon: '🤝', text: `${who} hat deine Freundschaftsanfrage angenommen`, href: `#/freunde/profil/${n.actor}` };
    case 'challenge_invite': return { icon: '⚔️', text: `${who} fordert dich heraus (${METRIC[n.body ?? ''] ?? 'Challenge'})`, href: '#/freunde' };
    case 'challenge_accepted': return { icon: '⚔️', text: `${who} hat deine Challenge angenommen – los geht’s!`, href: '#/freunde' };
    case 'challenge_declined': return { icon: '🏳️', text: `${who} hat deine Challenge abgelehnt`, href: '#/freunde' };
  }
}
export function ago(at: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(at).getTime()) / 60000));
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
}
