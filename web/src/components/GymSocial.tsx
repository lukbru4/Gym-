// Gym mit Freunden: anfeuern (1× pro Tag, +5 Credits für den Freund), Credits schenken, eigene Anfeuer-Statistik.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { ask, notify } from './Dialog';
import type { CheerStats } from '../data/social';
import { fmt } from '../lib/format';

/** Im Gym eines Freundes: 🔥 anfeuern und 🎁 Credits schenken */
export function FriendGymActions({ userId, name }: { userId: string; name: string }) {
  const { api, showError, dataChanged } = useApp();
  const [stats, setStats] = useState<CheerStats | null>(null);
  const [gift, setGift] = useState(false);
  const load = () => api.social?.cheerStats(userId).then(setStats, () => setStats(null));
  useEffect(() => { void load(); }, [api, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!api.social) return null;
  const cheer = async () => {
    try {
      await api.social!.cheerGym(userId);
      await load();
    } catch (err) {
      showError(err);
    }
  };
  return (
    <div className="gym-social" id="gym-social">
      <div className="row">
        <button type="button" className={`btn small-btn grow${stats?.mine_today ? '' : ' primary'}`} id="gym-cheer" disabled={!!stats?.mine_today} onClick={() => void cheer()}>
          {stats?.mine_today ? 'Heute schon angefeuert ✓' : '🔥 Gym anfeuern'}
        </button>
        <button type="button" className="btn small-btn grow" id="gym-gift-open" onClick={() => setGift(true)}>🎁 Credits schenken</button>
      </div>
      {stats && <p className="muted small" id="gym-cheer-count">🔥 {stats.count}× angefeuert{stats.recent.length ? ` · zuletzt von ${[...new Set(stats.recent)].slice(0, 3).join(', ')}` : ''} · Anfeuern schenkt {name} 5 Credits (1× pro Tag).</p>}
      {gift && <GiftDialog userId={userId} name={name} onClose={() => setGift(false)} onDone={() => { setGift(false); dataChanged(); }} />}
    </div>
  );
}

function GiftDialog({ userId, name, onClose, onDone }: { userId: string; name: string; onClose: () => void; onDone: () => void }) {
  const { api, showError } = useApp();
  const [amount, setAmount] = useState(25);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!(await ask(`${amount} Credits an ${name} schenken?`, { title: 'Credits schenken', ok: 'Schenken' }))) return;
    setBusy(true);
    try {
      const left = await api.social!.giftCredits(userId, amount, msg.trim());
      void notify(`${name} bekommt ${amount} Credits. Dein Guthaben: ${fmt(left, 0)} Credits.`, { title: 'Geschenkt 🎁' });
      onDone();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" id="gift-dialog" role="dialog" aria-modal="true" aria-label="Credits schenken">
        <h3>🎁 Credits an {name}</h3>
        <div className="seg seg-small" role="group" aria-label="Betrag">
          {[10, 25, 50, 100, 200].map((a) => <button key={a} type="button" className={`seg-tab${amount === a ? ' active' : ''}`} aria-pressed={amount === a} data-gift={a} onClick={() => setAmount(a)}>{a}</button>)}
        </div>
        <label className="small">Nachricht (freiwillig)<input id="gift-msg" maxLength={80} value={msg} placeholder="z. B. Für dein neues Gerät 💪" onChange={(e) => setMsg(e.target.value)} /></label>
        <p className="muted small">Höchstens 300 Credits pro Tag. Geschenke zählen nicht für die Rangliste.</p>
        <div className="row">
          <button type="button" className="btn primary grow" id="gift-send" disabled={busy} onClick={() => void send()}>{amount} Credits schenken</button>
          <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

/** Eigenes Gym: wie oft angefeuert, von wem */
export function MyCheers() {
  const { api, user } = useApp();
  const [stats, setStats] = useState<CheerStats | null>(null);
  useEffect(() => { if (api.social && user) api.social.cheerStats(user.id).then(setStats, () => {}); }, [api, user]);
  if (!api.social) return null;
  return (
    <div className="gym-my-cheers row-between" id="gym-my-cheers">
      <span className="small">{stats ? <>🔥 <strong>{stats.count}×</strong> angefeuert{stats.recent.length ? ` · zuletzt ${[...new Set(stats.recent)].slice(0, 3).join(', ')}` : ''}</> : 'Freunde können dein Gym anfeuern 🔥'}</span>
      <a className="btn small-btn" id="gym-visit" href="#/gyms">🏋️ Freunde besuchen</a>
    </div>
  );
}
