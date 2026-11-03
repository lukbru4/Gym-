// Supplements: heute abhaken, Liste mit Uhrzeit und Tagen pflegen, tägliche Erinnerung aufs Handy.
import { useState } from 'react';
import { useApp } from '../app/context';
import { ask } from '../components/Dialog';
import { isNative } from '../lib/platform';
import { DAYS } from '../lib/reminders';
import { todayISO } from '../lib/stats';
import {
  loadSupps, loadTaken, MAX_SUPPS, newId, PRESETS, saveSupps, streak, today, toggleTaken, useSuppsTick, type Supplement,
} from '../lib/supplements';

/** Heute fällige Supplements zum Abhaken (Startseite und Supplements-Seite) */
export function SuppToday({ compact = false }: { compact?: boolean }) {
  const { user } = useApp();
  useSuppsTick();
  const uid = user?.id ?? 'local';
  const iso = todayISO();
  const list = loadSupps(uid), log = loadTaken(uid);
  const due = today(list, log, iso);
  if (compact && !list.length) return null;
  const done = due.filter((s) => s.taken).length;
  return (
    <div className="card supp-today" id={compact ? 'supp-home' : 'supp-today'}>
      <div className="block-head">
        <h3>{compact ? <a href="#/supplements">💊 Heute nehmen</a> : '💊 Heute nehmen'}</h3>
        <span className="muted small" id="supp-progress">{due.length ? `${done} / ${due.length}` : ''}</span>
      </div>
      {due.length ? (
        <ul className="supp-list">
          {due.map((s) => (
            <li key={s.id}>
              <button type="button" className={`supp-check${s.taken ? ' on' : ''}`} data-take={s.id} aria-pressed={s.taken} onClick={() => toggleTaken(uid, s.id, iso)}>
                <span className="supp-box" aria-hidden="true">{s.taken ? '✓' : ''}</span>
                <span className="supp-text"><strong>{s.icon} {s.name}</strong><small>{s.dose ? `${s.dose} · ` : ''}{s.time} Uhr{streak(s, log, iso) > 1 ? ` · 🔥 ${streak(s, log, iso)} Tage in Folge` : ''}</small></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="muted small">{list.length ? 'Heute ist nichts dran. 👍' : 'Noch keine Supplements eingetragen.'}</p>}
      {done === due.length && due.length > 0 && <p className="small supp-all" id="supp-all">Alles genommen – stark! 💪</p>}
    </div>
  );
}

export function Supplements() {
  const { user } = useApp();
  useSuppsTick();
  const uid = user?.id ?? 'local';
  const list = loadSupps(uid);
  const [edit, setEdit] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const update = (id: string, patch: Partial<Supplement>) => saveSupps(uid, list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const add = (p: Omit<Supplement, 'id' | 'on'>) => {
    if (list.length >= MAX_SUPPS) return;
    const id = newId();
    saveSupps(uid, [...list, { ...p, id, on: true }]);
    setEdit(id);
  };
  const log = loadTaken(uid);
  const iso = todayISO();
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() - 6 + i); return d.toISOString().slice(0, 10); });
  return (
    <>
      <h2>Supplements</h2>
      <SuppToday />
      <p className="muted small">{isNative
        ? 'Du bekommst zur eingestellten Uhrzeit eine Erinnerung aufs Handy („Heute Kreatin nehmen“). Schon abgehakt? Dann kommt für heute keine mehr.'
        : 'Erinnerungen aufs Handy gibt es in der App fürs iPhone/Android. Im Browser siehst du die Liste auf der Startseite.'}</p>

      <h3>Deine Supplements</h3>
      {list.length === 0 && <p className="muted small">Tippe unten auf ein Supplement, um es hinzuzufügen.</p>}
      <div className="supp-items" id="supp-items">
        {list.map((s) => (
          <div key={s.id} className={`card supp-item${s.on ? '' : ' off'}`} data-supp={s.id}>
            <div className="supp-row">
              <span className="supp-icon" aria-hidden="true">{s.icon}</span>
              <div className="supp-main"><strong>{s.name}</strong><small className="muted">{s.dose} · {s.time} Uhr · {s.days ? s.days.join(', ') : 'jeden Tag'}</small></div>
              <label className="switch"><input type="checkbox" checked={s.on} data-supp-on={s.id} onChange={(e) => update(s.id, { on: e.target.checked })} aria-label={`${s.name} aktiv`} /></label>
              <button type="button" className="icon-btn" data-supp-edit={s.id} aria-label={`${s.name} bearbeiten`} onClick={() => setEdit(edit === s.id ? null : s.id)}>✏️</button>
            </div>
            <div className="supp-week" aria-label="Letzte 7 Tage">
              {last7.map((d) => <span key={d} className={(log[d] ?? []).includes(s.id) ? 'on' : ''} title={d}>{DAYS[(new Date(`${d}T12:00:00`).getDay() + 6) % 7]}</span>)}
            </div>
            {edit === s.id && (
              <div className="supp-edit">
                <label>Name<input value={s.name} maxLength={30} data-supp-name={s.id} onChange={(e) => update(s.id, { name: e.target.value || s.name })} /></label>
                <label>Menge<input value={s.dose} maxLength={30} placeholder="z. B. 5 g" onChange={(e) => update(s.id, { dose: e.target.value })} /></label>
                <label>Uhrzeit<input type="time" value={s.time} data-supp-time={s.id} onChange={(e) => e.target.value && update(s.id, { time: e.target.value })} /></label>
                <div className="rem-days" role="group" aria-label="Tage">
                  {DAYS.map((d) => {
                    const days = s.days ?? [...DAYS];
                    const on = days.includes(d);
                    return <button key={d} type="button" className={`picker-cat${on ? ' active' : ''}`} aria-pressed={on} data-supp-day={d}
                      onClick={() => { const next = on ? days.filter((x) => x !== d) : DAYS.filter((x) => x === d || days.includes(x)); if (next.length) update(s.id, { days: next.length === 7 ? null : next }); }}>{d}</button>;
                  })}
                </div>
                <button type="button" className="btn small-btn danger" data-supp-delete={s.id} onClick={async () => { if (await ask(`„${s.name}“ löschen?`, { title: 'Löschen?', ok: 'Löschen', danger: true })) { saveSupps(uid, list.filter((x) => x.id !== s.id)); setEdit(null); } }}>Löschen</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h3>Hinzufügen</h3>
      <div className="gym-ideas" id="supp-presets">
        {PRESETS.filter((p) => !list.some((s) => s.name === p.name)).map((p) => (
          <button key={p.name} type="button" className="chip" data-preset={p.name} disabled={list.length >= MAX_SUPPS} onClick={() => add(p)}>{p.icon} {p.name}</button>
        ))}
      </div>
      <form className="supp-custom" onSubmit={(e) => { e.preventDefault(); const n = custom.trim(); if (!n) return; add({ name: n, dose: '', time: '08:00', days: null, icon: '💊' }); setCustom(''); }}>
        <input id="supp-custom" value={custom} maxLength={30} placeholder="Eigenes Supplement, z. B. Ashwagandha" onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="btn small-btn" disabled={!custom.trim() || list.length >= MAX_SUPPS}>Hinzufügen</button>
      </form>
      <p className="muted small">Allgemeine Erinnerung, keine medizinische Beratung. Frag bei Fragen zu Menge oder Verträglichkeit deine Ärztin oder deinen Arzt.</p>
    </>
  );
}
