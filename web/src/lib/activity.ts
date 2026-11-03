// „Deine Aktivitäten“ im Rückblick: was du selbst gemacht hast – Trainings, Bestwerte, Supplements, Wasser, Gewicht, Gym-Ausbau.
import type { BodyWeight, ExerciseMap, ISODate, Workout, WorkoutSet } from './types';

export interface Activity { date: ISODate; icon: string; text: string; kind: 'workout' | 'pr' | 'supp' | 'water' | 'weight' | 'gym' }
export interface GymLogEntry { date: ISODate; text: string }

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) || 0 : 0);
const fmt = (n: number, d = 0) => n.toLocaleString('de-DE', { maximumFractionDigits: d });

export interface ActivityInput {
  from: ISODate; to: ISODate;
  workouts: Workout[]; sets: WorkoutSet[]; exercises: ExerciseMap;
  prs?: { exercise: string; e1rm: number }[];
  /** Tag → abgehakte Supplement-IDs, dazu Namen */
  taken?: Record<string, string[]>; suppNames?: Map<string, string>;
  /** Tag → ml */
  water?: Record<string, number>;
  weights?: BodyWeight[];
  gymLog?: GymLogEntry[];
}

/** Alle Aktivitäten im Zeitraum, neueste zuerst (am selben Tag: Training vor dem Rest) */
export function activities(i: ActivityInput): Activity[] {
  const inR = (d: string) => d >= i.from && d <= i.to;
  const out: Activity[] = [];
  const byW = new Map<number, WorkoutSet[]>();
  for (const s of i.sets) byW.set(s.workout_id, [...(byW.get(s.workout_id) ?? []), s]);
  for (const w of i.workouts.filter((x) => inR(x.date))) {
    const ss = byW.get(w.id) ?? [];
    const names = [...new Set(ss.map((s) => i.exercises.get(s.exercise_id)?.name).filter(Boolean))] as string[];
    const vol = ss.reduce((a, s) => a + num(s.weight_kg) * num(s.reps), 0);
    const cardio = ss.reduce((a, s) => a + num(s.duration_min), 0);
    const what = names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : 'Training';
    const extra = [ss.length ? `${ss.length} ${ss.length === 1 ? 'Satz' : 'Sätze'}` : '', vol > 0 ? `${fmt(vol)} kg` : '', cardio > 0 ? `${fmt(cardio)} Min.` : ''].filter(Boolean).join(' · ');
    out.push({ date: w.date, icon: '💪', text: extra ? `${what} · ${extra}` : what, kind: 'workout' });
  }
  for (const [d, ids] of Object.entries(i.taken ?? {})) {
    if (!inR(d) || !ids.length) continue;
    const names = ids.map((id) => i.suppNames?.get(id)).filter(Boolean) as string[];
    if (names.length) out.push({ date: d, icon: '💊', text: `${names.join(', ')} genommen`, kind: 'supp' });
  }
  for (const [d, ml] of Object.entries(i.water ?? {})) if (inR(d) && ml > 0) out.push({ date: d, icon: '💧', text: `${fmt(ml / 1000, 2)} l Wasser getrunken`, kind: 'water' });
  for (const w of i.weights ?? []) if (inR(w.date)) out.push({ date: w.date, icon: '⚖️', text: `Gewicht eingetragen: ${fmt(w.weight_kg, 1)} kg`, kind: 'weight' });
  for (const g of i.gymLog ?? []) {
    if (!inR(g.date)) continue;
    // Einträge mit eigenem Symbol vorne (📷 Foto, 📏 Maße), sonst Gym-Ausbau
    const m = g.text.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
    out.push({ date: g.date, icon: m ? m[1] : '🏗️', text: m ? m[2] : g.text, kind: 'gym' });
  }
  const order: Activity['kind'][] = ['workout', 'pr', 'gym', 'weight', 'supp', 'water'];
  out.sort((a, b) => (a.date === b.date ? order.indexOf(a.kind) - order.indexOf(b.kind) : a.date < b.date ? 1 : -1));
  // Bestwerte des Zeitraums ganz oben (ohne eigenes Datum)
  const prs = (i.prs ?? []).slice(0, 3).map((p): Activity => ({ date: i.to, icon: '🏆', text: `Neuer Bestwert: ${p.exercise} ${fmt(p.e1rm, 1)} kg (geschätztes 1RM)`, kind: 'pr' }));
  return [...prs, ...out];
}

// ---- Gym-Verlauf (auf dem Gerät) --------------------------------------------------------------
const gymKey = (uid: string) => `gym-tracker-gymlog:${uid}`;
export function loadGymLog(uid: string): GymLogEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(gymKey(uid)) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.date === 'string' && typeof x.text === 'string') : [];
  } catch {
    return [];
  }
}
export function addGymLog(uid: string, date: ISODate, text: string) {
  const list = loadGymLog(uid);
  if (list.some((x) => x.date === date && x.text === text)) return;
  try {
    localStorage.setItem(gymKey(uid), JSON.stringify([...list, { date, text: text.slice(0, 80) }].slice(-100)));
  } catch {
    /* nur Komfort */
  }
}
