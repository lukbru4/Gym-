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

export function WorkoutList({ workouts, sets, empty }: { workouts: Workout[]; sets: WorkoutSet[]; empty?: ReactNode }) {
  const { exerciseById } = useApp();
  if (!workouts.length) return <>{empty ?? null}</>;
  const byWorkout = new Map<number, WorkoutSet[]>();
  for (const s of sets) {
    if (!byWorkout.has(s.workout_id)) byWorkout.set(s.workout_id, []);
    byWorkout.get(s.workout_id)!.push(s);
  }
  return (
    <ul className="list">
      {workouts.map((w) => {
        const ws = byWorkout.get(w.id) || [];
        const names = [...new Set(ws.map((s) => exerciseById(s.exercise_id)?.name).filter(Boolean))];
        const volume = ws.reduce((sum, s) => sum + setVolume(s), 0);
        return (
          <li key={w.id}>
            <a href={`#/training/${w.id}`}>
              <strong>{fmtDate(w.date)}</strong>
              <span className="muted small">
                {plural(ws.length, 'Satz', 'Sätze')}
                {volume ? ` · ${fmt(volume, 0)} kg Volumen` : ''}
              </span>
              <span className="small">{names.join(', ') || <span className="muted">Keine Übungen</span>}</span>
            </a>
          </li>
        );
      })}
    </ul>
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
