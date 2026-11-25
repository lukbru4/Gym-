// „Heute trainierst du“: Körper von vorn und hinten mit den Muskeln der gewählten Übungen (Hauptmuskel rot, Hilfsmuskel orange).
import { BodyGraph, type Focus } from './BodyGraph';
import { MUSCLE_NAMES, musclesOf } from '../lib/muscles';
import type { Exercise, MuscleId } from '../lib/types';

export function focusOf(exercises: Pick<Exercise, 'name' | 'muscles' | 'type'>[]): { focus: Focus; sets: Map<MuscleId, number> } {
  const focus: Focus = new Map();
  const sets = new Map<MuscleId, number>();
  for (const ex of exercises) {
    if (ex.type === 'cardio') continue;
    const m = musclesOf(ex);
    m.forEach((id, i) => {
      sets.set(id, (sets.get(id) ?? 0) + 1);
      if (i === 0) focus.set(id, 'p');
      else if (!focus.has(id)) focus.set(id, 's');
    });
  }
  return { focus, sets };
}

export function WorkoutMuscles({ exercises, title = 'Heute trainierst du' }: { exercises: Pick<Exercise, 'name' | 'muscles' | 'type'>[]; title?: string }) {
  const { focus, sets } = focusOf(exercises);
  if (!focus.size) return null;
  const list = [...focus.entries()].sort((a, b) => (a[1] === b[1] ? (sets.get(b[0]) ?? 0) - (sets.get(a[0]) ?? 0) : a[1] === 'p' ? -1 : 1));
  return (
    <details className="card workout-muscles" id="workout-muscles" open>
      <summary><strong>{title}</strong> <span className="muted small">{list.map(([m]) => MUSCLE_NAMES.get(m)).slice(0, 4).join(', ')}{list.length > 4 ? ' …' : ''}</span></summary>
      <BodyGraph focus={focus} labels />
      <div className="muscle-legend" aria-label="Legende">
        <span><i className="p" />Primär</span>
        <span><i className="s" />Sekundär</span>
      </div>
      <ul className="chips-row" id="workout-muscle-list">
        {list.map(([m, role]) => (
          <li key={m} className={`chip${role === 's' ? ' secondary' : ''}`} data-muscle-chip={m}>
            {MUSCLE_NAMES.get(m)} · {sets.get(m)} {sets.get(m) === 1 ? 'Übung' : 'Übungen'}
          </li>
        ))}
      </ul>
    </details>
  );
}
