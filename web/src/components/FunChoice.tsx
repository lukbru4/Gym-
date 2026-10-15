// Auswahl, was man sammeln möchte: Mein Gym, das Abenteuer (Ei) oder beides – bei der Begrüßung, auf der Startseite und in den Einstellungen.
import type { FunMode } from '../lib/onboarding';

export const FUN_OPTIONS: { id: FunMode; icon: string; title: string; text: string }[] = [
  { id: 'gym', icon: '🏋️', title: 'Mein Gym', text: 'Mit deinen Sätzen Steine zerschlagen, Geräte finden und dein eigenes Gym einrichten.' },
  { id: 'ei', icon: '🥚', title: 'Abenteuer', text: 'Ein Begleiter schlüpft aus dem Ei, wächst mit deinem Training und reist mit dir um die Welt.' },
  { id: 'beides', icon: '✨', title: 'Beides', text: 'Gym und Abenteuer gleichzeitig – beides läuft mit denselben Trainings.' },
];

export function FunChoice({ value, onPick }: { value: FunMode | null; onPick: (m: FunMode) => void }) {
  return (
    <div className="fun-choice" role="radiogroup" aria-label="Was möchtest du sammeln?">
      {FUN_OPTIONS.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={`fun-option${value === o.id ? ' active' : ''}`} data-fun={o.id} onClick={() => onPick(o.id)}>
          <span className="fun-icon" aria-hidden="true">{o.icon}</span>
          <span><strong>{o.title}</strong><small>{o.text}</small></span>
        </button>
      ))}
    </div>
  );
}
