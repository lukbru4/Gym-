// Ranglisten mit Freunden: Gesamt (Credits), diese Woche, pro Übung (bestes geschätztes 1RM).
import { AvatarDot } from './AvatarDot';
import { ChoiceField } from './ChoiceSheet';
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import type { LeaderRow, Social } from '../data/social';
import { fmt, fmtShortDate, plural } from '../lib/format';

type Tab = 'total' | 'week' | 'exercise';
const TABS: [Tab, string][] = [
  ['total', 'Gesamt'],
  ['week', 'Woche'],
  ['exercise', 'Übung'],
];
const EX_KEY = 'gym-tracker-board-exercise';

interface Row { user_id: string; display_name: string; is_me: boolean; main: string; sub?: string }

function Rows({ rows, empty }: { rows: Row[]; empty: string }) {
  if (!rows.length) return <p className="muted small">{empty}</p>;
  return (
    <ol className="leaderboard">
      {rows.map((r, i) => (
        <li key={r.user_id} className={r.is_me ? 'me' : ''}>
          <span className="lb-rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
          <AvatarDot name={r.display_name} me={r.is_me} userId={r.user_id} />
          {r.is_me ? (
            <span className="lb-name">{r.display_name} (du)</span>
          ) : (
            <a className="lb-name" href={`#/freunde/profil/${r.user_id}`}>{r.display_name}</a>
          )}
          <span className="lb-week">{r.sub}</span>
          <strong className="lb-credits">{r.main}</strong>
        </li>
      ))}
    </ol>
  );
}

function WeekBoard({ social }: { social: Social }) {
  const { dataVersion } = useApp();
  const data = useAsync(() => social.weekBoard(), [social, dataVersion]);
  if (data.status === 'loading') return <p className="muted small">Lädt …</p>;
  if (data.status === 'error') return <p className="muted small">{data.error.message}</p>;
  return (
    <>
      <p className="muted small">Trainings seit Montag – bei Gleichstand zählen Arbeitssätze, dann Volumen.</p>
      <Rows
        empty="Diese Woche hat noch niemand trainiert."
        rows={data.data.map((r) => ({
          ...r,
          main: plural(r.workouts, 'Training', 'Trainings'),
          sub: `${r.sets} Sätze · ${fmt(r.volume, 0)} kg`,
        }))}
      />
    </>
  );
}

function ExerciseBoard({ social }: { social: Social }) {
  const { dataVersion } = useApp();
  const list = useAsync(() => social.exerciseList(), [social, dataVersion]);
  const [exercise, setExercise] = useState<string>(() => {
    try {
      return localStorage.getItem(EX_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const names = list.status === 'ok' ? list.data.map((e) => e.name) : [];
  // Gespeicherte Übung nicht (mehr) vorhanden → die mit den meisten Teilnehmern nehmen
  const current = names.find((n) => n.toLowerCase() === exercise.toLowerCase()) ?? names[0] ?? '';
  const board = useAsync(async () => (current ? social.exerciseBoard(current) : []), [social, current, dataVersion]);
  useEffect(() => {
    try {
      if (current) localStorage.setItem(EX_KEY, current);
    } catch {
      /* ignorieren */
    }
  }, [current]);
  if (list.status === 'loading') return <p className="muted small">Lädt …</p>;
  if (list.status === 'error') return <p className="muted small">{list.error.message}</p>;
  if (!names.length) return <p className="muted small">Sobald du oder deine Freunde Kraftübungen trainieren, gibt es hier Bestwerte.</p>;
  return (
    <>
      <ChoiceField
        id="board-exercise"
        label="Übung"
        title="Übung wählen"
        items={list.data.map((e) => ({ key: e.name, label: e.name, sub: e.people > 1 ? `${e.people} Personen` : undefined }))}
        value={current}
        onChange={(k) => setExercise(String(k))}
      />
      <p className="muted small">Bestes geschätztes Maximalgewicht (1RM nach Epley), Aufwärmsätze zählen nicht.</p>
      {board.status === 'ok' ? (
        <Rows
          empty="Noch keine Werte."
          rows={board.data.map((r) => ({
            ...r,
            main: `${fmt(r.best_e1rm)} kg`,
            sub: `${fmt(r.weight_kg, 2)} × ${r.reps} · ${fmtShortDate(r.date)}`,
          }))}
        />
      ) : (
        <p className="muted small">{board.status === 'error' ? board.error.message : 'Lädt …'}</p>
      )}
    </>
  );
}

export function Leaderboards({ social, total }: { social: Social; total: LeaderRow[] }) {
  const [tab, setTab] = useState<Tab>('total');
  return (
    <div className="card" id="leaderboards">
      <h3>Rangliste</h3>
      <nav className="seg seg-small" role="tablist" aria-label="Rangliste">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" data-board={id} aria-selected={tab === id} className={`seg-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
      {tab === 'total' && (
        <>
          <p className="muted small">Credits insgesamt (vom Server berechnet).</p>
          <Rows
            empty="Noch keine Werte."
            rows={total.map((r) => ({ ...r, main: fmt(r.credits, 0), sub: plural(r.total_workouts, 'Training', 'Trainings') }))}
          />
        </>
      )}
      {tab === 'week' && <WeekBoard social={social} />}
      {tab === 'exercise' && <ExerciseBoard social={social} />}
      {total.length <= 1 && <p className="muted small">Lade Freunde ein, um euch zu vergleichen.</p>}
    </div>
  );
}
