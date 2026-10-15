// Profil-Karten: Stärkeziel (Ring), Letzte 7 Tage (Körperfigur + Balken), Serien (Wochenkreise), Level.
import { useState } from 'react';
import { useApp } from '../app/context';
import type { Game } from '../app/game';
import { fmt } from '../lib/format';
import { getStrengthGoal, setStrengthGoal, useStrengthGoal } from '../lib/strengthGoal';
import { addDays, isWorkingSet, setVolume, weekStart } from '../lib/stats';
import { BodyGraph } from './BodyGraph';
import { LevelBar } from './Bits';
import { pickNumber } from './NumberPicker';
import { focusOf } from './WorkoutMuscles';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function StrengthGoalCard({ g }: { g: Game }) {
  const { exerciseById } = useApp();
  useStrengthGoal();
  const goal = getStrengthGoal();
  const top = [...g.strength].sort((a, b) => b[1].xp - a[1].xp)[0];
  const exId = goal?.exerciseId ?? top?.[0];
  const ex = exId ? exerciseById(exId) : undefined;
  const best = g.strength.find(([id]) => id === exId)?.[1].best ?? 0;
  if (!ex) return null;
  const setGoal = async () => {
    const v = await pickNumber({ title: `Ziel-1RM: ${ex.name}`, unit: 'kg', value: String(goal?.kg ?? Math.max(20, Math.ceil((best + 5) / 2.5) * 2.5)), min: 10, max: 400, step: 0.5, bigStep: 2.5, itemW: 10, labelEvery: 10 });
    if (v !== null) setStrengthGoal({ exerciseId: ex.id, kg: Number(v.replace(',', '.')) });
  };
  const pct = goal ? Math.max(0, Math.min(100, Math.round((best / goal.kg) * 100))) : 0;
  const R = 52, C = Math.PI * R; // Halbkreis
  return (
    <div className="card strength-goal" id="strength-goal">
      <div className="block-head"><h3>Stärkeziel</h3><button type="button" className="linklike" id="goal-set" onClick={setGoal}>{goal ? 'Ändern' : 'Ziel setzen'}</button></div>
      <div className="sg-body">
        <div>
          <p className="muted small">{ex.name} · 1RM</p>
          <strong className="sg-num">{best ? `${fmt(best)} kg` : '–'}</strong>
          {goal && <p className="muted small">Ziel {fmt(goal.kg)} kg</p>}
        </div>
        <svg viewBox="0 0 130 80" className="sg-ring" role="img" aria-label={goal ? `${pct} % des Ziels` : 'Noch kein Ziel'}>
          <path d="M13 70 A52 52 0 0 1 117 70" fill="none" stroke="var(--border)" strokeWidth="12" strokeLinecap="round" />
          {goal && <path d="M13 70 A52 52 0 0 1 117 70" fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(C * pct) / 100} ${C}`} />}
          <text x="65" y="66" textAnchor="middle" className="sg-pct">{goal ? `${pct}%` : '–'}</text>
        </svg>
      </div>
      {!goal && <p className="muted small">Setze dir ein Ziel für dein geschätztes 1RM – der Ring zeigt, wie nah du dran bist.</p>}
    </div>
  );
}

type Metric = 'volume' | 'reps' | 'cardio';

export function LastDaysCard({ g }: { g: Game }) {
  const { exerciseById } = useApp();
  const [metric, setMetric] = useState<Metric>('volume');
  const from = addDays(g.today, -6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const wk = g.workouts.filter((w) => w.date >= from && w.date <= g.today);
  const ids = new Set(wk.map((w) => w.id));
  const sets = g.sets.filter((s) => ids.has(s.workout_id));
  const dateOf = new Map(wk.map((w) => [w.id, w.date]));
  const value = (day: string) => {
    let v = 0;
    for (const s of sets) {
      if (dateOf.get(s.workout_id) !== day || !isWorkingSet(s)) continue;
      if (metric === 'volume') v += setVolume(s);
      else if (metric === 'reps') v += Number(s.reps) || 0;
      else v += Number(s.duration_min) || 0;
    }
    return v;
  };
  const vals = days.map(value);
  const max = Math.max(1, ...vals);
  const total = vals.reduce((a, b) => a + b, 0);
  const exs = [...new Set(sets.map((s) => s.exercise_id))].map((id) => exerciseById(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));
  const { focus } = focusOf(exs);
  const unit = metric === 'volume' ? 'kg' : metric === 'reps' ? 'Wdh.' : 'min';
  return (
    <div className="card last-days" id="last-days">
      <div className="block-head"><h3>Letzte 7 Tage</h3><a href="#/koerper" className="small">Körpergraph ›</a></div>
      <BodyGraph focus={focus} />
      <div className="seg-tabs" role="tablist" aria-label="Wert">
        {([['volume', 'Volumen'], ['reps', 'Wdh.'], ['cardio', 'Cardio']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" data-metric={id} aria-selected={metric === id} className="picker-cat" onClick={() => setMetric(id)}>{label}</button>
        ))}
      </div>
      <p className="muted small"><strong>{fmt(total, 0)} {unit}</strong> in 7 Tagen</p>
      <div className="day-bars" aria-hidden="true">
        {days.map((d, i) => (
          <div key={d} className="day-bar"><span style={{ height: `${Math.round((vals[i] / max) * 100)}%` }} /><small>{DAYS[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7]}</small></div>
        ))}
      </div>
      {!total && <p className="muted small">Keine Daten in diesem Zeitraum.</p>}
    </div>
  );
}

export function StreakCard({ g }: { g: Game }) {
  const start = weekStart(g.today);
  const done = new Set(g.workouts.map((w) => w.date));
  return (
    <div className="card streak-card" id="streak-card">
      <div className="block-head"><h3>Serien</h3><span className="small">🔥 {g.streak} Tage</span></div>
      <div className="week-circles">
        {DAYS.map((d, i) => {
          const day = addDays(start, i);
          return <div key={d} className={`wc${done.has(day) ? ' on' : ''}${day === g.today ? ' today' : ''}`}><small>{d}</small><span aria-hidden="true">{done.has(day) ? '✓' : ''}</span></div>;
        })}
      </div>
      <p className="muted small">Wochenziel: {g.weekDone} von {g.weekGoal} Trainingstagen diese Woche.</p>
    </div>
  );
}

export function LevelCard({ g }: { g: Game }) {
  return (
    <div className="card level-card" id="level-card">
      <h3>Level</h3>
      <div className="lc-row"><span className="lc-hex" aria-hidden="true">{g.player.level}</span><div className="lc-bar"><LevelBar l={g.player} unit="Credits" /></div></div>
      <p className="muted small">{fmt(g.credits, 0)} Credits gesamt</p>
    </div>
  );
}
