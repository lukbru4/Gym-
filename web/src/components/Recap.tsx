// Begrüßung oben auf Home: „Guten Abend, Lukas“, eine Zeile und drei Kennzahlen; weitere Fakten hinter „Mehr anzeigen“;
// darunter die Aktivitäten der letzten 3 Tage (nur Trainings und Supplements).
import { useState } from 'react';
import { activities } from '../lib/activity';
import { Icon } from './Icon';
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
      icon: 'target',
      text: done >= goal ? (
        <>Wochenziel geschafft: <strong>{done} von {goal}</strong> – die ganze Woche zählt für deine Serie</>
      ) : (
        <>Wochenziel: <strong>{done} von {goal}</strong> Trainings – noch {goal - done} bis Sonntag</>
      ),
    });
  const prevLabel = r.period === 'week' ? 'Vorwoche' : r.period === 'month' ? 'Vormonat' : 'Vorjahr';
  out.push({
    icon: 'dumbbell',
    text: (
      <>
        <strong>{plural(r.workouts, 'Training', 'Trainings')}</strong>
        {r.days !== r.workouts ? ` an ${plural(r.days, 'Tag', 'Tagen')}` : ''} · {prevLabel}: {r.previous.workouts}
      </>
    ),
  });
  if (r.volume > 0)
    out.push({
      icon: 'plate',
      text: (
        <>
          <strong>{fmt(r.volume, 0)} kg</strong> bewegt in {plural(r.sets, 'Satz', 'Sätzen')} <Delta pct={change(r.volume, r.previous.volume)} />
        </>
      ),
    });
  if (r.prs.length) {
    const best = r.prs[0];
    out.push({
      icon: 'trophy',
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
    out.push({ icon: 'star', text: <>Am meisten: <strong>{r.topExercise.name}</strong> ({plural(r.topExercise.sets, 'Satz', 'Sätze')}){r.topMuscle ? ` · Fokus ${r.topMuscle}` : ''}</> });
  if (r.cardioMin > 0 || r.distanceKm > 0)
    out.push({ icon: 'run', text: <><strong>{fmt(r.cardioMin, 0)} Min.</strong> Cardio{r.distanceKm > 0 ? ` · ${fmt(r.distanceKm)} km` : ''}</> });
  if (r.streak > 1) out.push({ icon: 'flame', text: <>Serie: <strong>{r.streak} Tage</strong></> });
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
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dayLabel = (d: string, today: string) => (d === today ? 'Heute' : d === addDays(today, -1) ? 'Gestern' : `${WD[new Date(`${d}T12:00:00`).getDay()]} ${d.slice(8, 10)}.${d.slice(5, 7)}.`);
const MORE_KEY = 'gym-tracker-recap-more';

/** period/onPeriod: ein gemeinsamer Zeitraum-Schalter für Rückblick und Statistik auf der Startseite */
export function RecapCard({ workouts, sets, today, period: outer, onPeriod }: { workouts: Workout[]; sets: WorkoutSet[]; today: string; weights?: BodyWeight[]; period?: RecapPeriod; onPeriod?: (p: RecapPeriod) => void }) {
  const { api, user, exerciseMap } = useApp();
  const [own, setPeriod] = useState(readPeriod);
  const period = outer ?? own;
  const [allActs, setAllActs] = useState(false);
  const [more, setMore] = useState(() => { try { return localStorage.getItem(MORE_KEY) === '1'; } catch { return false; } });
  useSuppsTick();
  const choose = (p: RecapPeriod) => {
    if (onPeriod) return onPeriod(p);
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
  // Aktivitäten: immer die letzten 3 Tage, nur Trainings und genommene Supplements
  const acts = activities({
    from: addDays(today, -2), to: today, workouts, sets, exercises: exerciseMap(), kinds: ['workout', 'supp'],
    taken: loadTaken(uid), suppNames: new Map(loadSupps(uid).map((s) => [s.id, s.name])),
  });
  const shown = allActs ? acts : acts.slice(0, 4);
  const fs = facts(r, goal, done);
  const toggleMore = () => { setMore(!more); try { localStorage.setItem(MORE_KEY, more ? '0' : '1'); } catch { /* nur Komfort */ } };
  return (
    <section className="card recap" id="recap" aria-label="Dein Rückblick">
      <div className="recap-head">
        <h2>
          {greeting(new Date().getHours())}
          {name && name !== 'Du' ? ', ' : ' '}
          <span className="nowrap">{name && name !== 'Du' ? name : ''}</span>
        </h2>
        <div className="mini-seg" role="tablist" aria-label="Zeitraum">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={period === p} className={period === p ? 'active' : ''} onClick={() => choose(p)} data-period={p}>
              {p === 'week' ? 'Woche' : p === 'month' ? 'Monat' : 'Jahr'}
            </button>
          ))}
        </div>
      </div>
      <p className="recap-line">{period === 'week' ? (done >= goal ? `Wochenziel geschafft: ${done} ${done === 1 ? 'Training' : 'Trainings'} (Ziel ${goal})` : `Diese Woche: ${done} von ${goal} Trainings`) : headline(r)}</p>
      <div className="recap-stats" id="recap-stats">
        <div><Icon name="dumbbell" size={22} /><strong>{r.workouts}</strong><small>Trainings</small></div>
        <div><Icon name="plate" size={22} /><strong>{r.volume >= 10000 ? `${fmt(r.volume / 1000, 1)} t` : `${fmt(r.volume, 0)} kg`}</strong><small>Volumen</small></div>
        <div><Icon name="flame" size={22} /><strong>{r.streak}</strong><small>{r.streak === 1 ? 'Tag Serie' : 'Tage Serie'}</small></div>
      </div>
      {r.workouts > 0 && (
        <>
          <button type="button" className="link-btn small recap-more-btn" id="recap-more" aria-expanded={more} onClick={toggleMore}>{more ? 'Weniger anzeigen' : 'Mehr anzeigen'}</button>
          {more && (
            <ul className="recap-facts" id="recap-facts">
              {fs.map((f, i) => (
                <li key={i}>
                  <Icon name={f.icon} size={18} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {acts.length > 0 && (
        <div className="recap-acts" id="recap-acts">
          <h3>Deine Aktivitäten <small className="muted">· letzte 3 Tage</small></h3>
          <ul>
            {shown.map((a, i) => (
              <li key={i} data-act={a.kind}>
                <span className="act-day">{dayLabel(a.date, today)}</span>
                <Icon name={a.icon} size={18} />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
          {acts.length > 4 && <button type="button" className="link-btn small" id="recap-acts-more" onClick={() => setAllActs(!allActs)}>{allActs ? 'Weniger anzeigen' : `Alle ${acts.length} anzeigen`}</button>}
        </div>
      )}
    </section>
  );
}
