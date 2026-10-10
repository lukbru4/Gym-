// Übungsseite: Reiter Über · Statistiken · Verlauf. „Über“ zeigt Animation, Hilfe zum Protokollieren, beanspruchte Muskeln
// (Primär/Sekundär), Ausrüstung und nummerierte Anleitung.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { MUSCLE_NAMES, equipmentOf, musclesOf } from '../lib/muscles';
import { animIdFor } from '../lib/animMap';
import { PATTERNS } from '../lib/animations';
import { keywordsOf } from '../lib/exerciseCatalog';
import { fmtDate } from '../lib/format';
import { estimate1RM, isWorkingSet } from '../lib/stats';
import { ExerciseAnim, focusFor } from './ExerciseAnim';
import { BodyGraph } from './BodyGraph';
import { MuscleTile } from './MuscleStrip';
import { focusOf } from './WorkoutMuscles';
import type { Exercise, Workout, WorkoutSet } from '../lib/types';

/** Zusatzhinweise je nach Geräteart im Namen */
function tips(name: string): string[] {
  const n = name.toLowerCase();
  const out: string[] = [];
  if (/maschine/.test(n) && !/smith/.test(n)) out.push('An der Maschine: Sitz und Polster so einstellen, dass die Drehachse der Maschine auf Höhe deines Gelenks liegt.');
  if (/smith/.test(n)) out.push('An der Smith-Maschine läuft die Stange auf Schienen: Stell die Füße etwas weiter vor, damit die Bewegung natürlich bleibt. Haken am Ende der Übung einrasten.');
  if (/kabel|seil/.test(n)) out.push('Am Kabelzug: Stell die Rolle auf die richtige Höhe und halte die Spannung während der ganzen Bewegung.');
  if (/kurzhantel/.test(n)) out.push('Mit Kurzhanteln arbeitet jede Seite für sich – so gleichst du Kraftunterschiede aus.');
  if (/einarmig|einbeinig/.test(n)) out.push('Einseitig: Zuerst die schwächere Seite trainieren und bei der stärkeren dieselbe Wiederholungszahl machen.');
  return out;
}

const LOG_STEPS = [
  'Tippe bei „KG“ und „WDH.“ auf die Felder und trage Gewicht und Wiederholungen ein. „Vorherig“ zeigt dir, was du letztes Mal gemacht hast.',
  'Mit dem Haken ✓ bestätigst du den Satz. Danach startet die Pause.',
  'Tippe auf die Satznummer, um einen Satz als Aufwärmsatz „W“ zu markieren. Aufwärmsätze zählen nicht für Volumen und Rekorde.',
  'Mit „+ Satz“ ergänzt du weitere Sätze.',
  'Am Ende tippst du auf „Beenden & speichern“.',
];

type Tab = 'about' | 'stats' | 'history';

function useExerciseSets(id?: number) {
  const { api } = useApp();
  const [data, setData] = useState<{ sets: WorkoutSet[]; workouts: Workout[] } | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    Promise.all([api.listSets(), api.listWorkouts()]).then(([sets, workouts]) => alive && setData({ sets: sets.filter((s) => s.exercise_id === id), workouts })).catch(() => alive && setData({ sets: [], workouts: [] }));
    return () => { alive = false; };
  }, [api, id]);
  return data;
}

function Stats({ id, cardio }: { id?: number; cardio: boolean }) {
  const data = useExerciseSets(id);
  if (!id) return <p className="muted">Statistiken gibt es für Übungen aus deinem Training.</p>;
  if (!data) return <p className="muted">Lädt …</p>;
  const work = data.sets.filter(isWorkingSet);
  if (!work.length) return <p className="muted" id="info-stats-empty">Noch keine Daten – nach deinem ersten Training siehst du hier Bestwerte.</p>;
  const w = (s: WorkoutSet) => Number(s.weight_kg) || 0;
  const r = (s: WorkoutSet) => Number(s.reps) || 0;
  const best = Math.max(...work.map(w));
  const orm = Math.max(...work.map((s) => estimate1RM(w(s), r(s))));
  const dates = new Set(work.map((s) => data.workouts.find((x) => x.id === s.workout_id)?.date).filter(Boolean));
  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return (
    <div className="info-stats" id="info-stats">
      {!cardio && <div className="card"><span className="muted small">Schwerster Satz</span><strong>{fmt(best)} kg</strong></div>}
      {!cardio && <div className="card"><span className="muted small">Geschätztes 1RM</span><strong>{fmt(orm)} kg</strong></div>}
      <div className="card"><span className="muted small">Sätze gesamt</span><strong>{work.length}</strong></div>
      <div className="card"><span className="muted small">Trainings</span><strong>{dates.size}</strong></div>
    </div>
  );
}

function History({ id }: { id?: number }) {
  const data = useExerciseSets(id);
  if (!id) return <p className="muted">Der Verlauf erscheint für Übungen aus deinem Training.</p>;
  if (!data) return <p className="muted">Lädt …</p>;
  const byWorkout = new Map<number, WorkoutSet[]>();
  for (const s of data.sets) byWorkout.set(s.workout_id, [...(byWorkout.get(s.workout_id) ?? []), s]);
  const rows = [...byWorkout.entries()]
    .map(([wid, sets]) => ({ date: data.workouts.find((x) => x.id === wid)?.date ?? '', sets }))
    .filter((x) => x.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  if (!rows.length) return <p className="muted" id="info-history-empty">Noch kein Training mit dieser Übung.</p>;
  return (
    <ul className="info-history" id="info-history">
      {rows.map((x) => (
        <li key={x.date} className="card">
          <strong>{fmtDate(x.date)}</strong>
          <span className="muted small">{x.sets.filter(isWorkingSet).map((s) => (s.weight_kg ? `${Number(s.weight_kg).toLocaleString('de-DE')} kg × ${s.reps ?? '–'}` : `${s.duration_min ?? '–'} min`)).join(' · ')}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExerciseInfo({ ex, onClose }: { ex: Pick<Exercise, 'name' | 'type' | 'muscles'> & { id?: number }; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('about');
  const [help, setHelp] = useState(false);
  useEffect(() => {
    document.body.classList.add('picker-open');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('picker-open');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const muscles = musclesOf({ name: ex.name, muscles: ex.muscles });
  const id = animIdFor(ex.name, muscles);
  const p = PATTERNS[id] ?? PATTERNS.generic;
  const alias = keywordsOf(ex.name).split(', ').filter(Boolean).slice(0, 8);
  const steps = [...p.cues, ...tips(ex.name)];
  return (
    <div className="picker ex-info" role="dialog" aria-modal="true" aria-label={`Anleitung: ${ex.name}`} id="exercise-info">
      <div className="picker-head">
        <h2>{ex.name}</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" id="info-close" onClick={onClose}>✕</button>
      </div>
      <div className="info-tabs" role="tablist" aria-label="Bereich">
        {([['about', 'Über'], ['stats', 'Statistiken'], ['history', 'Verlauf']] as const).map(([t, label]) => (
          <button key={t} type="button" role="tab" className="picker-cat" data-tab={t} aria-selected={tab === t} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>
      {tab === 'stats' && <Stats id={ex.id} cardio={ex.type === 'cardio'} />}
      {tab === 'history' && <History id={ex.id} />}
      {tab === 'about' && (
        <>
          <ExerciseAnim id={id} highlight={focusFor(muscles)} height={300} label={`Animation: ${ex.name}`} />
          {id === 'generic' && <p className="muted small">Für diese Übung gibt es noch keine eigene Animation – gezeigt wird eine allgemeine Bewegung.</p>}
          {id !== 'generic' && PATTERNS[id].name !== ex.name && <p className="muted small">Bewegungsablauf: {p.name}. Varianten (Gerät, Griff) sehen ähnlich aus.</p>}
          <button type="button" className="log-help-btn" id="log-help" aria-expanded={help} onClick={() => setHelp((h) => !h)}>
            <span aria-hidden="true">💡</span> Wie protokollieren?
          </button>
          {help && (
            <div className="card log-help" id="log-help-panel">
              <ol className="info-steps">{LOG_STEPS.map((t) => <li key={t}>{t}</li>)}</ol>
              <button type="button" className="btn small-btn" onClick={() => setHelp(false)}>Schließen</button>
            </div>
          )}
          {muscles.length > 0 && ex.type !== 'cardio' && (
            <>
              <div className="info-head">
                <h3>Trainierte Muskeln</h3>
                <span className="muscle-legend" aria-label="Legende"><span><i className="p" />Primär</span><span><i className="s" />Sekundär</span></span>
              </div>
              <div className="info-map">
                <BodyGraph focus={focusOf([{ name: ex.name, muscles, type: ex.type }]).focus} />
              </div>
              <h3>Primärer Muskel</h3>
              <div className="muscle-strip static-strip"><MuscleTile id={muscles[0]} /></div>
              {muscles.length > 1 && (
                <>
                  <h3>Sekundäre Muskeln</h3>
                  <div className="muscle-strip static-strip">{muscles.slice(1).map((m) => <MuscleTile key={m} id={m} />)}</div>
                </>
              )}
              <p className="info-muscles">{muscles.map((m, i) => <span className={`chip${i > 0 ? ' secondary' : ''}`} key={m}>{MUSCLE_NAMES.get(m) ?? m}{i === 0 ? ' (primär)' : ''}</span>)}</p>
            </>
          )}
          <h3>Ausrüstung</h3>
          <div className="card info-equip"><strong>{equipmentOf(ex)}</strong></div>
          <h3>Anleitungen</h3>
          <ol className="info-steps big">{steps.map((c) => <li key={c}>{c}</li>)}</ol>
          <div className="card">
            <h3>Typische Fehler</h3>
            <ul className="info-list">{p.mistakes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          {alias.length > 0 && <p className="muted small" id="info-alias">Auch bekannt als: {alias.join(' · ')}</p>}
          <p className="muted small">Allgemeine Hinweise zur Technik, kein Ersatz für eine Trainerin oder einen Trainer. Bei Schmerzen abbrechen und ärztlich abklären.</p>
        </>
      )}
    </div>
  );
}
