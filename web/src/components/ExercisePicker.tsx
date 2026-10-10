// Übungsauswahl als eigene Vollbild-Seite: Suche + Kategorien (Brust, Rücken, …).
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { EQUIPMENT, MUSCLE_NAMES, filterExercises, musclesOf, type EquipmentId } from '../lib/muscles';
import type { MuscleId } from '../lib/types';
import { keywordsOf } from '../lib/exerciseCatalog';
import type { Exercise } from '../lib/types';
import { ExerciseInfo } from './ExerciseInfo';
import { MuscleStrip } from './MuscleStrip';
import { ExerciseThumb } from './ExerciseThumb';

export function ExercisePicker(props: {
  added: Set<number>;
  onPick: (ex: Exercise) => void;
  onNew: (name: string) => void;
  onClose: () => void;
}) {
  const { exercises } = useApp();
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<EquipmentId | null>(null);
  const [muscles, setMuscles] = useState<MuscleId[]>([]);
  const [info, setInfo] = useState<Exercise | null>(null);
  // Immer nur eine Muskelgruppe: das zuletzt Angetippte gilt, nochmal antippen hebt auf
  const toggleMuscle = (m: MuscleId) => setMuscles((cur) => (cur[0] === m ? [] : [m]));
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

  const found = filterExercises(exercises, { query, muscles, equipment });
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
      <div className="picker-cats equip" role="group" aria-label="Gerät">
        {EQUIPMENT.map(([id, label]) => (
          <button key={id} type="button" className="picker-cat" data-equip={id} aria-pressed={equipment === id} aria-selected={equipment === id} onClick={() => setEquipment((cur) => (cur === id ? null : id))}>
            {label}
          </button>
        ))}
      </div>
      <MuscleStrip selected={muscles} onToggle={toggleMuscle} />
      <p className="muted small" id="filter-count">{found.length} Übungen</p>
      {info && <ExerciseInfo ex={info} onClose={() => setInfo(null)} />}
      <ul className="picker-list cards">
        {found.map((ex) => (
          <li key={ex.id}>
            <button type="button" className="picker-item" data-id={ex.id} onClick={() => props.onPick(ex)}>
              <ExerciseThumb name={ex.name} muscles={musclesOf(ex)} />
              <span className="picker-name">
                {ex.name}
                {ex.user_id && <span className="muted"> ★</span>}
              </span>
              <span className="picker-sub">{muscleText(ex)}{alias(ex) && <> · <em>{alias(ex)}</em></>}</span>
              {props.added.has(ex.id) && <span className="picker-added">✓ drin</span>}
            </button>
            <button type="button" className="picker-info" data-info={ex.id} aria-label={`Anleitung und Animation: ${ex.name}`} onClick={() => setInfo(ex)}>▶</button>
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
