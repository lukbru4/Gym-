// Übungsauswahl als eigene Vollbild-Seite: Suche + Kategorien (Brust, Rücken, …).
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { CATEGORIES, MUSCLE_NAMES, filterExercises, musclesOf, type CategoryId } from '../lib/muscles';
import type { Exercise } from '../lib/types';

export function ExercisePicker(props: {
  added: Set<number>;
  onPick: (ex: Exercise) => void;
  onNew: (name: string) => void;
  onClose: () => void;
}) {
  const { exercises } = useApp();
  const [category, setCategory] = useState<CategoryId>('alle');
  const [query, setQuery] = useState('');
  const { onClose } = props;

  useEffect(() => {
    document.body.classList.add('picker-open');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('picker-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const found = filterExercises(exercises, { query, category });
  const muscleText = (ex: Exercise) =>
    ex.type === 'cardio' ? 'Cardio' : musclesOf(ex).map((m) => MUSCLE_NAMES.get(m)).join(', ') || 'Keine Muskeln zugeordnet';
  const q = query.trim();

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="Übung wählen">
      <div className="picker-head">
        <h2>Übung wählen</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" onClick={onClose}>
          ✕
        </button>
      </div>
      <input
        type="search"
        className="picker-search"
        placeholder="Übung suchen …"
        aria-label="Übung suchen"
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="picker-cats" role="tablist" aria-label="Kategorie">
        {CATEGORIES.map(([id, label]) => (
          <button key={id} type="button" className="picker-cat" role="tab" data-cat={id} aria-selected={category === id} onClick={() => setCategory(id)}>
            {label}
          </button>
        ))}
      </div>
      <ul className="picker-list">
        {found.map((ex) => (
          <li key={ex.id}>
            <button type="button" className="picker-item" data-id={ex.id} onClick={() => props.onPick(ex)}>
              <span className="picker-name">
                {ex.name}
                {ex.user_id && <span className="muted"> ★</span>}
              </span>
              <span className="picker-sub">{muscleText(ex)}</span>
              {props.added.has(ex.id) && <span className="picker-added">✓ drin</span>}
            </button>
          </li>
        ))}
        {!found.length && <li className="muted picker-empty">Keine Übung gefunden.</li>}
        <li>
          <button type="button" className="picker-item picker-new" data-new onClick={() => props.onNew(q)}>
            <span className="picker-name">+ {q ? `„${q}“ als eigene Übung anlegen` : 'Eigene Übung anlegen'}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
