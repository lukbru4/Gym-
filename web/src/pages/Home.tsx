// Home: Umschalter „Mein Feed | Freunde“, Begrüßung mit Rückblick (laufendes Training: Zeile über der Leiste), Aufgaben, Körpergraph, Wochenstatistik.
import { useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { useAsync } from '../app/useAsync';
import { BodyGraph } from '../components/BodyGraph';
import { CreditsRules, LoadError, Loading, QuestRows, WorkoutList } from '../components/Bits';
import { ChartView } from '../components/ChartView';
import { RecapCard } from '../components/Recap';
import { migrateToCloud, migrationDone, readLocalData } from '../data/migrate';
import { datedSets } from '../lib/editor';
import { fmt, fmtShortDate, plural } from '../lib/format';
import { strengthLevels } from '../lib/muscles';
import { todayISO, weeklySummary } from '../lib/stats';
import { APP_VERSION } from '../version';
import { notify } from '../components/Dialog';

export function HomeTabs({ active }: { active: 'mine' | 'friends' }) {
  const tab = (id: 'mine' | 'friends', href: string, label: string) => (
    <a className={`seg-tab${active === id ? ' active' : ''}`} href={href} role="tab" aria-selected={active === id}>
      {label}
    </a>
  );
  return (
    <nav className="seg" role="tablist" aria-label="Feed">
      {tab('mine', '#/', 'Mein Feed')}
      {tab('friends', '#/feed/freunde', 'Freunde')}
    </nav>
  );
}

function MigrateCard() {
  const { api, user, exercises, setExercises, showError, dataChanged } = useApp();
  const [status, setStatus] = useState('Die lokale Kopie bleibt zur Sicherheit erhalten.');
  const [busy, setBusy] = useState(false);
  const localData = api.mode === 'cloud' && user && !migrationDone(user.id) ? readLocalData() : null;
  if (!localData || !user) return null;
  const run = async () => {
    setBusy(true);
    try {
      const r = await migrateToCloud(localData, api, exercises, user.id, setStatus);
      setExercises(r.cloudExercises);
      await notify(`Übertragen: ${plural(r.workouts, 'Training', 'Trainings')}, ${plural(r.weights, 'Gewichtseintrag', 'Gewichtseinträge')}, ${plural(r.templates, 'Vorlage', 'Vorlagen')}.`);
      dataChanged();
    } catch (err) {
      setBusy(false);
      setStatus('Übertragung abgebrochen – du kannst es erneut versuchen.');
      showError(err);
    }
  };
  return (
    <div className="card highlight" id="migrate-card">
      <h3>Lokale Daten gefunden</h3>
      <p className="small">
        Auf diesem Gerät liegen noch {plural(localData.workouts.length, 'Training', 'Trainings')},{' '}
        {plural((localData.body_weights || []).length, 'Gewichtseintrag', 'Gewichtseinträge')} und{' '}
        {plural((localData.templates || []).length, 'Vorlage', 'Vorlagen')} aus dem lokalen Modus.
      </p>
      <button className="btn primary block" id="migrate" disabled={busy} onClick={run}>
        In mein Konto übertragen
      </button>
      <p className="muted small" id="migrate-status">{status}</p>
    </div>
  );
}

export function Home() {
  const { api, exerciseMap, dataVersion } = useApp();
  const game = useGame();
  const weights = useAsync(() => api.listBodyWeights(), [api, dataVersion]);
  if (game.status === 'loading' || weights.status === 'loading') return <><HomeTabs active="mine" /><Loading /></>;
  if (game.status === 'error') return <LoadError error={game.error} />;
  if (weights.status === 'error') return <LoadError error={weights.error} />;
  const g = game.data;
  const today = todayISO();
  const weeks = weeklySummary(g.workouts, g.sets, today, 8);
  const levels = strengthLevels(datedSets(g.workouts, g.sets), exerciseMap(), today);
  const thisWeek = weeks[weeks.length - 1];
  const lastWeight = weights.data[weights.data.length - 1];
  const labels = weeks.map((w) => fmtShortDate(w.start));

  return (
    <>
      <HomeTabs active="mine" />
      <RecapCard workouts={g.workouts} sets={g.sets} today={today} />
      <MigrateCard />
      {api.mode === 'local' && (
        <p className="notice small">
          Lokaler Modus: Deine Daten liegen nur in diesem Browser. Sichere sie regelmäßig über ☰ → <a href="#/backup">Backup</a>.
        </p>
      )}
      <a className="card quests-mini" href="#/aufgaben">
        <div className="block-head">
          <h3>Heutige Aufgaben</h3>
          <span className="muted small">
            {g.quests.today.filter((q) => q.done).length} / {g.quests.today.length}
          </span>
        </div>
        <QuestRows list={g.quests.today} />
      </a>
      <a className="bodygraph-link" href="#/koerper" aria-label="Körpergraph öffnen">
        <BodyGraph levels={levels} />
      </a>
      <a className="btn primary block big" href="#/workouts">Workout starten</a>
      <CreditsRules />
      <h2>Diese Woche</h2>
      <div className="tiles">
        <div className="tile"><span className="tile-value">{thisWeek.workouts}</span><span className="tile-label">Trainings</span></div>
        <div className="tile"><span className="tile-value">{fmt(thisWeek.volume, 0)}</span><span className="tile-label">kg Volumen</span></div>
        <div className="tile"><span className="tile-value">{fmt(thisWeek.cardioMin, 0)}</span><span className="tile-label">Min. Cardio</span></div>
        <div className="tile">
          <span className="tile-value">{lastWeight ? fmt(lastWeight.weight_kg) : '–'}</span>
          <span className="tile-label">kg Körpergewicht{lastWeight ? ` (${fmtShortDate(lastWeight.date)})` : ''}</span>
        </div>
      </div>
      <div className="card">
        <h3>Trainings pro Woche</h3>
        <ChartView type="bar" labels={labels} series={[{ label: 'Trainings', data: weeks.map((w) => w.workouts), color: '--series-1' }]} unit="Trainings" integer ariaLabel="Trainings pro Woche" id="c-count" />
      </div>
      <div className="card">
        <h3>Volumen pro Woche</h3>
        <p className="muted small">Summe aus Wiederholungen × Gewicht aller Kraftsätze</p>
        <ChartView type="bar" labels={labels} series={[{ label: 'Volumen', data: weeks.map((w) => Math.round(w.volume)), color: '--series-1' }]} unit="kg" ariaLabel="Volumen pro Woche" id="c-volume" />
      </div>
      <h2>Letzte Trainings</h2>
      <WorkoutList workouts={g.workouts.slice(0, 3)} sets={g.sets} empty={<p className="muted">Noch keine Trainings erfasst.</p>} />
      <p className="muted small center">App-Version {APP_VERSION}</p>
    </>
  );
}
