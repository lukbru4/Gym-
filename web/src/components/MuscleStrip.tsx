// Muskelgruppen-Leiste wie in Fitness-Bibliotheken: kleine Figur je Muskelgruppe, Antippen filtert (mehrere möglich).
import { MUSCLES, MUSCLE_NAMES } from '../lib/muscles';
import type { MuscleId } from '../lib/types';
import { BodyGraph, type Focus } from './BodyGraph';

/** Von welcher Seite der Muskel am besten zu sehen ist */
export const MUSCLE_VIEW: Record<MuscleId, 'front' | 'back'> = {
  brust: 'front', schultern: 'front', bizeps: 'front', trizeps: 'back', bauch: 'front', oberer_ruecken: 'back', lat: 'back',
  unterer_ruecken: 'back', gesaess: 'back', quadrizeps: 'front', beinbeuger: 'back', waden: 'back',
};

export function MuscleTile({ id, selected, onToggle }: { id: MuscleId; selected?: boolean; onToggle?: () => void }) {
  const focus: Focus = new Map([[id, 'p']]);
  const body = (
    <>
      <BodyGraph focus={focus} view={MUSCLE_VIEW[id]} simple skin={null} />
      <span className="muscle-tile-name">{MUSCLE_NAMES.get(id)}</span>
    </>
  );
  if (!onToggle) return <div className="muscle-tile static">{body}</div>;
  return (
    <button type="button" className={`muscle-tile${selected ? ' on' : ''}`} data-muscle={id} aria-pressed={selected} aria-selected={selected} onClick={onToggle}>
      {body}
    </button>
  );
}

export function MuscleStrip({ selected, onToggle }: { selected: MuscleId[]; onToggle: (m: MuscleId) => void }) {
  return (
    <div className="muscle-strip" role="group" aria-label="Muskelgruppen (mehrere möglich)">
      {MUSCLES.map(([id]) => (
        <MuscleTile key={id} id={id} selected={selected.includes(id)} onToggle={() => onToggle(id)} />
      ))}
    </div>
  );
}
