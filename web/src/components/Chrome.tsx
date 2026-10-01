// Rahmen der App: Kopfzeile (Level, Serie, Credits, Menü), Reiter unter „Ränge“, untere Leiste, Update-Hinweis.
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { displayName } from '../app/profile';
import { sectionOf, useHash, type Section } from '../app/router';
import { hasDraft } from '../lib/editor';
import { NavIcon, type NavIconId } from './NavIcons';
import type { Game } from '../app/game';
import { SCHEMA_VERSION } from '../data/config';
import { useCosmetics } from '../lib/cosmetics';
import { WEB_URL } from '../lib/platform';
import { fmt } from '../lib/format';
import { fetchServerVersion, hardReload } from '../lib/update';
import { APP_VERSION } from '../version';
import { Coin, Flame, MenuIcon } from './Icons';

export function Header({ game }: { game: Game | null }) {
  const { api, user } = useApp();
  const [open, setOpen] = useState(false);
  const { admin } = useCosmetics();
  const hash = useHash();
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [hash]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <header className="topbar">
        <h1 id="app-title">
          <a href="#/">🏋️ Level Up</a>
        </h1>
      </header>
    );
  }
  const p = game?.player;
  return (
    <header className="topbar">
      <a className="hud-player" id="hud-player" href="#/profil" aria-label="Profil">
        <span className="avatar-sm" id="hud-avatar">{displayName(api, user).slice(0, 1).toUpperCase()}</span>
        <span className="hud-level">
          <strong id="hud-level">Lv.{p?.level ?? 1}</strong>
          <span className="xp-bar">
            <span id="hud-xp" style={{ width: p ? `${Math.round((p.into / p.needed) * 100)}%` : 0 }} />
          </span>
        </span>
      </a>
      <a className="hud-stat" id="hud-streak" href="#/" title={game ? `Serie: ${game.streak} Tage · Wochenziel ${game.weekDone}/${game.weekGoal}` : "Serie"}>
        <Flame />
        <strong>{game?.streak ?? 0}</strong>
      </a>
      <a className="hud-stat" id="hud-credits" href={api.social ? '#/shop' : '#/aufgaben'} title={api.social ? 'Guthaben – zum Shop' : 'Credits'}>
        <Coin />
        <strong>{fmt(game?.balance ?? 0, 0)}</strong>
      </a>
      <button
        className="menu-btn"
        id="menu-btn"
        aria-label="Menü"
        aria-expanded={open}
        aria-controls="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="menu" id="menu" ref={menuRef}>
          <a href="#/konto">Konto &amp; Einstellungen</a>
          {api.social && <a href="#/shop">Shop</a>}
          {admin && <a href="#/admin" id="menu-admin">🛠 Admin-Menü</a>}
          <a href="#/backup">Backup</a>
          {api.mode === 'cloud' && (
            <button id="menu-signout" onClick={() => api.signOut()}>
              Abmelden
            </button>
          )}
        </div>
      )}
    </header>
  );
}

const SUBNAV: [string, string][] = [
  ['#/raenge', 'Rang'],
  ['#/koerper', 'Körpergraph'],
  ['#/rekorde', 'Rekorde'],
  ['#/fortschritt', 'Analyse'],
];

export function SubNav() {
  const hash = useHash();
  if (sectionOf(hash) !== 'raenge') return null;
  return (
    <nav id="subnav" className="subnav" aria-label="Ränge">
      {SUBNAV.map(([href, label]) => (
        <a key={href} href={href} className={hash === href ? 'active' : ''}>
          {label}
        </a>
      ))}
    </nav>
  );
}

// Aufbau: Home · Ränge · [Workout-Knopf in der Mitte] · Freunde · Profil.
// Die aktive Seite wird breiter und zeigt ihren Namen; die übrigen zeigen nur das Symbol.
const NAV_LEFT: [string, Section, NavIconId, string][] = [
  ['#/', 'home', 'home', 'Home'],
  ['#/raenge', 'raenge', 'raenge', 'Ränge'],
];
const NAV_RIGHT: [string, Section, NavIconId, string][] = [
  ['#/freunde', 'freunde', 'freunde', 'Freunde'],
  ['#/profil', 'profil', 'profil', 'Profil'],
];

export function BottomNav() {
  const hash = useHash();
  const section = sectionOf(hash);
  const running = hasDraft();
  const item = ([href, id, icon, label]: [string, Section, NavIconId, string]) => (
    <a key={id} href={href} data-section={id} className={`nav-tab${section === id ? ' active' : ''}`} aria-current={section === id ? 'page' : undefined}>
      <span className="nav-pill">
        <NavIcon id={icon} />
        <span className="nav-label">{label}</span>
      </span>
    </a>
  );
  return (
    <nav id="nav" className="bottom-nav" aria-label="Hauptnavigation">
      <div className="nav-group">{NAV_LEFT.map(item)}</div>
      <a
        href={running ? '#/neu' : '#/workouts'}
        data-section="workouts"
        className={`nav-start${section === 'workouts' ? ' active' : ''}${running ? ' running' : ''}`}
        aria-label={running ? 'Laufendes Training öffnen' : 'Workout starten'}
      >
        <span className="nav-fab"><NavIcon id="workout" /></span>
        <span className="nav-start-label">Workout</span>
      </a>
      <div className="nav-group">{NAV_RIGHT.map(item)}</div>
    </nav>
  );
}

const CHECK_EVERY_MS = 5 * 60 * 1000;

/** Fragt den Server nach einer neueren Version und bietet das Update an. */
export function UpdateBanner() {
  const [server, setServer] = useState<string | null>(null);
  useEffect(() => {
    let last = 0;
    const check = async (force = false) => {
      if (!force && Date.now() - last < CHECK_EVERY_MS) return;
      last = Date.now();
      const v = await fetchServerVersion();
      if (v && v !== APP_VERSION) setServer(v);
    };
    const onVisible = () => document.visibilityState === 'visible' && check();
    const onShow = () => check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onShow);
    check(true);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);
  if (!server) return null;
  return (
    <div id="update-banner" className="update-banner" role="status">
      <span>
        Neue Version verfügbar <small className="update-version">{server}</small>
      </span>
      <button className="btn small-btn primary" onClick={hardReload}>
        Aktualisieren
      </button>
    </div>
  );
}

/** Nur für den Admin: Die Datenbank ist älter als die App → SQL auf der Einrichtungsseite ausführen.
 *  Auch nach einem Update ohne Admin-Kennzeichen (altes SQL) erscheint der Hinweis, wenn dieses Gerät
 *  schon einmal als Admin angemeldet war. */
export function DbUpdateBanner() {
  const { api } = useApp();
  const { admin } = useCosmetics();
  const [outdated, setOutdated] = useState(false);
  useEffect(() => {
    if (!api.social) return;
    let wasAdmin = false;
    try {
      if (admin) localStorage.setItem(WAS_ADMIN_KEY, '1');
      wasAdmin = localStorage.getItem(WAS_ADMIN_KEY) === '1';
    } catch {
      /* ignorieren */
    }
    if (!admin && !wasAdmin) return;
    let alive = true;
    api.social.schemaVersion().then(
      (v) => alive && setOutdated(v < SCHEMA_VERSION),
      () => alive && setOutdated(true), // Funktion fehlt → SQL ist älter
    );
    return () => void (alive = false);
  }, [api, admin]);
  if (!outdated) return null;
  return (
    <div id="db-update-banner" className="update-banner" role="status">
      <span>Datenbank-Update nötig (SQL einmal ausführen)</span>
      <a className="btn small-btn primary" href={`${WEB_URL}supabase/einrichten.html`} target="_blank" rel="noopener">
        Öffnen
      </a>
    </div>
  );
}
const WAS_ADMIN_KEY = 'gym-tracker-was-admin';
