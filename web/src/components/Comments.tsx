// Kommentare unter einem Training: lesen, schreiben (mit Wortfilter), löschen, melden.
import { useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import type { Social } from '../data/social';
import { COMMENT_MAX, isOffensive } from '../lib/moderation';

function timeAgo(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
}

export function Comments({ social, workoutId, onCount }: { social: Social; workoutId: number; onCount?: (n: number) => void }) {
  const { showError } = useApp();
  const [version, setVersion] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useAsync(async () => {
    const rows = await social.comments(workoutId);
    onCount?.(rows.length);
    return rows;
  }, [social, workoutId, version]);
  const reload = () => setVersion((v) => v + 1);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (isOffensive(body)) return showError(new Error('Bitte bleib freundlich – der Kommentar enthält ein gesperrtes Wort.'));
    setBusy(true);
    try {
      await social.addComment(workoutId, body);
      setText('');
      reload();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: number) => {
    if (!confirm('Kommentar löschen?')) return;
    try {
      await social.deleteComment(id);
      reload();
    } catch (err) {
      showError(err);
    }
  };
  const report = async (id: number) => {
    const reason = prompt('Warum meldest du diesen Kommentar?');
    if (reason === null) return;
    try {
      await social.reportComment(id, reason);
      alert('Danke! Der Kommentar wurde gemeldet und wird geprüft.');
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div className="comments">
      {list.status === 'loading' && <p className="muted small">Lädt …</p>}
      {list.status === 'error' && <p className="muted small">{list.error.message}</p>}
      {list.status === 'ok' && (
        <ul className="comment-list">
          {list.data.map((c) => (
            <li key={c.id} data-comment={c.id}>
              <div className="comment-head">
                <strong>{c.is_mine ? 'Du' : c.display_name}</strong>
                <span className="muted small">{timeAgo(c.created_at)}</span>
              </div>
              <p className="comment-body">{c.body}</p>
              <div className="comment-actions">
                {c.can_delete && <button className="link small" onClick={() => remove(c.id)}>Löschen</button>}
                {!c.is_mine && <button className="link small" onClick={() => report(c.id)}>Melden</button>}
              </div>
            </li>
          ))}
          {!list.data.length && <li className="muted small">Noch keine Kommentare.</li>}
        </ul>
      )}
      <form className="comment-form" onSubmit={send}>
        <input
          className="comment-input"
          value={text}
          maxLength={COMMENT_MAX}
          placeholder="Kommentar schreiben …"
          aria-label="Kommentar schreiben"
          onChange={(e) => setText(e.target.value)}
          enterKeyHint="send"
        />
        <button className="btn small-btn primary" type="submit" disabled={busy || !text.trim()}>Senden</button>
      </form>
    </div>
  );
}
