// Eigene Dialoge statt der System-Popups (confirm/alert/prompt): ein Kasten mitten im Bild,
// passend zum Farbschema. Aufruf überall mit await ask(…), askText(…) oder notify(…).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

interface DialogRequest {
  id: number;
  kind: 'confirm' | 'prompt' | 'alert';
  title?: string;
  message: string;
  ok: string;
  cancel: string;
  danger: boolean;
  placeholder?: string;
  /** Eingabe muss genau diesem Wort entsprechen (z. B. „LÖSCHEN“), sonst bleibt OK gesperrt */
  requireText?: string;
  resolve: (v: boolean | string | null) => void;
}

let current: DialogRequest | null = null;
const queue: DialogRequest[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let counter = 0;
function open(req: Omit<DialogRequest, 'resolve' | 'id'>): Promise<boolean | string | null> {
  return new Promise((resolve) => {
    queue.push({ ...req, id: ++counter, resolve });
    if (!current) next();
  });
}
function next() {
  current = queue.shift() ?? null;
  emit();
}
function close(value: boolean | string | null) {
  const c = current;
  if (!c) return;
  next();
  c.resolve(value);
}

interface Opts { title?: string; ok?: string; cancel?: string; danger?: boolean }
/** Ja/Nein-Frage; true = bestätigt */
export const ask = (message: string, o: Opts = {}) =>
  open({ kind: 'confirm', message, title: o.title, ok: o.ok ?? 'OK', cancel: o.cancel ?? 'Abbrechen', danger: !!o.danger }) as Promise<boolean>;
/** Texteingabe; null = abgebrochen */
export const askText = (message: string, o: Opts & { placeholder?: string; requireText?: string } = {}) =>
  open({ kind: 'prompt', message, title: o.title, ok: o.ok ?? 'OK', cancel: o.cancel ?? 'Abbrechen', danger: !!o.danger, placeholder: o.placeholder, requireText: o.requireText }) as Promise<string | null>;
/** Hinweis mit einem Knopf */
export const notify = (message: string, o: Pick<Opts, 'title' | 'ok'> = {}) =>
  open({ kind: 'alert', message, title: o.title, ok: o.ok ?? 'OK', cancel: '', danger: false }).then(() => undefined);

const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb));
const get = () => current;

export function DialogHost() {
  const req = useSyncExternalStore(subscribe, get);
  const [text, setText] = useState('');
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!req) return;
    setText('');
    (req.kind === 'prompt' ? inputRef.current : okRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(req.kind === 'confirm' ? false : req.kind === 'prompt' ? null : true);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [req]);
  if (!req) return null;
  const okDisabled = req.kind === 'prompt' && (req.requireText ? text.trim().toUpperCase() !== req.requireText.toUpperCase() : !text.trim());
  const cancelValue = req.kind === 'prompt' ? null : false;
  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && req.kind !== 'alert' && close(cancelValue)}>
      <div className="dialog" id="app-dialog" data-req={req.id} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-msg">
        {req.title && <h3 id="dialog-title">{req.title}</h3>}
        <p id="dialog-msg">{req.message}</p>
        {req.kind === 'prompt' && (
          <input
            ref={inputRef}
            id="dialog-input"
            value={text}
            placeholder={req.placeholder ?? req.requireText ?? ''}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !okDisabled && close(text.trim())}
          />
        )}
        <div className="dialog-actions">
          {req.kind !== 'alert' && (
            <button type="button" className="btn" id="dialog-cancel" onClick={() => close(cancelValue)}>
              {req.cancel}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            className={`btn ${req.danger ? 'danger-solid' : 'primary'}`}
            id="dialog-ok"
            disabled={okDisabled}
            onClick={() => close(req.kind === 'prompt' ? text.trim() : true)}
          >
            {req.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
