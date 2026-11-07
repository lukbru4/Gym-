// Übung im laufenden Training tauschen (z. B. Gerät belegt): Alternativen für dieselbe Muskelgruppe, beliebte zuerst,
// Suche versteht Stichwörter („hintere Schulter“). Im Fragebogen ausgeschlossene Übungen werden nicht angeboten.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { popularityOf } from '../lib/exerciseCatalog';
import { filterExercises, MUSCLE_NAMES, musclesOf } from '../lib/muscles';
import { avoidedNames, loadQuiz, RECOMMENDED } from '../lib/plan';
import type { Exercise } from '../lib/types';

export function SwapSheet({ current, exclude, onPick, onClose }: { current: Exercise; exclude: Set<number>; onPick: (ex: Exercise) => void; onClose: () => void }) {
  const { exercises } = useApp();
  const [q, setQ] = useState('');
  useEffect(() => {
    document.body.classList.add('picker-open');
    return () => document.body.classList.remove('picker-open');
  }, []);
  const primary = musclesOf(current)[0];
  const avoid = useMemo(() => avoidedNames(loadQuiz()?.answers ?? {}), []);
  const searching = q.trim().length > 0;
  const list = filterExercises(exercises, { query: q, type: current.type, muscles: !searching && primary ? [primary] : [] })
    .filter((e) => e.id !== current.id && !exclude.has(e.id) && !avoid.has(e.name))
    .slice(0, 120);
  const top = (e: Exercise) => RECOMMENDED.has(e.name) || popularityOf(e.name) === 1;
  const rec = list.filter(top);
  const more = list.filter((e) => !top(e));
  const row = (e: Exercise) => (
    <li key={e.id}>
      <button type="button" className="picker-item" data-swap-to={e.name} onClick={() => onPick(e)}>
        <span className="picker-name">{top(e) && <span className="pde-star" aria-label="oft empfohlen">★ </span>}{e.name}</span>
        <span className="picker-sub">{musclesOf(e).map((m) => MUSCLE_NAMES.get(m) ?? m).join(', ')}</span>
      </button>
    </li>
  );
  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="Übung tauschen" id="swap-sheet">
      <div className="picker-head">
        <h2>{current.name} tauschen</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" id="swap-close" onClick={onClose}>✕</button>
      </div>
      <input type="search" className="picker-search" id="swap-search" placeholder="Übung oder Körperstelle suchen (z. B. hintere Schulter)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="pde-body">
        {!searching && primary && <p className="muted small">Alternativen für {MUSCLE_NAMES.get(primary) ?? primary} – zum Beispiel, wenn das Gerät belegt ist.</p>}
        {rec.length > 0 && (
          <details className="pde-group" open>
            <summary className="pde-head"><span>★ Oft empfohlen</span><small className="muted">{rec.length}</small></summary>
            <ul className="picker-list pde-list">{rec.map(row)}</ul>
          </details>
        )}
        {more.length > 0 && (
          <details className="pde-group" key={String(searching)} open={searching || !rec.length || undefined}>
            <summary className="pde-head"><span>Weitere Möglichkeiten</span><small className="muted">{more.length}</small></summary>
            <ul className="picker-list pde-list">{more.map(row)}</ul>
          </details>
        )}
        {!list.length && <p className="muted small">Keine passende Übung gefunden – versuche ein anderes Wort.</p>}
        <p className="muted small">Bereits erledigte Sätze bleiben bei der alten Übung; die offenen Sätze wechseln zur neuen.</p>
      </div>
    </div>
  );
}
