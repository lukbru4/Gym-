// Konto & Einstellungen sowie Backup (nur lokaler Modus).
import { useState, type ChangeEvent } from 'react';
import { useAsync } from '../app/useAsync';
import { LegalLinks } from './Auth';
import type { Visibility } from '../data/social';
import { useApp } from '../app/context';
import { displayName, setDisplayName } from '../app/profile';
import { navigate } from '../app/router';
import { clearDraft } from '../lib/editor';
import { plural } from '../lib/format';
import { todayISO } from '../lib/stats';
import { useCosmetics } from '../lib/cosmetics';
import { useShopItems } from '../lib/shop';
import {
  SCHEMES,
  THEME_OPTIONS,
  getDarkHours,
  getScheme,
  getThemeMode,
  setDarkHours,
  setScheme,
  setThemeMode,
  timeModeLabel,
  schemeAllowed,
  type SchemeChoice,
  type ThemeMode,
} from '../lib/theme';
import { hardReload } from '../lib/update';
import { APP_VERSION } from '../version';

const confirmDelete = (what: string) =>
  prompt(`${what} kann nicht rückgängig gemacht werden. Tippe LÖSCHEN zum Bestätigen:`)?.trim().toUpperCase() === 'LÖSCHEN';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Account() {
  const { api, user, setExercises, showError, dataChanged } = useApp();
  const [scheme, setSchemeState] = useState(getScheme());
  const [themeMode, setThemeModeState] = useState(getThemeMode());
  const [hours, setHoursState] = useState(getDarkHours());
  const changeHours = (key: 'from' | 'until', value: number) => {
    const next = { ...hours, [key]: value };
    if (next.from === next.until) return; // gleiche Uhrzeit ergibt keinen Zeitraum
    setDarkHours(next);
    setHoursState(next);
  };
  const [busy, setBusy] = useState(false);
  const { owned, admin } = useCosmetics();
  // Shop-Farbschemata nur zeigen, wenn gekauft (oder gerade aktiv)
  // Nur Standard + Gekauftes (Admin: alles, auch eigene Entwürfe)
  const shopItems = useShopItems();
  const schemes: [SchemeChoice, string][] = [
    ...SCHEMES.filter(([id]) => schemeAllowed(id, owned, admin)),
    ...shopItems.filter((i) => i.custom && (admin || owned.includes(i.id))).map((i): [SchemeChoice, string] => [`custom:${i.id}`, `${i.name} (eigenes)`]),
  ];

  const deleteAccount = async () => {
    if (!confirmDelete('Das Löschen deines Kontos')) return;
    setBusy(true);
    try {
      await api.deleteAccount!();
      clearDraft();
    } catch (err) {
      setBusy(false);
      showError(err);
    }
  };
  const deleteLocal = async () => {
    if (!confirmDelete('Das Löschen aller Daten')) return;
    try {
      api.deleteAllData!();
      setExercises(await api.listExercises());
      clearDraft();
      dataChanged();
      navigate('#/');
    } catch (err) {
      showError(err);
    }
  };

  return (
    <>
      <h2>Konto &amp; Einstellungen</h2>
      <div className="card account">
        <h3>Konto</h3>
        {api.mode === 'cloud' ? (
          <>
            <p className="small">
              Angemeldet als <strong>{user?.email ?? ''}</strong>
            </p>
            <div className="row">
              <button className="btn grow" id="sign-out" onClick={() => api.signOut()}>Abmelden</button>
              <button className="btn danger grow" id="delete-account" disabled={busy} onClick={deleteAccount}>Konto löschen</button>
            </div>
            <p className="muted small">
              „Konto löschen“ entfernt dein Konto und alle deine Trainings, Vorlagen und Einträge endgültig vom Server.
            </p>
          </>
        ) : (
          <>
            <p className="muted small">Lokaler Modus ohne Konto: Deine Daten liegen nur in diesem Browser.</p>
            <button className="btn danger block" id="delete-local" onClick={deleteLocal}>Alle Daten löschen</button>
          </>
        )}
      </div>
      {api.social ? (
        <SocialSettings />
      ) : (
        <div className="card">
          <h3>Profil</h3>
          <label>
            Anzeigename
            <input id="display-name" maxLength={30} defaultValue={displayName(api, user)} autoComplete="nickname" onChange={(e) => setDisplayName(e.target.value)} />
          </label>
        </div>
      )}
      <div className="card">
        <h3>Stil</h3>
        <label>
          Farbschema
          <select
            id="scheme"
            value={scheme}
            onChange={(e) => {
              setScheme(e.target.value as SchemeChoice);
              setSchemeState(e.target.value as SchemeChoice);
            }}
          >
            {schemes.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        {api.social && !admin && (
          <p className="muted small scheme-hint">
            Weitere Farbschemata gibt es im <a href="#/shop">Shop</a> – mit 👁 kannst du sie vorher ansehen.
          </p>
        )}
        <label>
          Hell / Dunkel
          <select
            id="theme-mode"
            value={themeMode}
            onChange={(e) => {
              setThemeMode(e.target.value as ThemeMode);
              setThemeModeState(e.target.value as ThemeMode);
            }}
          >
            {THEME_OPTIONS.map(([id, label]) => (
              <option key={id} value={id}>{id === 'time' ? timeModeLabel(hours) : label}</option>
            ))}
          </select>
        </label>
        {themeMode === 'time' && (
          <div className="row pair dark-hours">
            <label>
              Dunkel ab
              <select id="dark-from" value={hours.from} onChange={(e) => changeHours('from', Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h} disabled={h === hours.until}>{h}:00 Uhr</option>)}
              </select>
            </label>
            <label>
              Hell ab
              <select id="dark-until" value={hours.until} onChange={(e) => changeHours('until', Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h} disabled={h === hours.from}>{h}:00 Uhr</option>)}
              </select>
            </label>
          </div>
        )}
      </div>
      <div className="card">
        <h3>App</h3>
        <p className="muted small">App-Version: {APP_VERSION}</p>
        <button className="btn block" id="hard-reload" onClick={hardReload}>App aktualisieren</button>
        <p className="muted small">Lädt die neueste Version vom Server. Deine Trainings bleiben erhalten.</p>
      </div>
      <div className="card">
        <h3>Daten</h3>
        <a className="btn block" href="#/backup">Backup</a>
      </div>
      <div className="card" id="legal">
        <h3>Rechtliches</h3>
        <LegalLinks />
      </div>
    </>
  );
}

/** Profil für Freunde (Cloud): Anzeigename, Sichtbarkeit, blockierte Personen */
function SocialSettings() {
  const { api, showError, dataVersion, dataChanged } = useApp();
  const social = api.social!;
  const data = useAsync(() => Promise.all([social.myProfile(), social.blocks()]), [social, dataVersion]);
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  if (data.status === 'loading') return <div className="card"><h3>Profil</h3><p className="muted">Lädt …</p></div>;
  if (data.status === 'error')
    return (
      <div className="card">
        <h3>Profil für Freunde</h3>
        <p className="muted small">Noch nicht verfügbar – in Supabase fehlt das neue SQL für Freunde (siehe Seite „Freunde“).</p>
      </div>
    );
  const [profile, blocks] = data.data;
  const current = name ?? profile.display_name;
  const save = async (displayName: string, visibility: Visibility) => {
    const clean = displayName.trim();
    if (!clean) return showError(new Error('Bitte gib einen Namen ein.'));
    try {
      await social.updateProfile(clean, visibility);
      setDisplayName(clean);
      setSaved('Gespeichert.');
      dataChanged();
    } catch (err) {
      showError(err);
    }
  };
  return (
    <div className="card">
      <h3>Profil für Freunde</h3>
      <div className="row pair">
        <label className="grow">
          Anzeigename
          <input id="display-name" maxLength={30} value={current} autoComplete="nickname" onChange={(e) => { setName(e.target.value); setSaved(''); }} />
        </label>
        <button className="btn" id="save-name" onClick={() => save(current, profile.visibility)}>Speichern</button>
      </div>
      {saved && <p className="muted small">{saved}</p>}
      <label>
        Wer sieht deine Trainings?
        <select id="visibility" value={profile.visibility} onChange={(e) => save(current, e.target.value as Visibility)}>
          <option value="friends">Meine Freunde (Feed, Profil, Rangliste)</option>
          <option value="private">Niemand (privat)</option>
        </select>
      </label>
      <p className="muted small">Dein Freundescode: <strong>{profile.friend_code}</strong></p>
      {blocks.length > 0 && (
        <>
          <h4>Blockiert</h4>
          <ul className="friend-list">
            {blocks.map((b) => (
              <li key={b.user_id}>
                <span>{b.display_name}</span>
                <button className="link small" onClick={async () => { try { await social.unblock(b.user_id); dataChanged(); } catch (err) { showError(err); } }}>
                  Entsperren
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function Backup() {
  const { api, setExercises, showError, dataChanged } = useApp();
  if (api.mode !== 'local') {
    return (
      <>
        <h2>Backup</h2>
        <p className="muted">Deine Daten liegen in der Cloud (Supabase) und brauchen kein manuelles Backup.</p>
      </>
    );
  }
  const data = api.exportData!();
  const download = () => {
    const blob = new Blob([JSON.stringify(api.exportData!(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-tracker-backup-${todayISO()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const obj = api.validateBackup!(JSON.parse(await file.text()));
      if (!confirm('Alle aktuellen Daten in diesem Browser werden ersetzt. Fortfahren?')) return;
      api.importData!(obj);
      setExercises(await api.listExercises());
      clearDraft();
      dataChanged();
      navigate('#/');
    } catch (err) {
      showError(err instanceof SyntaxError ? new Error('Die Datei ist kein gültiges JSON.') : err);
    } finally {
      input.value = '';
    }
  };
  return (
    <>
      <h2>Backup</h2>
      <div className="card">
        <p>
          Im lokalen Modus liegen deine Daten nur in diesem Browser. Löschst du die Browserdaten, sind sie weg. Exportiere deshalb
          regelmäßig eine Sicherung.
        </p>
        <p className="muted small">
          Gespeichert: {plural(data.workouts.length, 'Training', 'Trainings')}, {plural(data.sets.length, 'Satz', 'Sätze')},{' '}
          {plural(data.body_weights.length, 'Gewichtseintrag', 'Gewichtseinträge')}.
        </p>
        <button className="btn primary block" id="export" onClick={download}>Backup herunterladen</button>
      </div>
      <div className="card">
        <h3>Backup einspielen</h3>
        <p className="muted small">
          Ersetzt alle Daten in diesem Browser durch die Daten aus der Datei. So kannst du deine Daten auch auf ein anderes Gerät
          übertragen.
        </p>
        <label>
          Backup-Datei (.json)
          <input type="file" id="import" accept="application/json,.json" onChange={upload} />
        </label>
      </div>
    </>
  );
}
