// Übungsauswahl als eigene Vollbild-Seite: Suche + Kategorien (Brust, Rücken, …).
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { CATEGORIES, MUSCLES, MUSCLE_NAMES, filterExercises, musclesOf, type CategoryId, type TypeFilter } from '../lib/muscles';
import type { MuscleId } from '../lib/types';
import { keywordsOf } from '../lib/exerciseCatalog';
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
  const [type, setType] = useState<TypeFilter>('alle');
  const [muscles, setMuscles] = useState<MuscleId[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const toggleMuscle = (m: MuscleId) => setMuscles((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const activeFilters = muscles.length + (type !== 'alle' ? 1 : 0);
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

  const found = filterExercises(exercises, { query, category, type, muscles });
  const muscleText = (ex: Exercise) =>
    ex.type === 'cardio' ? 'Cardio' : musclesOf(ex).map((m) => MUSCLE_NAMES.get(m)).join(', ') || 'Keine Muskeln zugeordnet';
  const q = query.trim();
  // Bei der Suche zeigen, unter welchem Stichwort (z. B. „Preacher Curl Maschine“) die Übung gefunden wurde
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const alias = (ex: Exercise) => {
    if (!words.length) return '';
    const name = ex.name.toLowerCase();
    if (words.every((w) => name.includes(w))) return '';
    const hit = keywordsOf(ex.name).split(', ').find((k) => words.every((w) => k.toLowerCase().includes(w)));
    return hit ? `auch: ${hit}` : '';
  };

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
      <div className="picker-filter">
        <button type="button" className="btn small-btn" id="filter-toggle" aria-expanded={filterOpen} onClick={() => setFilterOpen((o) => !o)}>
          Filter{activeFilters ? ` (${activeFilters})` : ''} {filterOpen ? '▴' : '▾'}
        </button>
        {activeFilters > 0 && <button type="button" className="linklike" id="filter-reset" onClick={() => { setType('alle'); setMuscles([]); }}>zurücksetzen</button>}
        <span className="muted small" id="filter-count">{found.length} Übungen</span>
      </div>
      {filterOpen && (
        <div className="picker-filter-panel" id="filter-panel">
          <p className="muted small">Art</p>
          <div className="picker-cats" role="group" aria-label="Art">
            {([['alle', 'Alle'], ['strength', 'Kraft'], ['cardio', 'Cardio']] as const).map(([id, label]) => (
              <button key={id} type="button" className="picker-cat" data-type={id} aria-selected={type === id} onClick={() => setType(id)}>{label}</button>
            ))}
          </div>
          <p className="muted small">Muskelgruppen (mehrere möglich)</p>
          <div className="picker-cats wrap" role="group" aria-label="Muskelgruppen">
            {MUSCLES.map(([id, label]) => (
              <button key={id} type="button" className="picker-cat" data-muscle={id} aria-selected={muscles.includes(id)} aria-pressed={muscles.includes(id)} onClick={() => toggleMuscle(id)}>{label}</button>
            ))}
          </div>
        </div>
      )}
      <ul className="picker-list">
        {found.map((ex) => (
          <li key={ex.id}>
            <button type="button" className="picker-item" data-id={ex.id} onClick={() => props.onPick(ex)}>
              <span className="picker-name">
                {ex.name}
                {ex.user_id && <span className="muted"> ★</span>}
              </span>
              <span className="picker-sub">{muscleText(ex)}{alias(ex) && <> · <em>{alias(ex)}</em></>}</span>
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
