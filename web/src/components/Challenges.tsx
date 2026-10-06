// Challenges mit Freunden: herausfordern, annehmen/ablehnen, Punktestand, Ergebnis mit Bonus-Credits.
import { ChoiceField } from './ChoiceSheet';
import { useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import type { Challenge, ChallengeMetric, Friend, Social } from '../data/social';
import { fmt, fmtShortDate } from '../lib/format';
import { todayISO } from '../lib/stats';

export const METRICS: [ChallengeMetric, string, string][] = [
  ['workouts', 'Trainings', 'Wer trainiert öfter?'],
  ['sets', 'Arbeitssätze', 'Wer schafft mehr Sätze?'],
  ['volume', 'Volumen (kg)', 'Wer bewegt mehr Gewicht?'],
];
const metricLabel = (m: ChallengeMetric) => METRICS.find(([id]) => id === m)![1];
const score = (m: ChallengeMetric, v: number) => (m === 'volume' ? `${fmt(v, 0)} kg` : fmt(v, 0));

function daysLeft(end: string | null) {
  if (!end) return '';
  const ms = Date.parse(end) - Date.parse(todayISO());
  const d = Math.round(ms / 864e5) + 1; // inkl. heute
  return d <= 1 ? 'letzter Tag' : `noch ${d} Tage`;
}

function ChallengeItem({ c, social, onChange }: { c: Challenge; social: Social; onChange: () => void }) {
  const { showError } = useApp();
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      onChange();
    } catch (err) {
      showError(err);
    }
  };
  const total = Number(c.my_score) + Number(c.their_score);
  const share = total > 0 ? Math.round((Number(c.my_score) / total) * 100) : 50;
  const result = { won: `🏆 Gewonnen! +${c.bonus} Credits`, lost: 'Verloren – nächstes Mal!', tie: c.bonus ? `Unentschieden – +${c.bonus} Credits` : 'Unentschieden' };
  return (
    <li className={`challenge ${c.state}`} data-challenge={c.id}>
      <div className="block-head">
        <strong>
          {metricLabel(c.metric)} gegen {c.other_name}
        </strong>
        <span className="muted small">
          {c.state === 'running' ? daysLeft(c.end_date) : c.end_date ? `bis ${fmtShortDate(c.end_date)}` : '7 Tage'}
        </span>
      </div>
      {c.state === 'incoming' && (
        <div className="row">
          <button className="btn small-btn primary grow" onClick={() => act(() => social.respondChallenge(c.id, true))}>Annehmen</button>
          <button className="btn small-btn grow" onClick={() => act(() => social.respondChallenge(c.id, false))}>Ablehnen</button>
        </div>
      )}
      {c.state === 'outgoing' && (
        <p className="small muted">
          Wartet auf {c.other_name}.{' '}
          <button className="link small" onClick={() => act(() => social.cancelChallenge(c.id))}>Zurückziehen</button>
        </p>
      )}
      {(c.state === 'running' || c.state === 'won' || c.state === 'lost' || c.state === 'tie') && (
        <>
          <div className="vs">
            <span>Du <strong>{score(c.metric, Number(c.my_score))}</strong></span>
            <span>
              <strong>{score(c.metric, Number(c.their_score))}</strong> {c.other_name}
            </span>
          </div>
          <div className="vs-bar" role="img" aria-label={`Du ${c.my_score}, ${c.other_name} ${c.their_score}`}>
            <span style={{ width: `${share}%` }} />
          </div>
          {c.state !== 'running' && <p className={`challenge-result ${c.state}`}>{result[c.state]}</p>}
        </>
      )}
    </li>
  );
}

export function Challenges({ social, friends }: { social: Social; friends: Friend[] }) {
  const { showError, dataVersion, dataChanged } = useApp();
  const list = useAsync(() => social.challenges(), [social, dataVersion]);
  const [open, setOpen] = useState(false);
  const accepted = friends.filter((f) => f.status === 'friend');
  const [opponent, setOpponent] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('workouts');
  const [busy, setBusy] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const who = opponent || accepted[0]?.user_id;
    if (!who) return;
    setBusy(true);
    try {
      await social.createChallenge(who, metric);
      setOpen(false);
      dataChanged();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" id="challenges">
      <div className="block-head">
        <h3>Challenges</h3>
      </div>
      <p className="muted small">7 Tage ab Annahme. Gewinner bekommt +50 Credits, bei Gleichstand beide +25.</p>
      {accepted.length > 0 && !open && (
        <button className="btn primary block battle-btn" id="new-challenge" onClick={() => setOpen(true)}>
          <span aria-hidden="true">⚔️</span> Freund herausfordern
        </button>
      )}
      {open && (
        <form className="challenge-form" onSubmit={create}>
          <ChoiceField
            id="challenge-opponent"
            label="Wen?"
            title="Freund wählen"
            items={accepted.map((f) => ({ key: f.user_id, label: f.display_name }))}
            value={opponent || accepted[0]?.user_id}
            onChange={(k) => setOpponent(String(k))}
          />
          <fieldset className="metric-choice">
            <legend className="small">Worum geht es?</legend>
            {METRICS.map(([id, label, hint]) => (
              <label key={id} className={`metric-option${metric === id ? ' on' : ''}`}>
                <input type="radio" name="metric" value={id} checked={metric === id} onChange={() => setMetric(id)} />
                <strong>{label}</strong>
                <span className="muted small">{hint}</span>
              </label>
            ))}
          </fieldset>
          <div className="row">
            <button className="btn primary grow" type="submit" disabled={busy}>Challenge senden</button>
            <button className="btn" type="button" onClick={() => setOpen(false)}>Abbrechen</button>
          </div>
        </form>
      )}
      {list.status === 'loading' && <p className="muted small">Lädt …</p>}
      {list.status === 'error' && <p className="muted small">{list.error.message}</p>}
      {list.status === 'ok' &&
        (list.data.length ? (
          <ul className="challenge-list">
            {list.data.map((c) => (
              <ChallengeItem key={c.id} c={c} social={social} onChange={dataChanged} />
            ))}
          </ul>
        ) : (
          <p className="muted small">
            {accepted.length ? 'Noch keine Challenge – fordere einen Freund heraus!' : 'Sobald du Freunde hast, kannst du sie herausfordern.'}
          </p>
        ))}
    </div>
  );
}
