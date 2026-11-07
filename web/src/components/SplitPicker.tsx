// Auswahl der Trainingspläne: je Plan die Trainingstage mit Körpergraph (welche Muskeln an dem Tag arbeiten).
import { AnatomyFigure } from './AnatomyFigure';
import { hasLegs, kindName, KIND_MARKS, SPLITS, type SplitInfo } from '../lib/splits';
import type { Kind } from '../lib/plan';

export function DayFigure({ kind, height = 120 }: { kind: Kind; height?: number }) {
  const upper = !hasLegs(kind);
  const h = upper ? height : height * 1.25;
  return (
    <figure className="split-day" data-kind={kind}>
      <div className="split-figs">
        <AnatomyFigure side="front" marks={KIND_MARKS[kind]} upper={upper} height={h} />
        <AnatomyFigure side="back" marks={KIND_MARKS[kind]} upper={upper} height={h} />
      </div>
      <figcaption>{kindName(kind)}</figcaption>
    </figure>
  );
}

export function SplitCard({ split, on, onPick }: { split: SplitInfo; on: boolean; onPick: () => void }) {
  return (
    <button type="button" className={`split-card${on ? ' on' : ''}`} data-split={split.id} aria-pressed={on} onClick={onPick}>
      <span className="split-head"><strong>{split.name}</strong><small>{split.days}</small></span>
      <span className="split-text">{split.text}</span>
      <span className="split-days">{split.kinds.map((k) => <DayFigure key={k} kind={k} />)}</span>
    </button>
  );
}

export function SplitPicker({ value, onPick }: { value: string | undefined; onPick: (id: string) => void }) {
  return (
    <div className="split-list" id="split-list">
      <button type="button" className={`ob-card${value === 'auto' ? ' on' : ''}`} data-split="auto" aria-pressed={value === 'auto'} onClick={() => onPick('auto')}>
        <span><strong>Automatisch (empfohlen)</strong><small>Wir wählen passend zu deinen Tagen und deiner Erfahrung.</small></span>
      </button>
      {SPLITS.map((s) => <SplitCard key={s.id} split={s} on={value === s.id} onPick={() => onPick(s.id)} />)}
      <p className="muted small">Orange = Hauptmuskeln, Gelb = Hilfsmuskeln. Links von vorne, rechts von hinten.</p>
    </div>
  );
}
