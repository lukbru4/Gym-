// Rückmeldung nach einer Übung („zu leicht / passt / zu schwer“). Sie fließt in den nächsten Gewichtsvorschlag ein.
// Gerätelokal gespeichert (je Konto und Übung die letzte Rückmeldung).
export type Feedback = 'easy' | 'ok' | 'hard';
export const FEEDBACK_OPTIONS: [Feedback, string][] = [['easy', 'Zu leicht'], ['ok', 'Passt'], ['hard', 'Zu schwer']];
export const FEEDBACK_LABEL: Record<Feedback, string> = { easy: 'zu leicht', ok: 'passend', hard: 'zu schwer' };

export interface FeedbackEntry { value: Feedback; date: string }
type Store = Record<string, FeedbackEntry>;

const key = (uid: string) => `gym-tracker-feedback-${uid}`;
function read(uid: string): Store {
  try {
    const v = JSON.parse(localStorage.getItem(key(uid)) ?? '{}');
    return v && typeof v === 'object' ? (v as Store) : {};
  } catch {
    return {};
  }
}
export const getFeedback = (uid: string, exerciseId: number): FeedbackEntry | null => read(uid)[String(exerciseId)] ?? null;
export function setFeedback(uid: string, exerciseId: number, date: string, value: Feedback) {
  const all = read(uid);
  all[String(exerciseId)] = { value, date };
  try {
    localStorage.setItem(key(uid), JSON.stringify(all));
  } catch {
    /* Speicher blockiert: Rückmeldung gilt nur für diese Sitzung */
  }
}
/** Rückmeldung vom letzten Training (älter als `today`), sonst null */
export function previousFeedback(uid: string, exerciseId: number, today: string): Feedback | null {
  const e = getFeedback(uid, exerciseId);
  return e && e.date < today ? e.value : null;
}
