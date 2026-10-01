// Verlauf und Detailansicht eines gespeicherten Trainings.
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { navigate } from '../app/router';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading, WorkoutList } from '../components/Bits';
import { groupSets, numberSets } from '../lib/editor';
import { fmt, fmtDate } from '../lib/format';
import { playerLevel } from '../lib/xp';

export function History() {
  const game = useGame();
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  return (
    <>
      <h2>Verlauf</h2>
      <WorkoutList workouts={game.data.workouts} sets={game.data.sets} empty={<p className="muted">Noch keine Trainings erfasst.</p>} />
    </>
  );
}

export function WorkoutDetail({ id }: { id: number }) {
  const { api, exerciseById, showError, dataVersion, dataChanged } = useApp();
  const game = useGame();
  const workout = useAsync(() => api.getWorkout(id), [api, id, dataVersion]);
  if (game.status === 'loading' || workout.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  if (workout.status === 'error') return <LoadError error={workout.error} />;
  const g = game.data;
  const w = workout.data;
  const earned = g.progress.perWorkout.get(id);
  // Level-Up nur beim neuesten Training: Stand vorher = heute minus dieses Training und die Aufgaben dieses Tages
  const latest = [...g.progress.perWorkout.entries()].sort((a, b) => b[1].date.localeCompare(a[1].date) || b[0] - a[0])[0];
  const isLatest = latest?.[0] === id && earned;
  const questBonus = isLatest ? g.quests.byDate.get(earned.date) || 0 : 0;
  const levelAfter = g.player.level;
  const levelBefore = isLatest ? playerLevel(g.credits - earned.credits - questBonus).level : levelAfter;

  const remove = async () => {
    if (!confirm('Dieses Training wirklich löschen?')) return;
    try {
      await api.deleteWorkout(id);
      dataChanged();
      navigate('#/verlauf');
    } catch (err) {
      showError(err);
    }
  };

  const groups = groupSets(w.sets);
  return (
    <>
      <p>
        <a href="#/verlauf" className="link">← Verlauf</a>
      </p>
      <h2>{fmtDate(w.date)}</h2>
      {earned?.credits ? (
        <div className="card credits-card">
          <div className="credits-total">
            +{earned.credits + questBonus} <small>Credits</small>
          </div>
          {levelAfter > levelBefore && <p className="level-up">Level-Up! Du bist jetzt Level {levelAfter}.</p>}
          <ul className="credit-items">
            {earned.items.map((i, k) => (
              <li key={k}>
                <span>{i.label}</span>
                <strong>+{i.credits}</strong>
              </li>
            ))}
            {questBonus ? (
              <li>
                <span>Aufgaben erledigt</span>
                <strong>+{questBonus}</strong>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {w.notes && <div className="card notes">{w.notes}</div>}
      {groups.length ? (
        groups.map(({ exercise, sets }, gi) => {
          const ex = exerciseById(exercise);
          const cardio = ex?.type === 'cardio';
          return (
            <div className="card" key={gi}>
              <h3>{ex?.name ?? 'Unbekannte Übung'}</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    {cardio ? (<><th>Dauer</th><th>Distanz</th></>) : (<><th>Wdh.</th><th>Gewicht</th></>)}
                  </tr>
                </thead>
                <tbody>
                  {numberSets(sets).map(([s, label], si) => (
                    <tr key={si}>
                      <td className={label === 'A' ? 'warmup-label' : ''}>{label}</td>
                      {cardio ? (
                        <>
                          <td>{s.duration_min != null ? `${fmt(s.duration_min)} min` : '–'}</td>
                          <td>{s.distance_km != null ? `${fmt(s.distance_km, 2)} km` : '–'}</td>
                        </>
                      ) : (
                        <>
                          <td>{s.reps ?? '–'}</td>
                          <td>{s.weight_kg != null ? `${fmt(s.weight_kg, 2)} kg` : '–'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      ) : (
        <p className="muted">Keine Sätze gespeichert.</p>
      )}
      <div className="row">
        <a className="btn" href={`#/training/${id}/bearbeiten`}>Bearbeiten</a>
        <button className="btn danger" id="delete" onClick={remove}>Löschen</button>
      </div>
    </>
  );
}
