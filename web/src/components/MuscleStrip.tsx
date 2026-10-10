// Muskelgruppen-Leiste wie in Fitness-Bibliotheken: kleine Figur je Muskelgruppe, Antippen filtert (mehrere möglich).
import { MUSCLES, MUSCLE_NAMES } from '../lib/muscles';
import type { MuscleId } from '../lib/types';
import { BodyGraph, type Focus } from './BodyGraph';

/** Von welcher Seite der Muskel am besten zu sehen ist */
export const MUSCLE_VIEW: Record<MuscleId, 'front' | 'back'> = {
  brust: 'front', schultern: 'front', bizeps: 'front', trizeps: 'back', bauch: 'front', oberer_ruecken: 'back', lat: 'back',
  unterer_ruecken: 'back', gesaess: 'back', quadrizeps: 'front', beinbeuger: 'back', waden: 'back',
};

/** Ausschnitt je Muskelgruppe (x, y, Breite, Höhe; hinten +724): so erkennt man schon in der kleinen Kachel, welcher Muskel gemeint ist */
const B = 724;
export const MUSCLE_BOX: Record<MuscleId, [number, number, number, number]> = {
  brust: [110, 230, 500, 500], schultern: [60, 200, 600, 460], bizeps: [20, 280, 680, 520], trizeps: [B + 20, 260, 680, 520], bauch: [150, 470, 420, 420],
  oberer_ruecken: [B + 110, 190, 500, 500], lat: [B + 80, 290, 560, 520], unterer_ruecken: [B + 140, 520, 440, 400], gesaess: [B + 120, 760, 480, 420],
  quadrizeps: [90, 820, 540, 540], beinbeuger: [B + 90, 860, 540, 540], waden: [B + 90, 1090, 540, 340],
};

export function MuscleTile({ id, selected, onToggle }: { id: MuscleId; selected?: boolean; onToggle?: () => void }) {
  const focus: Focus = new Map([[id, 'p']]);
  const body = (
    <>
      <BodyGraph focus={focus} view={MUSCLE_VIEW[id]} box={MUSCLE_BOX[id]} skin={null} />
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
