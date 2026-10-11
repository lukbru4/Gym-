// Ränge pro Übung, Gesamt-Rang, Rekorde & Level pro Übung, Analyse einer Übung.
import { ChoiceField } from '../components/ChoiceSheet';
import { pickNumber } from '../components/NumberPicker';
import { useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { BodyGraph } from '../components/BodyGraph';
import { LevelBar, LoadError, Loading, ProgressBar, RankRules } from '../components/Bits';
import { ChartView } from '../components/ChartView';
import { RankBadge } from '../components/RankBadge';
import { datedSets } from '../lib/editor';
import { fmt, fmtDate, fmtShortDate, plural } from '../lib/format';
import { strengthLevels } from '../lib/muscles';
import { rankFromPoints } from '../lib/ranks';
import { estimate1RM, exerciseProgress, todayISO, type CardioPoint, type StrengthPoint } from '../lib/stats';
import { KG_PER_WEIGHT_LEVEL, exerciseLevel, weightLevel, type Progress } from '../lib/xp';

export function Ranks() {
  const { exerciseById, exerciseMap } = useApp();
  const game = useGame();
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  const g = game.data;
  const levels = strengthLevels(datedSets(g.workouts, g.sets), exerciseMap(), todayISO());
  const cards = g.strength
    .map(([id, st]) => ({ ex: exerciseById(id), st, rank: rankFromPoints(st.xp) }))
    .filter((c) => c.ex)
    .sort((a, b) => b.st.xp - a.st.xp || a.ex!.name.localeCompare(b.ex!.name, 'de'));
  const totalLp = g.strength.reduce((sum, [, st]) => sum + st.xp, 0);
  return (
    <>
      <div className="rank-grid">
        <div className="rank-card overall" style={{ '--tier': g.overall.tier.color } as React.CSSProperties}>
          <div className="rank-head"><strong>{fmt(totalLp, 0)} RP</strong><span>Gesamt</span></div>
          <RankBadge rank={g.overall} size={84} />
          <div className="rank-name">{g.overall.label}</div>
          <BodyGraph levels={levels} />
        </div>
        {cards.map((c) => (
          <div className="rank-card" key={c.ex!.id} style={{ '--tier': c.rank.tier.color } as React.CSSProperties}>
            <div className="rank-head"><strong>{c.rank.label}</strong><span>{c.rank.lp} LP</span></div>
            <RankBadge rank={c.rank} size={84} />
            <div className="rank-name">{c.ex!.name}</div>
            <div className="rank-best">Bestes gesch. 1RM {fmt(c.st.best)} kg · {plural(c.st.sessions, 'Training', 'Trainings')}</div>
            <ProgressBar
              className="xp-bar tier-bar"
              value={c.rank.lp}
              max={c.rank.needed}
              label={`${c.rank.lp} von ${c.rank.needed} LP bis zur nächsten Stufe`}
            />
          </div>
        ))}
      </div>
      {!cards.length && <p className="muted">Trainiere eine Kraftübung, um deinen ersten Rang zu bekommen.</p>}
      <RankRules />
    </>
  );
}

const levelOf = (progress: Progress, exId: number) => {
  const st = progress.perExercise.get(exId) || { xp: 0, sessions: 0, best: 0, improvements: 0, records: 0, last: 0 };
  return { st, ex: exerciseLevel(st.xp), w: st.best > 0 ? weightLevel(st.best) : null };
};

const PROGRESS_KEY = 'gym-tracker-progress-exercise';

function ProgressTable<T extends { date: string }>({ rows, head, cells }: { rows: T[]; head: string[]; cells: (r: T) => string[] }) {
  return (
    <details className="table-toggle">
      <summary>Als Tabelle anzeigen</summary>
      <table className="table">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.date}>{cells(r).map((c, i) => <td key={i}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export function Analysis() {
  const { exercises, exerciseById } = useApp();
  const game = useGame();
  const [selected, setSelected] = useState<number | null>(() => {
    try {
      return Number(localStorage.getItem(PROGRESS_KEY)) || null;
    } catch {
      return null;
    }
  });
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  const g = game.data;
  const dated = datedSets(g.workouts, g.sets);
  const used = exercises.filter((e) => dated.some((s) => s.exercise_id === e.id));
  if (!used.length)
    return (
      <>
        <h2>Fortschritt</h2>
        <p className="muted">Sobald du Trainings erfasst hast, siehst du hier deinen Fortschritt.</p>
      </>
    );
  const allExercises = [...exercises].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const current = exerciseById(selected ?? -1) ? selected! : used[0].id;
  const ex = exerciseById(current)!;
  const rows = exerciseProgress(dated.filter((s) => s.exercise_id === current), ex.type);
  const labels = rows.map((r) => fmtShortDate(r.date));
  const choose = (id: number) => {
    setSelected(id);
    try {
      localStorage.setItem(PROGRESS_KEY, String(id));
    } catch {
      /* ignorieren */
    }
  };
  let body;
  if (!rows.length) {
    body = <p className="muted">Für diese Übung gibt es noch keine Einträge.</p>;
  } else if (ex.type === 'cardio') {
    const r = rows as CardioPoint[];
    body = (
      <>
        <h3>Dauer pro Training</h3>
        <ChartView type="line" labels={labels} series={[{ label: 'Dauer', data: r.map((x) => x.duration), color: '--series-1' }]} unit="min" id="p-c1" />
        <h3>Distanz pro Training</h3>
        <ChartView type="line" labels={labels} series={[{ label: 'Distanz', data: r.map((x) => x.distance), color: '--series-1' }]} unit="km" id="p-c2" />
        <ProgressTable rows={r} head={['Datum', 'Dauer', 'Distanz']} cells={(x) => [fmtDate(x.date, false), `${fmt(x.duration)} min`, `${fmt(x.distance, 2)} km`]} />
      </>
    );
  } else {
    const r = rows as StrengthPoint[];
    const l = levelOf(g.progress, current);
    body = (
      <>
        <div className="level-row">
          <div>
            <span className="streak-label">Übungs-Level</span>
            <span className="streak-value"><span className="level-badge">{l.ex.level}</span></span>
            <LevelBar l={l.ex} unit="XP" />
          </div>
          <div>
            <span className="streak-label">Gewichts-Level</span>
            <span className="streak-value"><span className="level-badge weight">{l.w ?? 1}</span></span>
            <span className="xp-hint">
              bestes gesch. 1RM {fmt(l.st.best)} kg · nächstes Level ab {fmt((l.w ?? 1) * KG_PER_WEIGHT_LEVEL, 0)} kg
            </span>
          </div>
        </div>
        <h3>Kraftentwicklung</h3>
        <p className="muted small">Geschätztes 1RM nach Epley-Formel: Gewicht × (1 + Wdh. / 30)</p>
        <ChartView
          type="line"
          labels={labels}
          series={[
            { label: 'Gesch. 1RM', data: r.map((x) => Math.round(x.e1rm * 10) / 10), color: '--series-1' },
            { label: 'Schwerster Satz', data: r.map((x) => x.maxWeight), color: '--series-2' },
          ]}
          unit="kg"
          id="p-c1"
        />
        <ProgressTable
          rows={r}
          head={['Datum', 'Schwerster Satz', 'Gesch. 1RM', 'Volumen']}
          cells={(x) => [fmtDate(x.date, false), `${fmt(x.maxWeight, 2)} kg`, `${fmt(x.e1rm)} kg`, `${fmt(x.volume, 0)} kg`]}
        />
      </>
    );
  }
  return (
    <>
      <h2>Analyse</h2>
      <div className="card">
        <ChoiceField
          id="p-exercise"
          label="Übung"
          title="Übung wählen"
          items={allExercises.map((e) => ({ key: e.id, label: e.name, sub: used.some((u) => u.id === e.id) ? undefined : 'noch nicht trainiert' }))}
          value={current}
          onChange={(k) => choose(Number(k))}
        />
        <div id="p-body">{body}</div>
      </div>
    </>
  );
}


/** Galerie: Rang je Übung, mit Suche */
export function RankGallery() {
  const { exerciseById } = useApp();
  const game = useGame();
  const [q, setQ] = useState('');
  if (game.status === 'loading') return <Loading />;
  if (game.status === 'error') return <LoadError error={game.error} />;
  const g = game.data;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const cards = g.strength
    .map(([id, st]) => ({ ex: exerciseById(id), st, rank: rankFromPoints(st.xp) }))
    .filter((c) => c.ex && words.every((w) => c.ex!.name.toLowerCase().includes(w)))
    .sort((a, b) => b.st.xp - a.st.xp || a.ex!.name.localeCompare(b.ex!.name, 'de'));
  return (
    <>
      <h2>Galerie</h2>
      <input type="search" className="picker-search" id="gallery-search" placeholder="Übung suchen …" aria-label="Übung suchen" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="rank-grid">
        {cards.map((c) => (
          <div className="rank-card" key={c.ex!.id} style={{ '--tier': c.rank.tier.color } as React.CSSProperties}>
            <div className="rank-head"><strong>{c.rank.label}</strong><span>{c.rank.lp} LP</span></div>
            <RankBadge rank={c.rank} size={84} />
            <div className="rank-name">{c.ex!.name}</div>
            <div className="rank-best">Bestes gesch. 1RM {fmt(c.st.best)} kg</div>
            <ProgressBar className="xp-bar tier-bar" value={c.rank.lp} max={c.rank.needed} label={`${c.rank.lp} von ${c.rank.needed} LP bis zur nächsten Stufe`} />
          </div>
        ))}
      </div>
      {!cards.length && <p className="muted">{q ? 'Keine Übung gefunden.' : 'Trainiere eine Kraftübung, um sie hier zu sehen.'}</p>}
    </>
  );
}

/** Rechner: geschätztes 1RM aus Gewicht × Wiederholungen (Epley) und Gewichte für andere Wiederholungszahlen */
export function OneRmCalculator() {
  const { exercises, exerciseById } = useApp();
  const game = useGame();
  const strength = exercises.filter((e) => e.type === 'strength').sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const [exId, setExId] = useState<number | null>(null);
  const [kg, setKg] = useState(60);
  const [reps, setReps] = useState(8);
  const e1rm = estimate1RM(kg, reps);
  const current = exId ?? strength.find((e) => e.name === 'Bankdrücken')?.id ?? strength[0]?.id ?? -1;
  const best = game.status === 'ok' ? game.data.strength.find(([id]) => id === current)?.[1].best ?? 0 : 0;
  const pick = async (title: string, unit: string, value: number, min: number, max: number, step: number, big: number, integer?: boolean) => {
    const v = await pickNumber({ title, unit, value: String(value), min, max, step, bigStep: big, itemW: integer ? 14 : 10, labelEvery: integer ? 5 : 10, integer });
    return v === null ? null : Number(v.replace(',', '.'));
  };
  const table = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50].map((p) => ({ p, w: Math.round(((e1rm * p) / 100) / 0.5) * 0.5, r: p === 100 ? 1 : Math.max(1, Math.round(30 * (100 / p - 1))) }));
  return (
    <>
      <h2>Rechner</h2>
      <div className="card" id="calc">
        <ChoiceField id="calc-exercise" label="Übung" title="Übung wählen" items={strength.map((e) => ({ key: e.id, label: e.name }))} value={current} onChange={(k) => setExId(Number(k))} />
        <div className="calc-inputs">
          <button type="button" className="calc-btn" id="calc-kg" onClick={async () => { const v = await pick('Gewicht', 'kg', kg, 0, 400, 0.5, 2.5); if (v !== null) setKg(v); }}><span className="muted small">Gewicht</span><strong>{fmt(kg)} kg</strong></button>
          <button type="button" className="calc-btn" id="calc-reps" onClick={async () => { const v = await pick('Wiederholungen', 'Wdh.', reps, 1, 50, 1, 1, true); if (v !== null) setReps(v); }}><span className="muted small">Wiederholungen</span><strong>{reps} Wdh.</strong></button>
        </div>
        <div className="calc-result" id="calc-result"><span className="muted small">Geschätztes 1RM</span><strong>{fmt(e1rm)} kg</strong>{best > 0 && exerciseById(current) && <span className="muted small">Dein bisheriger Bestwert bei {exerciseById(current)!.name}: {fmt(best)} kg</span>}</div>
      </div>
      <div className="card">
        <h3>Gewicht nach Prozent</h3>
        <table className="table"><thead><tr><th>% 1RM</th><th>Gewicht</th><th>ca. Wdh.</th></tr></thead>
          <tbody>{table.map((r) => <tr key={r.p}><td>{r.p} %</td><td>{fmt(r.w)} kg</td><td>{r.r}</td></tr>)}</tbody></table>
        <p className="muted small">Nach der Epley-Formel (Gewicht × (1 + Wdh. / 30)); die Wiederholungszahlen sind Richtwerte.</p>
      </div>
    </>
  );
}
