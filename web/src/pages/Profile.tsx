// Profil mit Avatar, Kacheln und Kalender; Aufgaben; Medaillen; Freunde (Vorschau).
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { displayName } from '../app/profile';
import { useAsync } from '../app/useAsync';
import { Avatar } from '../components/Avatar';
import { AvatarDot } from '../components/AvatarDot';
import { TileIcon, type TileIconId } from '../components/TileIcons';
import { LoadError, Loading, QuestRows } from '../components/Bits';
import { Calendar } from '../components/Calendar';
import { RankBadge } from '../components/RankBadge';
import { useCosmetics } from '../lib/cosmetics';
import { fmt, fmtDate } from '../lib/format';
import { fmtEuro, PRO_PRICES, usePro } from '../lib/pro';
import { itemById } from '../lib/shop';
import { computeMedals, longestStreak } from '../lib/quests';
import type { Game } from '../app/game';

function useMedals(g: Game | null) {
  const { api, dataVersion } = useApp();
  const templates = useAsync(() => api.listTemplates(), [api, dataVersion]);
  if (!g || templates.status !== 'ok') return { templates, medals: null };
  const medals = computeMedals(g.progress.perWorkout, {
    maxStreak: longestStreak(g.workouts.map((w) => w.date)),
    level: g.player.level,
    templates: templates.data.length,
  });
  return { templates, medals };
}

export function Profile() {
  const { api, user } = useApp();
  const game = useGame();
  const { equipped } = useCosmetics();
  const pro = usePro();
  const showPro = api.mode === 'cloud' && pro.loaded && !pro.pro;
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  const g = game.data;
  const tile = (href: string, icon: TileIconId, label: string, sub?: string) => (
    <a className={`tile-link${sub ? ' wide' : ''}`} href={href}>
      <span className="tile-icon" aria-hidden="true"><TileIcon id={icon} /></span>
      <span className="tile-text">
        <strong>{label}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {sub && <span className="tile-chev" aria-hidden="true">›</span>}
    </a>
  );
  return (
    <>
      <div className="profile-hero">
        <div className="profile-top">
          <div className="profile-id">
            {api.social && <AvatarDot name={displayName(api, user)} userId={user?.id} size={56} me />}
            <div>
              <h2>{displayName(api, user)}</h2>
              {itemById(equipped.title) && <p className="player-title">„{itemById(equipped.title)!.name}“</p>}
            </div>
          </div>
          <RankBadge rank={g.overall} size={72} />
        </div>
        <Avatar level={g.player.level} skin={equipped.skin} />
        <p className="muted small center">
          Level {g.player.level} · {g.overall.label} · {fmt(g.credits, 0)} Credits
        </p>
      </div>
      <div className="tile-grid">
        {tile('#/aufgaben', 'aufgaben', 'Aufgaben')}
        {tile('#/medaillen', 'medaillen', 'Medaillen')}
        {tile('#/workouts', 'vorlagen', 'Vorlagen')}
        {tile('#/verlauf', 'verlauf', 'Verlauf')}
        {tile('#/koerper', 'gewicht', 'Gewicht')}
        {tile('#/konto', 'einstellungen', 'Einstellungen')}
        {api.social && tile('#/essen', 'essen', 'Essen', 'Kalorien & Nährwerte tracken')}
        {api.social ? tile('#/shop', 'shop', 'Shop', 'Farben & Titel mit Credits') : tile('#/backup', 'backup', 'Backup', 'Daten sichern und wiederherstellen')}
      </div>
      {showPro && (
        <a className="card pro-teaser" id="pro-teaser" href="#/pro">
          <strong>Level Up Pro</strong>
          <span className="small">Trainingsplan, Muskel-Auswertung, Kalorien tracken und mehr – ab {fmtEuro(PRO_PRICES.year / 12)} im Monat. Antippen zum Ansehen.</span>
        </a>
      )}
      <Calendar workouts={g.workouts} />
    </>
  );
}

export function Quests() {
  const game = useGame();
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  const g = game.data;
  const earnedToday = g.quests.byDate.get(g.today) || 0;
  return (
    <>
      <h2>Aufgaben</h2>
      <p className="muted small">
        Erledigte Aufgaben bringen Credits. Heute schon verdient: <strong>+{earnedToday}</strong> · insgesamt aus Aufgaben:{' '}
        <strong>{fmt(g.quests.total, 0)}</strong> Credits.
      </p>
      <div className="card">
        <div className="block-head"><h3>Täglich</h3><span className="muted small">neu ab Mitternacht</span></div>
        <QuestRows list={g.quests.today} />
      </div>
      <div className="card">
        <div className="block-head"><h3>Wöchentlich</h3><span className="muted small">neu ab Montag</span></div>
        <QuestRows list={g.quests.week} />
      </div>
    </>
  );
}

export function Medals() {
  const game = useGame();
  const { templates, medals } = useMedals(game.status === 'ok' ? game.data : null);
  if (game.status === 'loading' || templates.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  if (templates.status === 'error') return <LoadError error={templates.error} />;
  const list = medals!;
  return (
    <>
      <h2>Medaillen</h2>
      <p className="muted small">{list.filter((m) => m.done).length} von {list.length} freigeschaltet.</p>
      <div className="medal-grid">
        {list.map((m) => (
          <div key={m.id} className={`medal ${m.done ? 'unlocked' : ''}`}>
            <span className="medal-icon" aria-hidden="true">{m.done ? '🏅' : '🔒'}</span>
            <strong>{m.name}</strong>
            <span className="muted small">{m.text}</span>
            {m.done && m.date && <span className="muted small">{fmtDate(m.date, false)}</span>}
          </div>
        ))}
      </div>
    </>
  );
}
