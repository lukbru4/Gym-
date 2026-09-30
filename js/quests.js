// Aufgaben (täglich/wöchentlich) und Medaillen – aus dem Trainingsverlauf berechnet.
// Belohnungen für erledigte Aufgaben zählen zu den Credits (gleiche Regeln in supabase/schema.sql).
import { weekStart } from './stats.js';

export const DAILY = [
  { id: 'train', label: 'Trainiere heute', goal: 1, reward: 15, metric: (d) => (d.sets > 0 ? 1 : 0) },
  { id: 'sets10', label: 'Schaffe heute 10 Arbeitssätze', goal: 10, reward: 10, metric: (d) => d.sets },
  { id: 'record', label: 'Stell heute einen Rekord auf', goal: 1, reward: 20, metric: (d) => d.records },
];
export const WEEKLY = [
  { id: 'days3', label: 'Trainiere an 3 Tagen diese Woche', goal: 3, reward: 50, metric: (w) => w.days.size },
  { id: 'improve3', label: 'Steigere dich 3-mal diese Woche', goal: 3, reward: 40, metric: (w) => w.improvements },
];

const emptyDay = () => ({ sets: 0, records: 0, improvements: 0 });
const emptyWeek = () => ({ days: new Set(), improvements: 0 });

// perWorkout aus computeProgress (js/xp.js). Liefert
// { total, byDate: Map(date -> Credits aus Aufgaben, die an dem Tag fertig wurden), today, week }
export function computeQuests(perWorkout, today) {
  const days = new Map();
  const weeks = new Map();
  const ordered = [...perWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
  // Wochen-Aufgaben: das Datum merken, an dem das Ziel erreicht wurde
  const weekDone = new Map(); // `${week}|${id}` -> date
  for (const w of ordered) {
    const d = days.get(w.date) || emptyDay();
    d.sets += w.sets;
    d.records += w.records;
    d.improvements += w.improvements;
    days.set(w.date, d);
    const wk = weekStart(w.date);
    const week = weeks.get(wk) || emptyWeek();
    if (w.sets > 0) week.days.add(w.date);
    week.improvements += w.improvements;
    weeks.set(wk, week);
    for (const q of WEEKLY) {
      const key = `${wk}|${q.id}`;
      if (!weekDone.has(key) && q.metric(week) >= q.goal) weekDone.set(key, w.date);
    }
  }
  const byDate = new Map();
  const add = (date, n) => byDate.set(date, (byDate.get(date) || 0) + n);
  let total = 0;
  for (const [date, d] of days) {
    for (const q of DAILY) {
      if (q.metric(d) >= q.goal) {
        total += q.reward;
        add(date, q.reward);
      }
    }
  }
  for (const [key, date] of weekDone) {
    const q = WEEKLY.find((x) => x.id === key.split('|')[1]);
    total += q.reward;
    add(date, q.reward);
  }
  const status = (list, data) =>
    list.map((q) => {
      const value = q.metric(data);
      return { id: q.id, label: q.label, goal: q.goal, reward: q.reward, value: Math.min(value, q.goal), done: value >= q.goal };
    });
  return {
    total,
    byDate,
    today: status(DAILY, days.get(today) || emptyDay()),
    week: status(WEEKLY, weeks.get(weekStart(today)) || emptyWeek()),
  };
}

// Medaillen: Meilensteine ohne Credits. Liefert [{ id, name, text, done, date }]
// history: Trainings mit Datum und Kennzahlen in Reihenfolge; streakMax: längste Serie in Wochen
export function computeMedals(perWorkout, { maxStreak, level, templates }) {
  const ordered = [...perWorkout.values()].filter((w) => w.sets > 0).sort((a, b) => a.date.localeCompare(b.date));
  const nth = (n) => ordered[n - 1]?.date ?? null;
  let recs = 0;
  let recDate10 = null;
  let recDate1 = null;
  for (const w of ordered) {
    recs += w.records;
    if (!recDate1 && recs >= 1) recDate1 = w.date;
    if (!recDate10 && recs >= 10) recDate10 = w.date;
  }
  const m = (id, name, text, date, done = Boolean(date)) => ({ id, name, text, done, date });
  return [
    m('first', 'Erster Schritt', 'Dein erstes Training', nth(1)),
    m('ten', 'Dranbleiber', '10 Trainings', nth(10)),
    m('fifty', 'Stammgast', '50 Trainings', nth(50)),
    m('hundred', 'Eisern', '100 Trainings', nth(100)),
    m('record1', 'Rekordjäger', 'Dein erster Rekord', recDate1),
    m('record10', 'Rekordmaschine', '10 Rekorde', recDate10),
    m('streak4', 'Serie: 4 Wochen', '4 Wochen in Folge trainiert', null, maxStreak >= 4),
    m('streak12', 'Serie: 12 Wochen', '12 Wochen in Folge trainiert', null, maxStreak >= 12),
    m('level5', 'Level 5', 'Spieler-Level 5 erreicht', null, level >= 5),
    m('level10', 'Level 10', 'Spieler-Level 10 erreicht', null, level >= 10),
    m('template', 'Planer', 'Eigene Vorlage angelegt', null, templates > 0),
  ];
}

// Längste Serie (Wochen in Folge mit Training) im ganzen Verlauf
export function longestStreak(dates) {
  const weeks = [...new Set(dates.map(weekStart))].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const w of weeks) {
    const expected = prev && new Date(Date.parse(prev) + 7 * 864e5).toISOString().slice(0, 10);
    run = prev && w === expected ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  }
  return best;
}
