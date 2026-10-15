// Erinnerungen (nur in der App fürs Handy): Training an den Plantagen, Essen eintragen, Wasser trinken, Serie retten.
// Werden lokal auf dem Gerät geplant – kein Server nötig. Einstellungen auf dem Gerät.
import { useSyncExternalStore } from 'react';
import { loadQuiz } from './plan';
import { isNative } from './platform';

export const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export type Day = (typeof DAYS)[number];
export interface ReminderSettings {
  training: { on: boolean; time: string; days: Day[] | null };
  food: { on: boolean; times: string[] };
  water: { on: boolean; every: number; from: string; to: string };
  streak: { on: boolean; time: string };
}
export const DEFAULTS: ReminderSettings = {
  training: { on: false, time: '17:30', days: null },
  food: { on: false, times: ['08:30', '12:30', '19:00'] },
  water: { on: false, every: 2, from: '09:00', to: '21:00' },
  streak: { on: false, time: '18:00' },
};

const KEY = 'gym-tracker-reminders';
const read = (): ReminderSettings => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!v || typeof v !== 'object') return DEFAULTS;
    return { training: { ...DEFAULTS.training, ...v.training }, food: { ...DEFAULTS.food, ...v.food }, water: { ...DEFAULTS.water, ...v.water }, streak: { ...DEFAULTS.streak, ...v.streak } };
  } catch {
    return DEFAULTS;
  }
};
let current = read();
const subs = new Set<() => void>();
export const getReminders = () => current;
export function setReminders(next: ReminderSettings) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ohne Speicher: nur bis zum Neuladen */
  }
  for (const f of subs) f();
}
export const useReminders = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getReminders, getReminders);

const hm = (t: string): [number, number] => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  const h = m ? Math.min(23, Number(m[1])) : 12, mi = m ? Math.min(59, Number(m[2])) : 0;
  return [h, mi];
};
const dayOf = (d: Date): Day => DAYS[(d.getDay() + 6) % 7];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Trainingstage: eigene Auswahl, sonst aus dem Plan, sonst Mo/Mi/Fr */
export const trainingDays = (s: ReminderSettings, week: { day: string }[]): Day[] => s.training.days ?? (week.length ? week.map((w) => w.day as Day) : ['Mo', 'Mi', 'Fr']);

export interface Planned { id: number; title: string; body: string; at?: Date; daily?: { hour: number; minute: number }; route: string }
export interface Context {
  now: Date;
  /** Trainingstage + Vorlage aus dem Plan */
  week: { day: string; template: string }[];
  trainedToday: boolean;
  weekDone: number;
  weekGoal: number;
  pro: boolean;
}
const TRAIN_TEXTS = ['Zeit fürs Training 💪', 'Heute ist Trainingstag 🏋️', 'Dein Training wartet 🔥', 'Auf geht’s – kurz ins Gym? 💪'];

/** Was geplant werden soll (reine Funktion, testbar). IDs: 1100+ Training, 1200+ Essen, 1300+ Wasser, 1400 Serie */
export function buildSchedule(s: ReminderSettings, c: Context): Planned[] {
  const out: Planned[] = [];
  if (s.training.on) {
    const planDays = new Map(c.week.map((w) => [w.day, w.template]));
    const days = trainingDays(s, c.week);
    const [h, m] = hm(s.training.time);
    for (let i = 0; i < 14; i++) {
      const d = new Date(c.now.getFullYear(), c.now.getMonth(), c.now.getDate() + i, h, m);
      if (d <= c.now || !days.includes(dayOf(d))) continue;
      if (i === 0 && c.trainedToday) continue;
      const tpl = planDays.get(dayOf(d));
      out.push({ id: 1100 + i, title: TRAIN_TEXTS[(d.getDate() + i) % TRAIN_TEXTS.length], body: tpl ? `Heute steht „${tpl}“ an. Kleine Einheit ist besser als keine!` : 'Schon ein kurzes Training hält deine Serie am Leben.', at: d, route: '#/workouts' });
    }
  }
  if (s.food.on && c.pro) {
    const labels = ['Frühstück', 'Mittagessen', 'Abendessen'];
    s.food.times.slice(0, 3).forEach((t, i) => {
      const [h, m] = hm(t);
      out.push({ id: 1200 + i, title: `${labels[i] ?? 'Essen'} eintragen 🍽️`, body: 'Kurz eintragen, was du gegessen hast – dauert 10 Sekunden.', daily: { hour: h, minute: m }, route: '#/essen' });
    });
  }
  if (s.water.on) {
    const [fh, fm] = hm(s.water.from), [th] = hm(s.water.to);
    const every = Math.max(1, Math.min(6, Math.round(s.water.every)));
    let n = 0;
    for (let h = fh; h <= th && n < 12; h += every, n++) out.push({ id: 1300 + n, title: 'Trink ein Glas Wasser 💧', body: 'Genug trinken hilft Kraft und Konzentration.', daily: { hour: h, minute: fm }, route: '#/essen' });
  }
  if (s.streak.on && c.weekDone < c.weekGoal) {
    const [h, m] = hm(s.streak.time);
    const sunday = new Date(c.now.getFullYear(), c.now.getMonth(), c.now.getDate() + ((7 - c.now.getDay()) % 7), h, m);
    if (sunday > c.now) out.push({ id: 1400, title: 'Deine Serie ist in Gefahr 🔥', body: `Diese Woche ${c.weekDone} von ${c.weekGoal} Trainings – heute noch eins, dann bleibt die Serie.`, at: sunday, route: '#/workouts' });
  }
  return out;
}

/** Plan-Kontext aus dem gespeicherten Trainingsplan */
export const planWeek = () => loadQuiz()?.plan?.week ?? [];

let lastKey = '';
/** Alle Erinnerungen neu planen (nur native App). Fragt nur, wenn etwas eingeschaltet ist. */
export async function applyReminders(c: Omit<Context, 'now' | 'week'>, ask = false): Promise<'ok' | 'denied' | 'web'> {
  if (!isNative) return 'web';
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const now = new Date();
  const list = buildSchedule(current, { ...c, now, week: planWeek() });
  const key = JSON.stringify([list.map((p) => [p.id, p.at?.getTime(), p.daily, p.title]), iso(now)]);
  if (key === lastKey && !ask) return 'ok';
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= 1100 && n.id < 1500).map((n) => ({ id: n.id }));
    if (ours.length) await LocalNotifications.cancel({ notifications: ours });
    if (!list.length) { lastKey = key; return 'ok'; }
    let { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted' && ask) ({ display } = await LocalNotifications.requestPermissions());
    if (display !== 'granted') return 'denied';
    await LocalNotifications.schedule({
      notifications: list.map((p) => ({
        id: p.id, title: p.title, body: p.body, extra: { route: p.route },
        schedule: p.at ? { at: p.at, allowWhileIdle: true } : { on: { hour: p.daily!.hour, minute: p.daily!.minute }, allowWhileIdle: true },
      })),
    });
    lastKey = key;
    return 'ok';
  } catch {
    return 'denied';
  }
}

/** Test-Erinnerung in 10 Sekunden */
export async function testReminder(): Promise<boolean> {
  if (!isNative) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  let { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions());
  if (display !== 'granted') return false;
  await LocalNotifications.schedule({ notifications: [{ id: 1499, title: 'So sehen Erinnerungen aus 👋', body: 'Klappt! Du kannst sie in den Einstellungen anpassen.', schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true } }] });
  return true;
}

/** Antippen einer Erinnerung öffnet die passende Seite */
let listening = false;
export async function listenReminderTaps(go: (route: string) => void) {
  if (!isNative || listening) return;
  listening = true;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const r = a.notification.extra?.route;
    if (typeof r === 'string' && r.startsWith('#/')) go(r);
  });
}

/** Browser-Ersatz: Hinweis auf Home, wenn eine Erinnerung jetzt fällig wäre */
export function dueHint(s: ReminderSettings, c: Context): { text: string; route: string } | null {
  const minutes = c.now.getHours() * 60 + c.now.getMinutes();
  if (s.training.on && !c.trainedToday) {
    const days = trainingDays(s, c.week);
    const [h, m] = hm(s.training.time);
    if (days.includes(dayOf(c.now)) && minutes >= h * 60 + m - 60) {
      const tpl = c.week.find((w) => w.day === dayOf(c.now))?.template;
      return { text: tpl ? `Heute ist Trainingstag: „${tpl}“` : 'Heute ist Trainingstag', route: '#/workouts' };
    }
  }
  return null;
}
