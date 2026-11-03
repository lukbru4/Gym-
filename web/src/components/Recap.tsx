// Begrüßung oben auf Home: „Guten Abend, Lukas“ plus Fakten zu dieser Woche bzw. diesem Monat.
import { useState } from 'react';
import { activities, loadGymLog } from '../lib/activity';
import { loadWater } from '../lib/nutritionStore';
import { loadSupps, loadTaken, useSuppsTick } from '../lib/supplements';
import { useApp } from '../app/context';
import { displayName } from '../app/profile';
import { fmt, plural } from '../lib/format';
import { change, computeRecap, greeting, type Recap, type RecapPeriod } from '../lib/recap';
import { trainingDaysThisWeek } from '../lib/stats';
import type { BodyWeight, Workout, WorkoutSet } from '../lib/types';
import { useWeekGoal } from '../lib/weekGoal';

const KEY = 'gym-tracker-recap-period';
function readPeriod(): RecapPeriod {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'month' || v === 'year' ? v : 'week';
  } catch {
    return 'week';
  }
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null;
  return <span className={`delta ${pct > 0 ? 'up' : 'down'}`}>{pct > 0 ? `+${pct}` : pct} %</span>;
}

function facts(r: Recap, goal: number, done: number): { icon: string; text: React.ReactNode }[] {
  const out: { icon: string; text: React.ReactNode }[] = [];
  if (r.period === 'week')
    out.push({
      icon: '🎯',
      text: done >= goal ? (
        <>Wochenziel geschafft: <strong>{done} von {goal}</strong> – die ganze Woche zählt für deine Serie</>
      ) : (
        <>Wochenziel: <strong>{done} von {goal}</strong> Trainings – noch {goal - done} bis Sonntag</>
      ),
    });
  const prevLabel = r.period === 'week' ? 'Vorwoche' : r.period === 'month' ? 'Vormonat' : 'Vorjahr';
  out.push({
    icon: '💪',
    text: (
      <>
        <strong>{plural(r.workouts, 'Training', 'Trainings')}</strong>
        {r.days !== r.workouts ? ` an ${plural(r.days, 'Tag', 'Tagen')}` : ''} · {prevLabel}: {r.previous.workouts}
      </>
    ),
  });
  if (r.volume > 0)
    out.push({
      icon: '🏋️',
      text: (
        <>
          <strong>{fmt(r.volume, 0)} kg</strong> bewegt in {plural(r.sets, 'Satz', 'Sätzen')} <Delta pct={change(r.volume, r.previous.volume)} />
        </>
      ),
    });
  if (r.prs.length) {
    const best = r.prs[0];
    out.push({
      icon: '🏆',
      text: (
        <>
          <strong>{r.prs.length === 1 ? 'Neuer Bestwert' : `${r.prs.length} neue Bestwerte`}</strong>
          {r.prs.length === 1 ? ': ' : ', z. B. '}
          {best.exercise} {fmt(best.e1rm)} kg geschätztes 1RM (vorher {fmt(best.previous)} kg)
        </>
      ),
    });
  }
  if (r.topExercise)
    out.push({ icon: '⭐', text: <>Am meisten: <strong>{r.topExercise.name}</strong> ({plural(r.topExercise.sets, 'Satz', 'Sätze')}){r.topMuscle ? ` · Fokus ${r.topMuscle}` : ''}</> });
  if (r.cardioMin > 0 || r.distanceKm > 0)
    out.push({ icon: '🏃', text: <><strong>{fmt(r.cardioMin, 0)} Min.</strong> Cardio{r.distanceKm > 0 ? ` · ${fmt(r.distanceKm)} km` : ''}</> });
  if (r.streak > 1) out.push({ icon: '🔥', text: <>Serie: <strong>{r.streak} Tage</strong></> });
  return out;
}

function headline(r: Recap): string {
  const span = r.period === 'week' ? 'Diese Woche' : r.period === 'month' ? 'Diesen Monat' : 'Dieses Jahr';
  if (!r.workouts) return r.period === 'week' ? 'Diese Woche noch kein Training – heute ist ein guter Tag dafür.' : `${span} noch kein Training – leg los!`;
  const pct = change(r.workouts, r.previous.workouts);
  if (pct !== null && pct > 0) return `${span} trainierst du mehr als im gleichen Zeitraum davor. Stark!`;
  if (r.prs.length) return `${span} hast du ${r.prs.length === 1 ? 'einen neuen Bestwert' : `${r.prs.length} neue Bestwerte`} geknackt.`;
  return `${span} hast du schon einiges geschafft:`;
}

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const dayLabel = (d: string, today: string) => (d === today ? 'Heute' : `${WD[new Date(`${d}T12:00:00`).getDay()]} ${d.slice(8, 10)}.${d.slice(5, 7)}.`);

export function RecapCard({ workouts, sets, today, weights = [] }: { workouts: Workout[]; sets: WorkoutSet[]; today: string; weights?: BodyWeight[] }) {
  const { api, user, exerciseMap } = useApp();
  const [period, setPeriod] = useState(readPeriod);
  const [allActs, setAllActs] = useState(false);
  useSuppsTick();
  const choose = (p: RecapPeriod) => {
    setPeriod(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* nur Komfort */
    }
  };
  const goal = useWeekGoal();
  const r = computeRecap(workouts, sets, exerciseMap(), today, period, goal);
  const done = trainingDaysThisWeek(workouts, today);
  const name = displayName(api, user);
  const uid = user?.id ?? 'local';
  const water: Record<string, number> = {};
  for (let d = new Date(`${r.from}T12:00:00`); d.toISOString().slice(0, 10) <= today; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const ml = loadWater(uid, iso);
    if (ml > 0) water[iso] = ml;
  }
  const acts = activities({
    from: r.from, to: today, workouts, sets, exercises: exerciseMap(), prs: r.prs, weights, water,
    taken: loadTaken(uid), suppNames: new Map(loadSupps(uid).map((s) => [s.id, s.name])), gymLog: loadGymLog(uid),
  });
  const shown = allActs ? acts : acts.slice(0, 5);
  return (
    <section className="card recap" id="recap" aria-label="Dein Rückblick">
      <div className="recap-head">
        <h2>
          {greeting(new Date().getHours())}
          {name && name !== 'Du' ? ', ' : ' '}
          <span className="nowrap">{name && name !== 'Du' ? name : ''} 👋</span>
        </h2>
        <div className="mini-seg" role="tablist" aria-label="Zeitraum">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={period === p} className={period === p ? 'active' : ''} onClick={() => choose(p)} data-period={p}>
              {p === 'week' ? 'Woche' : p === 'month' ? 'Monat' : 'Jahr'}
            </button>
          ))}
        </div>
      </div>
      <p className="recap-line">{headline(r)}</p>
      {r.workouts > 0 && (
        <ul className="recap-facts">
          {facts(r, goal, done).map((f, i) => (
            <li key={i}>
              <span aria-hidden="true">{f.icon}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      )}
      {acts.length > 0 && (
        <div className="recap-acts" id="recap-acts">
          <h3>Deine Aktivitäten</h3>
          <ul>
            {shown.map((a, i) => (
              <li key={i} data-act={a.kind}>
                <span className="act-day">{a.kind === 'pr' ? 'Neu' : dayLabel(a.date, today)}</span>
                <span aria-hidden="true">{a.icon}</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
          {acts.length > 5 && <button type="button" className="link-btn small" id="recap-acts-more" onClick={() => setAllActs(!allActs)}>{allActs ? 'Weniger anzeigen' : `Alle ${acts.length} anzeigen`}</button>}
        </div>
      )}
    </section>
  );
}
