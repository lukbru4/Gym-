// Auswahl-Feld mit eigener Vollbild-Liste (Suche + Antippen) statt des Apple-Standard-Dialogs.
import { useEffect, useRef, useState } from 'react';
import { Haptics } from '@capacitor/haptics';
import { isNative } from '../lib/platform';

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

const ITEM_H = 52;
const VISIBLE = 5;

/** Kasten mit senkrechter Wisch-Liste: Pfeil ▶ zeigt auf den gewählten Eintrag, Suche oben. */
function ChoiceSheet(props: { title: string; items: Choice[]; value: string | number; onPick: (key: string | number) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const found = q ? props.items.filter((i) => i.label.toLowerCase().includes(q)) : props.items;
  const [idx, setIdx] = useState(() => Math.max(0, props.items.findIndex((i) => i.key === props.value)));
  const list = useRef<HTMLUListElement>(null);
  const programmatic = useRef(false);
  const { onClose } = props;
  const current = found[Math.min(idx, found.length - 1)];

  const scrollToIdx = (i: number, smooth: boolean) => {
    const el = list.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    setTimeout(() => (programmatic.current = false), smooth ? 350 : 30);
  };
  useEffect(() => {
    scrollToIdx(idx, false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onScroll = () => {
    const el = list.current;
    if (!el || programmatic.current) return;
    const i = Math.max(0, Math.min(found.length - 1, Math.round(el.scrollTop / ITEM_H)));
    if (i !== idx) {
      setIdx(i);
      if (isNative) Haptics.selectionChanged().catch(() => {});
    }
  };
  const search = (v: string) => {
    setQuery(v);
    setIdx(0);
    requestAnimationFrame(() => scrollToIdx(0, false));
  };
  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog choice-wheel" role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="picker-title">{props.title}</div>
        <input type="search" className="choice-search" placeholder="Suchen …" aria-label="Suchen" autoComplete="off" enterKeyHint="search" value={query} onChange={(e) => search(e.target.value)} />
        <div className="wheel-wrap" style={{ height: VISIBLE * ITEM_H }}>
          <div className="wheel-band" style={{ top: pad, height: ITEM_H }} aria-hidden="true">
            <span className="wheel-arrow">▶</span>
          </div>
          <ul className="wheel-list" ref={list} onScroll={onScroll} style={{ paddingTop: pad, paddingBottom: pad }}>
            {found.map((i, n) => (
              <li key={i.key} style={{ height: ITEM_H }}>
                <button
                  type="button"
                  className={`wheel-item${n === idx ? ' on' : ''}`}
                  data-key={i.key}
                  onClick={() => (n === idx ? props.onPick(i.key) : (setIdx(n), scrollToIdx(n, true)))}
                >
                  <span className="wheel-name">{i.label}</span>
                  {i.sub && <span className="wheel-sub">{i.sub}</span>}
                </button>
              </li>
            ))}
            {!found.length && <li className="muted wheel-empty">Nichts gefunden.</li>}
          </ul>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" id="choice-cancel" onClick={onClose}>Abbrechen</button>
          <button type="button" className="btn primary" id="choice-ok" disabled={!current} onClick={() => current && props.onPick(current.key)}>Übernehmen</button>
        </div>
      </div>
    </div>
  );
}
