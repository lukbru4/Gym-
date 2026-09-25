// Reine Rechenfunktionen (ohne DOM/Netzwerk), damit sie testbar sind.
// Datumswerte sind immer Strings im Format 'YYYY-MM-DD'.

export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

// Montag der Woche, in der `iso` liegt.
export function weekStart(iso) {
  const d = parseISO(iso);
  const offset = (d.getUTCDay() + 6) % 7; // Mo=0 … So=6
  d.setUTCDate(d.getUTCDate() - offset);
  return toISO(d);
}

export function addDays(iso, days) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

// Geschätztes 1RM nach Epley: Gewicht × (1 + Wdh / 30). Bei 1 Wdh = Gewicht.
export function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function setVolume(set) {
  return (Number(set.reps) || 0) * (Number(set.weight_kg) || 0);
}

// Wochenstatistik der letzten `weeks` Wochen (inkl. aktueller), älteste zuerst.
// workouts: [{ id, date }], sets: [{ workout_id, reps, weight_kg, duration_min }]
export function weeklySummary(workouts, sets, today, weeks = 8) {
  const current = weekStart(today);
  const buckets = [];
  const byStart = new Map();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(current, -7 * i);
    const bucket = { start, workouts: 0, volume: 0, cardioMin: 0 };
    buckets.push(bucket);
    byStart.set(start, bucket);
  }
  const workoutWeek = new Map();
  for (const w of workouts) {
    const bucket = byStart.get(weekStart(w.date));
    if (!bucket) continue;
    bucket.workouts++;
    workoutWeek.set(w.id, bucket);
  }
  for (const s of sets) {
    const bucket = workoutWeek.get(s.workout_id);
    if (!bucket) continue;
    bucket.volume += setVolume(s);
    bucket.cardioMin += Number(s.duration_min) || 0;
  }
  return buckets;
}

// Verlauf einer Übung: pro Trainingstag der beste Wert.
// sets: [{ date, reps, weight_kg, duration_min, distance_km }]
export function exerciseProgress(sets, type) {
  const byDate = new Map();
  for (const s of sets) {
    const prev = byDate.get(s.date) || { date: s.date, e1rm: 0, maxWeight: 0, volume: 0, duration: 0, distance: 0 };
    const w = Number(s.weight_kg) || 0;
    const r = Number(s.reps) || 0;
    prev.e1rm = Math.max(prev.e1rm, estimate1RM(w, r));
    prev.maxWeight = Math.max(prev.maxWeight, r > 0 ? w : 0);
    prev.volume += w * r;
    prev.duration += Number(s.duration_min) || 0;
    prev.distance += Number(s.distance_km) || 0;
    byDate.set(s.date, prev);
  }
  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return type === 'cardio'
    ? rows.map(({ date, duration, distance }) => ({ date, duration, distance }))
    : rows.map(({ date, e1rm, maxWeight, volume }) => ({ date, e1rm, maxWeight, volume }));
}

// Persönliche Rekorde pro Übung.
// sets: [{ exercise_id, workout_id, date, reps, weight_kg, duration_min, distance_km }]
// exercises: Map(id -> { name, type })
export function personalRecords(sets, exercises) {
  const records = new Map();
  const sessionTotals = new Map(); // `${exercise}|${workout}` -> Summe
  for (const s of sets) {
    const ex = exercises.get(s.exercise_id);
    if (!ex) continue;
    let rec = records.get(s.exercise_id);
    if (!rec) {
      rec = ex.type === 'cardio'
        ? { exercise: ex.name, type: 'cardio', longestDuration: null, longestDistance: null }
        : { exercise: ex.name, type: 'strength', heaviest: null, bestE1RM: null, bestVolume: null };
      records.set(s.exercise_id, rec);
    }
    const key = `${s.exercise_id}|${s.workout_id}`;
    const total = sessionTotals.get(key) || { date: s.date, volume: 0, duration: 0, distance: 0 };
    if (rec.type === 'cardio') {
      total.duration += Number(s.duration_min) || 0;
      total.distance += Number(s.distance_km) || 0;
    } else {
      const w = Number(s.weight_kg) || 0;
      const r = Number(s.reps) || 0;
      if (r > 0 && (!rec.heaviest || w > rec.heaviest.weight)) rec.heaviest = { weight: w, reps: r, date: s.date };
      const e = estimate1RM(w, r);
      if (e > 0 && (!rec.bestE1RM || e > rec.bestE1RM.value)) rec.bestE1RM = { value: e, date: s.date };
      total.volume += w * r;
    }
    sessionTotals.set(key, total);
  }
  for (const [key, total] of sessionTotals) {
    const rec = records.get(Number(key.split('|')[0]));
    if (rec.type === 'cardio') {
      if (total.duration > 0 && (!rec.longestDuration || total.duration > rec.longestDuration.value)) {
        rec.longestDuration = { value: total.duration, date: total.date };
      }
      if (total.distance > 0 && (!rec.longestDistance || total.distance > rec.longestDistance.value)) {
        rec.longestDistance = { value: total.distance, date: total.date };
      }
    } else if (total.volume > 0 && (!rec.bestVolume || total.volume > rec.bestVolume.value)) {
      rec.bestVolume = { value: total.volume, date: total.date };
    }
  }
  return [...records.values()].sort((a, b) => a.exercise.localeCompare(b.exercise, 'de'));
}
