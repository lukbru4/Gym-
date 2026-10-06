// Essens-Assistent: Der Nutzer schreibt, was er gegessen hat, die KI fragt nach und schlägt Einträge vor.
import { useEffect, useRef, useState } from 'react';
import { ask } from './Dialog';
import { pickNumber } from './NumberPicker';
import { fmt } from '../lib/format';
import { FoodAiError, mealForHour, rescaleItem, totals, type ChatMsg, type ChatTurn, type Meal, type PhotoItem } from '../lib/food';

const AI_KEY = 'gym-tracker-food-chat-ok';
const GREETING = 'Hallo! Was hast du gegessen oder getrunken? Schreib es einfach auf – ich frage nach, wenn mir etwas fehlt.';

interface Bubble extends ChatMsg { suggestions?: string[] }
type Item = PhotoItem;

export function FoodChat({ chat, onAdd, onClose, onError }: {
  chat: (messages: ChatMsg[]) => Promise<ChatTurn>;
  onAdd: (meal: Meal, items: Item[]) => Promise<void>;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [bubbles, setBubbles] = useState<Bubble[]>([{ role: 'assistant', content: GREETING, suggestions: ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'] }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Item[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.classList.add('picker-open');
    return () => document.body.classList.remove('picker-open');
  }, []);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [bubbles, proposal, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    let ok = false;
    try {
      ok = localStorage.getItem(AI_KEY) === '1';
    } catch {
      /* nochmal fragen */
    }
    if (!ok) {
      if (!(await ask('Deine Nachrichten in diesem Chat werden zur Auswertung an einen KI-Dienst (Anthropic, USA) gesendet. Sie werden bei uns nicht gespeichert. Die Werte sind Schätzungen.', { title: 'KI-Assistent nutzen?', ok: 'Einverstanden' }))) return;
      try {
        localStorage.setItem(AI_KEY, '1');
      } catch {
        /* ignorieren */
      }
    }
    const next: Bubble[] = [...bubbles.map(({ suggestions: _s, ...m }) => m), { role: 'user', content: t }];
    setBubbles(next);
    setInput('');
    setProposal(null);
    setBusy(true);
    try {
      const turn = await chat(next.map(({ role, content }) => ({ role, content })));
      setBubbles([...next, { role: 'assistant', content: turn.reply, suggestions: turn.suggestions }]);
      setRemaining(turn.remaining);
      if (turn.ready && turn.items.length) setProposal(turn.items);
    } catch (err) {
      if (err instanceof FoodAiError) setBubbles([...next, { role: 'assistant', content: err.message }]);
      else onError(err);
    } finally {
      setBusy(false);
    }
  };

  const last = bubbles[bubbles.length - 1];
  const sum = proposal ? totals(proposal) : null;
  const confirm = async () => {
    if (!proposal) return;
    setBusy(true);
    try {
      await onAdd(mealForHour(new Date().getHours()), proposal);
      setBubbles((b) => [...b, { role: 'assistant', content: `Eingetragen: ${fmt(totals(proposal).kcal, 0)} kcal ✓ Noch etwas?`, suggestions: ['Nein, danke'] }]);
      setProposal(null);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="picker food-chat" role="dialog" aria-modal="true" aria-label="Essens-Assistent">
      <div className="picker-head">
        <h2>Essens-Assistent</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" id="chat-close" onClick={onClose}>✕</button>
      </div>
      <p className="muted small center" id="chat-note">Du chattest mit einem KI-Assistenten. Antworten und Werte sind Schätzungen.</p>
      <div className="chat-list" role="log" aria-live="polite">
        {bubbles.map((b, i) => (
          <div key={i} className={`bubble ${b.role}`} data-role={b.role}>{b.content}</div>
        ))}
        {busy && <div className="bubble assistant typing" id="chat-typing">…</div>}
        {proposal && sum && (
          <div className="card chat-proposal" id="chat-proposal">
            <h3>Vorschlag</h3>
            <ul className="photo-items">
              {proposal.map((it, i) => (
                <li key={i}>
                  <span className="food-name">{it.name}<small className="muted">{fmt(it.protein, 0)} g Eiweiß · {fmt(it.carbs, 0)} g KH · {fmt(it.fat, 0)} g Fett</small></span>
                  <button type="button" className="btn small-btn" data-grams={i} onClick={async () => {
                    const v = await pickNumber({ title: it.name, unit: 'g', value: String(it.grams), min: 1, max: 3000, step: 1, bigStep: 10, itemW: 8, labelEvery: 50, integer: false });
                    if (v !== null) setProposal(proposal.map((x, j) => (j === i ? rescaleItem(x, Number(v.replace(',', '.'))) : x)));
                  }}>{fmt(it.grams, 0)} g</button>
                  <strong className="photo-kcal">{fmt(it.kcal, 0)} kcal</strong>
                </li>
              ))}
            </ul>
            <button className="btn primary block" id="chat-confirm" disabled={busy} onClick={confirm}>Eintragen · {fmt(sum.kcal, 0)} kcal</button>
          </div>
        )}
        <div ref={end} />
      </div>
      {last.role === 'assistant' && last.suggestions && last.suggestions.length > 0 && !busy && (
        <div className="chat-chips">
          {last.suggestions.map((s) => (
            <button key={s} type="button" className="chip" data-suggest={s} onClick={() => (s === 'Nein, danke' ? onClose() : s === 'Ja, eintragen' && proposal ? confirm() : send(s))}>{s}</button>
          ))}
        </div>
      )}
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input id="chat-text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="z. B. Pizza und einen Salat …" aria-label="Was hast du gegessen?" autoComplete="off" maxLength={500} enterKeyHint="send" />
        <button className="btn primary" id="chat-send" type="submit" disabled={busy || !input.trim()} aria-label="Senden">➤</button>
      </form>
      {remaining !== null && <p className="muted small center">Noch {remaining} Nachricht{remaining === 1 ? '' : 'en'} heute</p>}
    </div>
  );
}
