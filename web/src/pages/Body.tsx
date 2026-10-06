// Körpergraph (antippbar), Muskel-Radar, Muskelzuordnung eigener Übungen und Körpergewicht.
import { useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { useAsync } from '../app/useAsync';
import { BodyGraph } from '../components/BodyGraph';
import { LoadError, Loading, MuscleChips } from '../components/Bits';
import { ChartView } from '../components/ChartView';
import { Radar } from '../components/Radar';
import { useCosmetics } from '../lib/cosmetics';
import { datedSets } from '../lib/editor';
import { fmt, fmtDate, fmtShortDate, parseNum } from '../lib/format';
import { LEVELS, MUSCLE_NAMES, musclesOf, strengthLevels } from '../lib/muscles';
import { todayISO } from '../lib/stats';
import type { Exercise, MuscleId } from '../lib/types';
import { ask } from '../components/Dialog';
import { pickNumber } from '../components/NumberPicker';

const pct = (g: number | null) => (g == null ? '' : `${g >= 0 ? '+' : ''}${fmt(g * 100, 0)} %`);

function AssignForm({ ex, used }: { ex: Exercise; used: boolean }) {
  const { api, addExercise, showError } = useApp();
  const [muscles, setMuscles] = useState<MuscleId[]>([]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!muscles.length) return showError(new Error('Bitte mindestens einen Muskel auswählen.'));
    try {
      addExercise(await api.updateExercise(ex.id, { muscles }));
    } catch (err) {
      showError(err);
    }
  };
  return (
    <form className="assign" data-ex={ex.id} onSubmit={submit}>
      <strong>{ex.name}</strong>
      {!used && <span className="muted small"> (noch nicht trainiert)</span>}
      <MuscleChips selected={muscles} onChange={setMuscles} />
      <button className="btn small-btn" type="submit">Speichern</button>
    </form>
  );
}

export function Body() {
  const { api, exercises, exerciseMap, showError, dataVersion, dataChanged } = useApp();
  const game = useGame();
  const cosmetics = useCosmetics();
  const weights = useAsync(() => api.listBodyWeights(), [api, dataVersion]);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState('');
  if (game.status === 'loading' || weights.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  if (weights.status === 'error') return <LoadError error={weights.error} />;

  const dated = datedSets(game.data.workouts, game.data.sets);
  const levels = strengthLevels(dated, exerciseMap(), todayISO());
  const trained = [...levels.entries()].filter(([, r]) => r.level > 0);
  const usedIds = new Set(dated.map((x) => x.exercise_id));
  const unassigned = exercises.filter((e) => e.type === 'strength' && e.user_id && !musclesOf(e).length);
  const list = weights.data;
  const sel = selected ? levels.get(selected)! : null;

  const saveWeight = async (e: FormEvent) => {
    e.preventDefault();
    const w = parseNum(weight);
    if (!w || Number.isNaN(w)) return showError(new Error('Bitte ein gültiges Gewicht eingeben.'));
    try {
      await api.saveBodyWeight(date, w);
      setWeight('');
      dataChanged();
    } catch (err) {
      showError(err);
    }
  };
  const removeWeight = async (id: number) => {
    if (!(await ask('Der Gewichtseintrag wird gelöscht.', { title: 'Eintrag löschen?', ok: 'Löschen', danger: true }))) return;
    try {
      await api.deleteBodyWeight(id);
      dataChanged();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <>
      <h2>Körpergraph</h2>
      <div className="card">
        <div className="muscle-name" id="muscle-name" aria-live="polite">
          {selected ? (
            <>
              <strong>{MUSCLE_NAMES.get(selected)}</strong>
              <span>{sel?.level ? `Stufe ${sel.level}` : 'noch nicht trainiert'}</span>
            </>
          ) : (
            <span>Tippe auf einen Muskel</span>
          )}
        </div>
        <BodyGraph levels={levels} onSelect={setSelected} />
        <ul className="legend skin-scope" data-skin={cosmetics.equipped.skin} aria-label="Legende">
          <li><span className="swatch" style={{ background: 'var(--neon-bg)' }} />nicht trainiert</li>
          {LEVELS.map((l) => (
            <li key={l.level}><span className="swatch" style={{ background: `var(--glow-${l.level})` }} />Stufe {l.level}: {l.label}</li>
          ))}
        </ul>
        <p className="muted small">
          Kraft-Stufe = wie stark dein geschätztes 1RM (Epley) seit deinem ersten Training gestiegen ist: bester Wert der letzten 30 Tage
          gegenüber dem ersten Training, gemittelt über alle Übungen des Muskels. Aufwärmsätze zählen nicht. Tippe auf einen Muskel für
          Details.
        </p>
        {trained.length ? (
          <details className="table-toggle">
            <summary>Als Tabelle anzeigen</summary>
            <table className="table">
              <thead><tr><th>Muskel</th><th>Stufe</th><th>Steigerung</th><th>Übungen</th></tr></thead>
              <tbody>
                {trained.map(([m, r]) => (
                  <tr key={m}>
                    <td>{MUSCLE_NAMES.get(m)}</td>
                    <td>{r.level}</td>
                    <td>{pct(r.gain)}</td>
                    <td className="small">
                      {r.exercises.map((x, i) => (
                        <div key={i}>{x.name}: {fmt(x.first)} → {fmt(x.current)} kg</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ) : (
          <p className="muted">Sobald du Krafttrainings gespeichert hast, färbt sich der Körper ein.</p>
        )}
        {sel && selected && (
          <p id="muscle-detail" className="notice small">
            <strong>{MUSCLE_NAMES.get(selected)}</strong>:{' '}
            {sel.level ? (
              <>
                Stufe {sel.level} ({pct(sel.gain)})
                {sel.exercises.map((x, i) => (
                  <span key={i}><br />{x.name}: {fmt(x.first)} → {fmt(x.current)} kg ({pct(x.gain)})</span>
                ))}
              </>
            ) : (
              'noch nicht trainiert'
            )}
          </p>
        )}
      </div>
      <div className="card">
        <h3>Muskel-Radar</h3>
        <Radar levels={levels} />
        <p className="muted small">
          Alle 12 Muskelgruppen auf einen Blick: je weiter außen der Punkt, desto höher die Kraft-Stufe (0–5). So siehst du schnell,
          welche Bereiche du vernachlässigst.
        </p>
      </div>
      {unassigned.length > 0 && (
        <div className="card">
          <h3>Übungen ohne Muskelzuordnung</h3>
          <p className="muted small">Diese eigenen Übungen erscheinen erst im Körpergraphen, wenn du ihnen Muskeln zuordnest.</p>
          {unassigned.map((e) => (
            <AssignForm key={e.id} ex={e} used={usedIds.has(e.id)} />
          ))}
        </div>
      )}
      <h2>Körpergewicht</h2>
      <form className="card" id="bw-form" onSubmit={saveWeight}>
        <div className="row pair">
          <label className="grow">
            Datum<input type="date" name="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="grow">
            Gewicht (kg)
            <input
              name="weight"
              inputMode="none"
              placeholder="antippen"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onClick={async () => {
                const last = list[list.length - 1]?.weight_kg;
                const v = await pickNumber({
                  title: 'Körpergewicht', unit: 'kg', value: weight || (last ? String(last) : '75'),
                  min: 30, max: 250, step: 0.1, bigStep: 0.5, itemW: 10, labelEvery: 10,
                });
                if (v !== null) setWeight(v);
              }}
            />
          </label>
        </div>
        <button className="btn primary block" type="submit">Speichern</button>
        <p className="muted small">Pro Tag gibt es einen Eintrag – ein neuer Wert für denselben Tag ersetzt den alten.</p>
      </form>
      {list.length ? (
        <>
          <div className="card">
            <h3>Verlauf</h3>
            <ChartView
              type="line"
              labels={list.map((w) => fmtShortDate(w.date))}
              series={[{ label: 'Körpergewicht', data: list.map((w) => Number(w.weight_kg)), color: '--series-1' }]}
              unit="kg"
              id="bw-chart"
            />
          </div>
          <ul className="list">
            {[...list].reverse().map((w) => (
              <li className="list-row" key={w.id}>
                <span>{fmtDate(w.date)}</span>
                <strong>{fmt(w.weight_kg)} kg</strong>
                <button className="icon-btn" data-id={w.id} aria-label="Eintrag löschen" onClick={() => removeWeight(w.id)}>✕</button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Noch keine Einträge.</p>
      )}
    </>
  );
}
