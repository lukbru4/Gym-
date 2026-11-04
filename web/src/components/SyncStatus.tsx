// Zeigt, dass die Einstellungen im Konto gesichert sind, mit „Jetzt sichern“.
import { useEffect, useState } from 'react';
import { lastSyncedAt, onSyncChange, pushNow } from '../lib/cloudSettings';
import { ago } from '../lib/notifications';

export function SyncStatus() {
  const [at, setAt] = useState(lastSyncedAt());
  const [busy, setBusy] = useState(false);
  useEffect(() => onSyncChange(() => setAt(lastSyncedAt())), []);
  return (
    <div className="sync-status" id="sync-status">
      <p className="small">☁️ <strong>Einstellungen im Konto gesichert</strong>{at ? ` · zuletzt ${ago(new Date(at).toISOString())}` : ' · noch nicht (Datenbank-Update 70 nötig oder offline)'}</p>
      <p className="muted small">Supplements, Erinnerungen, Trainingsplan, Ziele, Farben, Ernährung und mehr. Nach einer Neuinstallation oder auf einem neuen Handy einfach anmelden – dann kommt alles zurück.</p>
      <button type="button" className="btn small-btn" id="sync-now" disabled={busy} onClick={async () => { setBusy(true); await pushNow(); setAt(lastSyncedAt()); setBusy(false); }}>{busy ? 'Sichert …' : 'Jetzt sichern'}</button>
    </div>
  );
}
