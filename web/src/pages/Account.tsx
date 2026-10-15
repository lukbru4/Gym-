// Konto & Einstellungen sowie Backup (nur lokaler Modus).
import { ReminderSettingsCard } from '../components/ReminderSettings';
import { ask, askText } from '../components/Dialog';
import { useState, type ChangeEvent, type ReactNode } from 'react';
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
import { activeQuestions, isAnswered, loadQuiz } from '../lib/plan';
import { usePro } from '../lib/pro';
import { refreshAvatars, useAvatarUrl } from '../lib/avatars';
import { AvatarCropper } from '../components/AvatarCropper';
import { AvatarDot } from '../components/AvatarDot';
import { setLocalWeekGoal, useWeekGoal } from '../lib/weekGoal';
import { setGoalWeight, useGoalWeight } from '../lib/goalWeight';
import { addCustomGoal, removeCustomGoal, toggleCustomGoal, useCustomGoals } from '../lib/customGoals';
import { pickNumber } from '../components/NumberPicker';
import { fmt } from '../lib/format';
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
import { FunChoice } from '../components/FunChoice';
import { setFunMode, useFunMode } from '../lib/onboarding';
import { SettingsIcon } from '../components/SettingsIcons';
import { FAQ, NEWS } from '../lib/news';

const confirmDelete = (what: string) =>
  askText(`${what} kann nicht rückgängig gemacht werden. Tippe LÖSCHEN zum Bestätigen.`, { title: 'Wirklich löschen?', ok: 'Endgültig löschen', danger: true, requireText: 'LÖSCHEN' }).then((t) => t?.trim().toUpperCase() === 'LÖSCHEN');

function ProCard() {
  const pro = usePro();
  return (
    <div className="card" id="pro-card">
      <h3>Pro</h3>
      <p className="muted small">
        {pro.pro ? (pro.admin ? 'Aktiv – als Admin hast du Pro immer.' : 'Aktiv.') : 'Trainingsplan und Ernährungscoach gibt es mit Pro.'}
      </p>
      <a className="btn block" id="open-pro" href="#/pro">{pro.pro ? 'Pro ansehen' : 'Pro ansehen & freischalten'}</a>
    </div>
  );
}

function QuestionsCard() {
  const saved = loadQuiz();
  const total = activeQuestions(saved?.answers ?? {}).length;
  const done = saved ? activeQuestions(saved.answers).filter((q) => isAnswered(q, saved.answers)).length : 0;
  return (
    <div className="card" id="questions-card">
      <h3>Trainingsplan</h3>
      <p className="muted small">
        Beantworte ein paar Fragen zu Ziel, Zeit, Geräten und Alltag – daraus erstellen wir deinen persönlichen Trainingsplan mit Vorlagen, Wochenplan und Kalorienbedarf.
        {saved ? ` Bisher beantwortet: ${done} von ${total}.` : ''}
      </p>
      <a className="btn primary block" id="open-quiz" href="#/trainingsplan">{saved ? 'Plan ansehen & anpassen' : 'Trainingsplan erstellen'}</a>
    </div>
  );
}

function WeekGoalCard() {
  const { api, showError, dataChanged } = useApp();
  const goal = useWeekGoal();
  const goalKg = useGoalWeight();
  const weights = useAsync(() => api.listBodyWeights(), [api]);
  const lastKg = weights.status === 'ok' && weights.data.length ? weights.data[weights.data.length - 1].weight_kg : null;
  const editKg = async () => {
    const v = await pickNumber({ title: 'Zielgewicht', unit: 'kg', value: String(goalKg ?? lastKg ?? 75), min: 30, max: 250, step: 0.1, bigStep: 0.5, itemW: 10, labelEvery: 10 });
    if (v !== null) setGoalWeight(Number(v.replace(',', '.')));
  };
  const change = async (n: number) => {
    const before = goal;
    setLocalWeekGoal(n);
    dataChanged();
    try {
      await api.social?.setWeekGoal(n);
    } catch (err) {
      setLocalWeekGoal(before);
      dataChanged();
      showError(err);
    }
  };
  const social = api.social;
  const [kcalVer, setKcalVer] = useState(0);
  const kcal = useAsync(() => (social ? social.nutritionGoal() : Promise.resolve(null)), [social, kcalVer]);
  const editKcal = async () => {
    if (!social) return;
    const v = await pickNumber({ title: 'Kalorien pro Tag', unit: 'kcal', value: String(kcal.status === 'ok' && kcal.data ? kcal.data : 2500), min: 800, max: 6000, step: 50, bigStep: 100, itemW: 12, labelEvery: 10, integer: true });
    if (v === null) return;
    try {
      await social.setNutritionGoal(Number(v));
      setKcalVer((n) => n + 1);
    } catch (err) {
      showError(err);
    }
  };
  const customs = useCustomGoals();
  const addCustom = async () => {
    const t = await askText('Was möchtest du erreichen?', { title: 'Eigenes Ziel', ok: 'Hinzufügen', placeholder: 'z. B. 10 Klimmzüge' });
    if (t) addCustomGoal(t);
  };
  return (
    <div className="card" id="week-goal-card">
      <h3>Ziele</h3>
      <div className="goal-row">
        <label htmlFor="week-goal">Training pro Woche</label>
        <select id="week-goal" value={goal} onChange={(e) => change(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>{n}× pro Woche</option>
          ))}
        </select>
      </div>
      <div className="goal-row">
        <span>Zielgewicht</span>
        <button type="button" className="btn small-btn" id="goal-weight" onClick={editKg}>{goalKg ? `${fmt(goalKg, 1)} kg` : 'festlegen'}</button>
      </div>
      {goalKg && lastKg != null && (
        <p className="small" id="goal-weight-info">
          Aktuell {fmt(lastKg, 1)} kg · {Math.abs(lastKg - goalKg) < 0.05 ? 'Ziel erreicht 🎉' : `noch ${fmt(Math.abs(lastKg - goalKg), 1)} kg ${lastKg > goalKg ? 'abnehmen' : 'zunehmen'}`}
          {' · '}<button type="button" className="linklike" id="goal-weight-clear" onClick={() => setGoalWeight(null)}>entfernen</button>
        </p>
      )}
      {social && (
        <div className="goal-row">
          <span>Kalorien pro Tag</span>
          <button type="button" className="btn small-btn" id="goal-kcal" onClick={editKcal}>{kcal.status === 'ok' && kcal.data ? `${fmt(kcal.data, 0)} kcal` : '…'}</button>
        </div>
      )}
      <h4>Eigene Ziele</h4>
      <ul className="goal-list" id="custom-goals">
        {customs.map((g) => (
          <li key={g.id} className={g.done ? 'done' : ''}>
            <label><input type="checkbox" checked={g.done} onChange={() => toggleCustomGoal(g.id)} /> <span>{g.text}</span></label>
            <button type="button" className="icon-btn" aria-label={`${g.text} löschen`} onClick={() => removeCustomGoal(g.id)}>✕</button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn block" id="goal-add" onClick={addCustom}>+ Ziel hinzufügen</button>
      <p className="muted small">
        Deine 🔥 Serie zählt Tage: Jedes Training zählt die Tage der Woche bis dahin (Training am Mittwoch = 3 Tage). Schaffst du dein
        Wochenziel, zählt die ganze Woche. Verpasst du es, beginnt die Serie in der nächsten Woche neu.
      </p>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Account({ section }: { section?: string }) {
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
  const fun = useFunMode(user?.id ?? 'local');
  const { owned, admin } = useCosmetics();
  // Shop-Farbschemata nur zeigen, wenn gekauft (oder gerade aktiv)
  // Nur Standard + Gekauftes (Admin: alles, auch eigene Entwürfe)
  const shopItems = useShopItems();
  const schemes: [SchemeChoice, string][] = [
    ...SCHEMES.filter(([id]) => schemeAllowed(id, owned, admin)),
    ...shopItems.filter((i) => i.custom && (admin || owned.includes(i.id))).map((i): [SchemeChoice, string] => [`custom:${i.id}`, `${i.name} (eigenes)`]),
  ];

  const deleteAccount = async () => {
    if (!(await confirmDelete('Das Löschen deines Kontos'))) return;
    setBusy(true);
    try {
      await api.social?.removeAvatar().catch(() => {}); // Profilbild mitlöschen
      await api.deleteAccount!();
      clearDraft();
    } catch (err) {
      setBusy(false);
      showError(err);
    }
  };
  const deleteLocal = async () => {
    if (!(await confirmDelete('Das Löschen aller Daten'))) return;
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

  const sections: Record<string, ReactNode> = {
    erinnerungen: <ReminderSettingsCard />,
    konto: (
      <>
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
      </>
    ),
    profil: (
      <>
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
      </>
    ),
    ziele: (
      <>
      <WeekGoalCard />
      <QuestionsCard />
      </>
    ),
    pro: (
      <>
      <ProCard />
      </>
    ),
    themen: (
      <>
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
      </>
    ),
    app: (
      <>
      <div className="card" id="fun-settings">
        <h3>Spiel-Modus</h3>
        <p className="muted small">Was möchtest du mit deinem Training sammeln? Dein Fortschritt geht beim Wechseln nicht verloren.</p>
        <FunChoice value={fun} onPick={(m) => setFunMode(user?.id ?? 'local', m)} />
      </div>
      <div className="card">
        <h3>App</h3>
        <p className="muted small">App-Version: {APP_VERSION}</p>
        <button className="btn block" id="hard-reload" onClick={hardReload}>App aktualisieren</button>
        <p className="muted small">Lädt die neueste Version vom Server. Deine Trainings bleiben erhalten.</p>
      </div>
      </>
    ),
    daten: (
      <>
      <div className="card">
        <h3>Daten</h3>
        <a className="btn block" href="#/backup">Backup</a>
      </div>
      </>
    ),
    recht: (
      <>
      <div className="card" id="legal">
        <h3>Rechtliches</h3>
        <LegalLinks />
        <p className="muted small">Die Körper-Zeichnung stammt aus dem Open-Source-Paket „react-muscle-highlighter“ (MIT-Lizenz, © My Muscle Contributors; abgeleitet von „react-native-body-highlighter“, © 2022 ELABBASSI Hicham). Lizenztexte: THIRD_PARTY.md im Quellcode.</p>
      </div>
      </>
    ),
    news: (
      <div className="settings-list-text">
        {NEWS.map((n) => <div className="card" key={n.title}><h3>{n.title}</h3><p className="small">{n.text}</p></div>)}
      </div>
    ),
    faq: (
      <div className="settings-list-text">
        {FAQ.map((f) => <details className="card faq" key={f.q}><summary><strong>{f.q}</strong></summary><p className="small">{f.a}</p></details>)}
      </div>
    ),
  };
  // „alles“: die frühere lange Einstellungsseite (für Tests und Direktlinks)
  sections.alles = <><h2>Konto &amp; Einstellungen</h2>{sections.konto}{sections.profil}{sections.ziele}{sections.pro}{sections.themen}{sections.app}{sections.daten}{sections.recht}</>;
  const MENU: [string, [string, string, string][]][] = [
    ['Benutzer', [['profil', 'Profil', '#/konto/profil'], ['konto', 'Konto', '#/konto/konto'], ['pro', 'Pro', '#/konto/pro'], ['ziele', 'Ziele & Trainingsplan', '#/konto/ziele'], ['statistik', 'Statistiken', '#/fortschritt']]],
    ['Einstellungen', [['erinnerungen', 'Erinnerungen', '#/konto/erinnerungen'], ['themen', 'Themen & Farben', '#/konto/themen'], ['daten', 'Daten & Backup', '#/konto/daten'], ['app', 'App & Version', '#/konto/app']]],
    ['Ressourcen', [['faq', 'Häufig gestellte Fragen', '#/konto/faq'], ['news', 'Neuigkeiten', '#/konto/news']]],
    ['Rechtliches', [['recht', 'Datenschutz, Bedingungen, Lizenzen', '#/konto/recht']]],
  ];
  const TITLES = Object.fromEntries(MENU.flatMap(([, items]) => items.map(([id, label]) => [id, label])));
  if (section && sections[section]) {
    return (
      <>
        <div className="settings-head"><a className="back-link" href="#/konto" aria-label="Zurück zu den Einstellungen">←</a><h2>{TITLES[section]}</h2></div>
        {sections[section]}
      </>
    );
  }
  return (
    <>
      <h2>Einstellungen</h2>
      {MENU.map(([group, items]) => (
        <section key={group} className="settings-group">
          <h3 className="settings-group-title">{group}</h3>
          <ul className="settings-list">
            {items.filter(([id]) => (id !== 'pro' || api.social) && (id !== 'konto' || true)).map(([id, label, href]) => (
              <li key={id}><a href={href} className="settings-item" data-menu={id}><span className="settings-icon"><SettingsIcon id={id} /></span><span className="settings-label">{label}</span><span className="settings-chev" aria-hidden="true">›</span></a></li>
            ))}
          </ul>
        </section>
      ))}
      {api.mode === 'cloud' && <button className="settings-logout" id="sign-out-menu" onClick={() => api.signOut()}>Abmelden</button>}
    </>
  );
}

/** Profil für Freunde (Cloud): Anzeigename, Sichtbarkeit, blockierte Personen */
function AvatarEditor({ name }: { name: string }) {
  const { api, user, showError } = useApp();
  const social = api.social!;
  const url = useAvatarUrl(user?.id);
  const [busy, setBusy] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const save = async (jpeg: Blob) => {
    setBusy(true);
    try {
      await social.uploadAvatar(jpeg);
      await refreshAvatars(social);
      setCropFile(null);
    } catch (err) {
      showError(err instanceof Error && /bucket|not found|storage|function/i.test(err.message) ? new Error('Profilbild ist noch nicht verfügbar – in Supabase fehlt das neue SQL (Version 44).') : err);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await social.removeAvatar();
      await refreshAvatars(social);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="avatar-editor" id="avatar-editor">
      <AvatarDot name={name} userId={user?.id} size={72} me />
      <div className="avatar-editor-actions">
        <label className={`btn small-btn${busy ? ' disabled' : ''}`}>
          {url ? 'Foto ändern' : 'Foto wählen'}
          <input type="file" id="avatar-file" accept="image/*" hidden disabled={busy} onChange={(e) => { setCropFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        </label>
        {url && <button className="btn small-btn" id="avatar-remove" disabled={busy} onClick={remove}>Entfernen</button>}
        <p className="muted small">Nur deine Freunde sehen dein Foto. Du kannst es vor dem Speichern verschieben und vergrößern.</p>
      </div>
      {cropFile && <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={save} />}
    </div>
  );
}

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
      <AvatarEditor name={current} />
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
      if (!(await ask('Alle aktuellen Daten in diesem Browser werden ersetzt.', { title: 'Backup einspielen?', ok: 'Ersetzen', danger: true }))) return;
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
