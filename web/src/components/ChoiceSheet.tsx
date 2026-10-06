// Auswahl-Feld mit eigener Vollbild-Liste (Suche + Antippen) statt des Apple-Standard-Dialogs.
import { useEffect, useState } from 'react';

export interface Choice { key: string | number; label: string; sub?: string }

export function ChoiceField(props: { id: string; label: string; title: string; items: Choice[]; value: string | number; onChange: (key: string | number) => void }) {
  const [open, setOpen] = useState(false);
  const current = props.items.find((i) => i.key === props.value);
  return (
    <div className="choice-field">
      <span className="choice-label">{props.label}</span>
      <button type="button" id={props.id} className="choice-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span>{current?.label ?? '–'}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ChoiceSheet
          title={props.title}
          items={props.items}
          value={props.value}
          onClose={() => setOpen(false)}
          onPick={(k) => {
            setOpen(false);
            props.onChange(k);
          }}
        />
      )}
    </div>
  );
}

function ChoiceSheet(props: { title: string; items: Choice[]; value: string | number; onPick: (key: string | number) => void; onClose: () => void }) {
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
  const q = query.trim().toLowerCase();
  const found = q ? props.items.filter((i) => i.label.toLowerCase().includes(q)) : props.items;
  return (
    <div className="picker choice-sheet" role="dialog" aria-modal="true" aria-label={props.title}>
      <div className="picker-head">
        <h2>{props.title}</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" onClick={onClose}>✕</button>
      </div>
      <input type="search" className="picker-search" placeholder="Suchen …" aria-label="Suchen" autoComplete="off" enterKeyHint="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="picker-list">
        {found.map((i) => (
          <li key={i.key}>
            <button type="button" className="picker-item" data-key={i.key} onClick={() => props.onPick(i.key)}>
              <span className="picker-name">{i.label}</span>
              {i.sub && <span className="picker-sub">{i.sub}</span>}
              {i.key === props.value && <span className="picker-added">✓</span>}
            </button>
          </li>
        ))}
        {!found.length && <li className="muted picker-empty">Nichts gefunden.</li>}
      </ul>
    </div>
  );
}
