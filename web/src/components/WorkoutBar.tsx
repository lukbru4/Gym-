// Zeile über der unteren Leiste, solange ein Training läuft und man es verlassen hat:
// Name, Dauer, geschaffte Sätze und ggf. die laufende Pause – ein Tipp führt zurück ins Training.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useHash } from '../app/router';
import { loadDraft } from '../lib/editor';
import { fmtDuration } from '../lib/format';
import { checkRestFinished, getRest, subscribeRest } from '../lib/timer';

export function WorkoutBar() {
  const hash = useHash();
  const rest = useSyncExternalStore(subscribeRest, getRest);
  const [, tick] = useState(0);
  const draft = hash.startsWith('#/neu') ? null : loadDraft();
  const visible = Boolean(draft?.blocks.length);
  useEffect(() => {
    document.body.classList.toggle('has-workout', visible);
    if (!visible) return;
    const t = setInterval(() => {
      checkRestFinished(); // Pausen-Signal auch, wenn man gerade woanders in der App ist
      tick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [visible]);
  if (!draft || !visible) return null;
  const sets = draft.blocks.flatMap((b) => b.sets);
  const done = sets.filter((s) => s.done).length;
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endAt - Date.now()) / 1000)) : 0;
  return (
    <a className="workout-bar" id="workout-bar" href="#/neu" aria-label="Zurück zum laufenden Training">
      <span className="live-dot" aria-hidden="true" />
      <span className="wb-main">
        <strong>{draft.name || 'Training'}</strong>
        <span className="wb-sub">
          {fmtDuration((Date.now() - draft.started_at) / 1000)} · {done}/{sets.length} Sätze
        </span>
      </span>
      {restLeft > 0 && <span className="wb-rest">Pause {fmtDuration(restLeft)}</span>}
      <span className="wb-go" aria-hidden="true">›</span>
    </a>
  );
}
