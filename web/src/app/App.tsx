// Wurzel der App: startet das Backend, verwaltet Login und Übungen, wählt die Seite zur Adresse (#/…).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BottomNav, DbUpdateBanner, Header, SubNav, UpdateBanner } from '../components/Chrome';
import { PreviewBar } from '../components/PreviewBar';
import { WorkoutBar } from '../components/WorkoutBar';
import { RestTimer } from '../components/RestTimer';
import type { Backend } from '../data/backend';
import { createBackend } from '../data/api';
import { clearDraft } from '../lib/editor';
import type { Exercise, User } from '../lib/types';
import { Account, Backup } from '../pages/Account';
import { Auth, SetNewPassword } from '../pages/Auth';
import { Body } from '../pages/Body';
import { Editor } from '../pages/Editor';
import { Home } from '../pages/Home';
import { AcceptInvite, FriendProfile, Friends, FriendsFeed } from '../pages/Friends';
import { Medals, Profile, Quests } from '../pages/Profile';
import { Shop } from '../pages/Shop';
import { Admin } from '../pages/Admin';
import { getCosmetics, setCosmetics } from '../lib/cosmetics';
import { setServerCatalog } from '../lib/shop';
import { enforceSchemeRules } from '../lib/theme';
import { getWeekGoal, setLocalWeekGoal } from '../lib/weekGoal';
import { Analysis, Ranks } from '../pages/Ranks';
import { Quiz } from '../pages/Quiz';
import { ProPage } from '../components/Pro';
import { setPro } from '../lib/pro';
import { History, WorkoutDetail } from '../pages/Workout';
import { StartFromTemplate, Workouts } from '../pages/Workouts';
import { AppProvider, useApp } from './context';
import { loadGame } from './game';
import { GameProvider } from './gameContext';
import { redirect, useHash } from './router';
import { useAsync } from './useAsync';
import { DialogHost } from '../components/Dialog';
import { NumberPickerHost } from '../components/NumberPicker';

type Route = [RegExp, (m: RegExpMatchArray) => ReactNode];
const ROUTES: Route[] = [
  [/^#?\/?$/, () => <Home />],
  [/^#\/feed\/freunde$/, () => <FriendsFeed />],
  [/^#\/neu$/, () => <Editor mode="live" />],
  [/^#\/workouts$/, () => <Workouts />],
  [/^#\/start\/(\d+)$/, (m) => <StartFromTemplate id={Number(m[1])} />],
  [/^#\/vorlage\/neu$/, () => <Editor mode="template" />],
  [/^#\/vorlage\/(\d+)$/, (m) => <Editor mode="template" id={Number(m[1])} />],
  [/^#\/training\/(\d+)$/, (m) => <WorkoutDetail id={Number(m[1])} />],
  [/^#\/training\/(\d+)\/bearbeiten$/, (m) => <Editor mode="edit" id={Number(m[1])} />],
  [/^#\/verlauf$/, () => <History />],
  [/^#\/fortschritt$/, () => <Analysis />],
  [/^#\/koerper$/, () => <Body />],
  [/^#\/backup$/, () => <Backup />],
  [/^#\/konto$/, () => <Account />],
  [/^#\/fragen$/, () => <Quiz />],
  [/^#\/pro$/, () => <ProPage />],
  [/^#\/raenge$/, () => <Ranks />],
  [/^#\/freunde$/, () => <Friends />],
  [/^#\/freunde\/add\/([A-Za-z0-9]{8})$/, (m) => <AcceptInvite code={m[1].toUpperCase()} />],
  [/^#\/freunde\/profil\/([0-9a-f-]{36})$/, (m) => <FriendProfile userId={m[1]} />],
  [/^#\/profil$/, () => <Profile />],
  [/^#\/aufgaben$/, () => <Quests />],
  [/^#\/medaillen$/, () => <Medals />],
  [/^#\/shop$/, () => <Shop />],
  [/^#\/admin$/, () => <Admin />],
];

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div id="toast" className="toast" role="alert">
      Fehler: {message}
    </div>
  );
}

/** Angemeldeter Bereich: Spielstand laden, Kopfzeile, Seite, Navigation */
function Shell() {
  const { api, exerciseMap, exercises, dataVersion, dataChanged } = useApp();
  const hash = useHash();
  const game = useAsync(() => loadGame(api, exerciseMap()), [api, hash, exercises, dataVersion]);
  // Kopfzeile behält den letzten Stand, während die nächste Seite lädt
  const lastGame = useRef(game.status === 'ok' ? game.data : null);
  if (game.status === 'ok') lastGame.current = game.data;
  useEffect(() => window.scrollTo(0, 0), [hash]);
  // Gekaufte/ausgerüstete Shop-Artikel einmal laden (fehlt das SQL noch, bleibt alles beim Standard)
  // Danach gilt: Farbschemata nur, wenn gekauft (Admin: alle)
  useEffect(() => {
    const social = api.social;
    if (!social) {
      setPro({ pro: false }); // lokaler Modus: kein Pro
      return enforceSchemeRules([], false); // kein Shop → Standardfarben
    }
    social.catalog().then(setServerCatalog, () => {});
    social.myPro().then(setPro, () => setPro({ pro: false }));
    // Wochenziel aus dem Konto; ändert es sich, Spielstand (Serie) neu berechnen
    social.myWeekGoal().then((g) => {
      if (g !== getWeekGoal()) {
        setLocalWeekGoal(g);
        dataChanged();
      }
    }, () => {});
    social.myShop().then(
      (c) => {
        setCosmetics(c);
        const st = getCosmetics();
        enforceSchemeRules(st.owned, st.admin);
      },
      () => setCosmetics({ owned: [], equipped: {} }),
    );
  }, [api, dataChanged]);

  let page: ReactNode = null;
  for (const [re, render] of ROUTES) {
    const m = hash.match(re);
    if (m) {
      page = render(m);
      break;
    }
  }
  useEffect(() => {
    if (page === null) redirect(hash === '#/gewicht' ? '#/koerper' : '#/');
  }, [page, hash]);

  return (
    <GameProvider value={game}>
      <Header game={lastGame.current} />
      <UpdateBanner />
      <DbUpdateBanner />
      <SubNav />
      <main id="view" className="container" key={hash}>
        {page}
      </main>
      <WorkoutBar />
      <BottomNav />
      <RestTimer />
      <PreviewBar />
    </GameProvider>
  );
}

export function App() {
  const [api, setApi] = useState<Backend | null>(null);
  const [startError, setStartError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  // Link „Passwort zurücksetzen“ aus der Mail: vor dem Start merken (Supabase entfernt den Hash danach)
  const [recovery, setRecovery] = useState(() => /type=recovery/.test(location.hash));
  const toastTimer = useRef<number>(undefined);

  const showError = useCallback((err: unknown) => {
    console.error(err);
    const msg = (err as { message?: string })?.message || String(err);
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const backend = await createBackend();
      const u = await backend.getUser();
      // Beim Öffnen der App immer auf Home starten (erst nach getUser(), damit Supabase
      // einen Login-Link mit #access_token=… schon ausgewertet hat).
      // Ausnahme: Einladungslinks (#/freunde/add/CODE) bleiben erhalten.
      const keep = /^#\/freunde\/add\//.test(location.hash);
      if (!keep && location.hash !== '' && location.hash !== '#/') history.replaceState(null, '', `${location.pathname}${location.search}#/`);
      const list = u ? await backend.listExercises() : [];
      if (!alive) return;
      setApi(backend);
      setUser(u);
      setExercises(list);
      backend.onAuthChange((next) => {
        setUser((prev) => {
          if (next?.id === prev?.id) return prev;
          // Supabase empfiehlt, im Auth-Callback keine weiteren Supabase-Aufrufe abzuwarten.
          setTimeout(async () => {
            const ex = next ? await backend.listExercises().catch((e) => (showError(e), [])) : [];
            if (!next) clearDraft();
            setExercises(ex);
          }, 0);
          return next;
        });
      });
    })().catch((err) => {
      console.error(err);
      if (alive) setStartError(err instanceof Error ? err : new Error(String(err)));
    });
    return () => {
      alive = false;
    };
  }, [showError]);

  if (startError) {
    return (
      <main id="view" className="container">
        <div className="card">
          <h2>App konnte nicht starten</h2>
          <p className="muted">{startError.message}</p>
          <p>
            Prüfe deine Internetverbindung und lade die Seite neu. Im privaten Modus erlaubt der Browser manchmal keinen Speicher –
            öffne die Seite dann in einem normalen Fenster.
          </p>
        </div>
      </main>
    );
  }
  if (!api) {
    return (
      <main id="view" className="container">
        <p className="muted center">Lädt …</p>
      </main>
    );
  }
  return (
    <AppProvider api={api} user={user} exercises={exercises} setExercises={setExercises} showError={showError}>
      {user && recovery ? (
        <>
          <Header game={null} />
          <main id="view" className="container">
            <SetNewPassword onDone={() => setRecovery(false)} />
          </main>
        </>
      ) : user ? (
        <Shell />
      ) : (
        <>
          <Header game={null} />
          <main id="view" className="container">
            <Auth />
          </main>
        </>
      )}
      <Toast message={toast} />
      <DialogHost />
      <NumberPickerHost />
    </AppProvider>
  );
}
