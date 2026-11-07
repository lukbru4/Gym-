// Kleine wiederkehrende Bausteine: Aufgabenliste, Level-Balken, Regel-Texte, Muskel-Auswahl, Trainingsliste.
import type { ReactNode } from 'react';
import { useApp } from '../app/context';
import { fmt, fmtDate, plural } from '../lib/format';
import { MUSCLES } from '../lib/muscles';
import type { QuestStatus } from '../lib/quests';
import { TIERS } from '../lib/ranks';
import { setVolume } from '../lib/stats';
import type { MuscleId, Workout, WorkoutSet } from '../lib/types';
import { KG_PER_WEIGHT_LEVEL, RULES, type LevelInfo } from '../lib/xp';

export function ProgressBar({ value, max, label, className = 'xp-bar' }: { value: number; max: number; label: string; className?: string }) {
  return (
    <span className={className} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${Math.min(100, Math.round((value / max) * 100))}%` }} />
    </span>
  );
}

export function QuestRows({ list }: { list: QuestStatus[] }) {
  return (
    <ul className="quest-list">
      {list.map((q) => (
        <li key={q.id} className={q.done ? 'done' : ''}>
          <span className="quest-check" aria-hidden="true">{q.done ? '✓' : ''}</span>
          <span className="quest-main">
            <span className="quest-label">{q.label}</span>
            <ProgressBar value={q.value} max={q.goal} label={`${q.label}: ${q.value} von ${q.goal}`} />
          </span>
          <span className="quest-reward">+{q.reward}</span>
        </li>
      ))}
    </ul>
  );
}

export function LevelBar({ l, unit }: { l: LevelInfo; unit: string }) {
  return (
    <>
      <ProgressBar value={l.into} max={l.needed} label={`${l.into} von ${l.needed} ${unit} bis Level ${l.level + 1}`} />
      <span className="xp-hint">
        {fmt(l.into, 0)} / {fmt(l.needed, 0)} {unit} bis Level {l.level + 1}
      </span>
    </>
  );
}

export const CreditsRules = () => (
  <details className="rules">
    <summary>Wie bekomme ich Credits?</summary>
    <ul>
      <li>+{RULES.workout} pro Training</li>
      <li>+{RULES.set} pro Arbeitssatz (Aufwärmsätze zählen nicht)</li>
      <li>+{RULES.improvement} pro Übung, die stärker ist als beim letzten Mal (geschätztes 1RM)</li>
      <li>+{RULES.record} zusätzlich für einen neuen Rekord bei einer Übung</li>
    </ul>
    <p>
      Jedes Level braucht etwas mehr Credits als das vorige. Übungs-Level steigen, je öfter du eine Übung machst und je häufiger du
      dich dabei steigerst. Das Gewichts-Level zeigt, wie schwer du bewegst: 1 Level pro {KG_PER_WEIGHT_LEVEL} kg geschätztem
      Maximalgewicht.
    </p>
  </details>
);

export const RankRules = () => (
  <details className="rules">
    <summary>Wie funktionieren Ränge?</summary>
    <p>
      Jede Übung sammelt Rang-Punkte: +10 pro Training mit der Übung, +10 wenn du stärker warst als beim letzten Mal (geschätztes 1RM)
      und +15 für einen neuen Rekord. Der Rang zeigt also deinen eigenen Fortschritt, keinen Vergleich mit anderen. Stufen:{' '}
      {TIERS.map((t) => t.name).join(' → ')}, jeweils III → II → I. Der Gesamt-Rang ist der Schnitt deiner 5 besten Übungen.
    </p>
  </details>
);

export function MuscleChips({ selected, onChange }: { selected: MuscleId[]; onChange: (list: MuscleId[]) => void }) {
  return (
    <fieldset className="chips">
      <legend className="small muted">Hauptmuskeln (für den Körpergraphen)</legend>
      {MUSCLES.map(([id, label]) => (
        <label key={id} className="chip">
          <input
            type="checkbox"
            name="muscle"
            value={id}
            checked={selected.includes(id)}
            onChange={(e) => onChange(e.target.checked ? [...selected, id] : selected.filter((m) => m !== id))}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

interface WorkoutRow { w: Workout; sets: number; volume: number; names: string[]; cardioMin: number }

function rowsFor(workouts: Workout[], sets: WorkoutSet[], nameOf: (id: number) => string | undefined): WorkoutRow[] {
  const byWorkout = new Map<number, WorkoutSet[]>();
  for (const s of sets) {
    if (!byWorkout.has(s.workout_id)) byWorkout.set(s.workout_id, []);
    byWorkout.get(s.workout_id)!.push(s);
  }
  return workouts.map((w) => {
    const ws = byWorkout.get(w.id) || [];
    return {
      w,
      sets: ws.length,
      volume: ws.reduce((sum, s) => sum + setVolume(s), 0),
      names: [...new Set(ws.map((s) => nameOf(s.exercise_id)).filter((n): n is string => Boolean(n)))],
      cardioMin: ws.reduce((sum, s) => sum + (Number(s.duration_min) || 0), 0),
    };
  });
}

function WorkoutCard({ row }: { row: WorkoutRow }) {
  const d = new Date(`${row.w.date}T12:00:00`);
  const shown = row.names.slice(0, 3);
  return (
    <a className="wk-card" href={`#/training/${row.w.id}`}>
      <span className="wk-date" aria-hidden="true">
        <strong>{String(d.getDate()).padStart(2, '0')}</strong>
        <small>{WEEKDAYS_SHORT[d.getDay()]} · {MONTHS_SHORT[d.getMonth()]}</small>
      </span>
      <span className="wk-main">
        <span className="wk-names" aria-label={fmtDate(row.w.date)}>
          {shown.length ? shown.join(' · ') : <span className="muted">Keine Übungen</span>}
          {row.names.length > shown.length && <span className="muted"> · +{row.names.length - shown.length}</span>}
        </span>
        <span className="wk-chips">
          <i>{plural(row.sets, 'Satz', 'Sätze')}</i>
          {row.volume > 0 && <i>{fmt(row.volume, 0)} kg</i>}
          {row.cardioMin > 0 && <i>{fmt(row.cardioMin, 0)} Min.</i>}
        </span>
      </span>
      <span className="wk-chev" aria-hidden="true">›</span>
    </a>
  );
}

/** Trainingskarten; mit `grouped` nach Monaten sortiert, jeweils mit Monatssumme (Verlauf) */
export function WorkoutList({ workouts, sets, empty, grouped = false }: { workouts: Workout[]; sets: WorkoutSet[]; empty?: ReactNode; grouped?: boolean }) {
  const { exerciseById } = useApp();
  if (!workouts.length) return <>{empty ?? null}</>;
  const rows = rowsFor(workouts, sets, (id) => exerciseById(id)?.name);
  if (!grouped)
    return (
      <ul className="wk-list">
        {rows.map((r) => <li key={r.w.id}><WorkoutCard row={r} /></li>)}
      </ul>
    );
  const months: { key: string; label: string; rows: WorkoutRow[] }[] = [];
  for (const r of rows) {
    const key = r.w.date.slice(0, 7);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, rows: [] };
      months.push(m);
    }
    m.rows.push(r);
  }
  return (
    <>
      {months.map((m) => (
        <section key={m.key} className="wk-month" data-month={m.key}>
          <div className="wk-month-head">
            <h3>{m.label}</h3>
            <span className="muted small">
              {plural(m.rows.length, 'Training', 'Trainings')}
              {m.rows.some((r) => r.volume > 0) ? ` · ${fmt(m.rows.reduce((n, r) => n + r.volume, 0), 0)} kg` : ''}
            </span>
          </div>
          <ul className="wk-list">
            {m.rows.map((r) => <li key={r.w.id}><WorkoutCard row={r} /></li>)}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Lade-/Fehleranzeige für Seiten */
export const Loading = () => <p className="muted center">Lädt …</p>;
export const LoadError = ({ error }: { error: Error }) => (
  <div className="card">
    <p>Konnte die Daten nicht laden.</p>
    <p className="muted">{error.message}</p>
  </div>
);
