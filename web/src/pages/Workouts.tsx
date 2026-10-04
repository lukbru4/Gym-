// Workouts: Vorlagen auswählen und starten, Startvorlagen übernehmen, Standard-Pause einstellen.
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { navigate, redirect } from '../app/router';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { hasDraft, loadDraft, newLiveState, saveDraft, stateFromTemplate } from '../lib/editor';
import { fmtDuration, plural } from '../lib/format';
import { STARTER_TEMPLATES, type StarterTemplate } from '../lib/starterTemplates';
import { REST_OPTIONS, getDefaultRest, setDefaultRest } from '../lib/timer';
import type { Exercise, Template, TemplateExercise } from '../lib/types';
import { ask } from '../components/Dialog';

export function Workouts() {
  const { api, exerciseById, exercises, addExercise, showError, dataVersion, dataChanged } = useApp();
  const templates = useAsync(() => api.listTemplates(), [api, dataVersion]);
  const [busy, setBusy] = useState(false);
  const [rest, setRest] = useState(getDefaultRest());
  if (templates.status === 'loading') return <Loading />;
  if (templates.status === 'error') return <LoadError error={templates.error} />;
  const list = templates.data;
  const draft = loadDraft();
  const names = new Set(list.map((t) => t.name.toLowerCase()));
  const missingStarters = STARTER_TEMPLATES.filter((t) => !names.has(t.name.toLowerCase()));
  const setCount = (t: Template) => t.exercises.reduce((n, e) => n + e.sets.length, 0);
  const starterNames = missingStarters.map((t) => t.name).join(' & ');

  async function addStarters(starters: StarterTemplate[]) {
    let known: Exercise[] = exercises;
    for (const t of starters) {
      const templateExercises: TemplateExercise[] = [];
      for (const e of t.exercises) {
        let ex = known.find((x) => x.name.toLowerCase() === e.name.toLowerCase());
        if (!ex) {
          ex = await api.createExercise(e.name, 'strength', e.muscles);
          known = [...known, ex];
          addExercise(ex);
        }
        templateExercises.push({ exercise_id: ex.id, rest_seconds: null, sets: e.sets.map((x) => ({ ...x })) });
      }
      await api.saveTemplate({ id: null, name: t.name, exercises: templateExercises });
    }
  }

  const startEmpty = async () => {
    if (hasDraft() && !(await ask('Es läuft bereits ein Training. Verwerfen und leer neu starten?', { title: 'Training läuft', ok: 'Neu starten', danger: true }))) return;
    saveDraft(newLiveState());
    navigate('#/neu');
  };

  return (
    <>
      <h2>Workouts</h2>
      {draft?.blocks.length ? (
        <div className="card highlight">
          <h3>Laufendes Training{draft.name ? `: ${draft.name}` : ''}</h3>
          <p className="muted small">
            Gestartet vor {fmtDuration((Date.now() - draft.started_at) / 1000)} · {plural(draft.blocks.length, 'Übung', 'Übungen')}
          </p>
          <a className="btn primary block" href="#/neu">Fortsetzen</a>
        </div>
      ) : null}
      {list.length ? (
        list.map((t) => (
          <div className="card template" key={t.id}>
            <div className="block-head">
              <h3>{t.name}</h3>
              <a className="link" href={`#/vorlage/${t.id}`}>Bearbeiten</a>
            </div>
            <p className="muted small">
              {plural(t.exercises.length, 'Übung', 'Übungen')} · {plural(setCount(t), 'Satz', 'Sätze')}
            </p>
            <p className="small">{t.exercises.map((e) => exerciseById(e.exercise_id)?.name).filter(Boolean).join(' · ')}</p>
            <a className="btn primary block" href={`#/start/${t.id}`}>Starten</a>
          </div>
        ))
      ) : (
        <p className="muted">Noch keine Vorlagen. Lege eine an oder übernimm die Startvorlagen.</p>
      )}
      {missingStarters.length > 0 && (
        <div className="card">
          <h3>Startvorlagen</h3>
          <p className="muted small">
            {starterNames} mit deinen Übungen und Gewichten aus deiner bisherigen App (umgerechnet von Pfund in kg).
          </p>
          <button
            className="btn block"
            id="add-starters"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await addStarters(missingStarters);
                dataChanged();
              } catch (err) {
                showError(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            {starterNames} hinzufügen
          </button>
        </div>
      )}
      <div className="row">
        <a className="btn grow" href="#/vorlage/neu">+ Vorlage</a>
        <button className="btn grow" id="empty-workout" onClick={startEmpty}>Leeres Training</button>
      </div>
      <div className="card">
        <label>
          Standard-Pause zwischen Sätzen
          <select
            id="default-rest"
            value={rest}
            onChange={(e) => {
              setDefaultRest(Number(e.target.value));
              setRest(Number(e.target.value));
            }}
          >
            {REST_OPTIONS.map((sec) => (
              <option key={sec} value={sec}>{fmtDuration(sec)} min</option>
            ))}
          </select>
        </label>
        <p className="muted small">
          Gilt für alle Übungen, bei denen du keine eigene Pause eingestellt hast. Die Pause pro Übung stellst du in der Vorlage oder
          direkt im Training ein.
        </p>
      </div>
    </>
  );
}

/** #/start/:id – Training aus einer Vorlage starten und zum Live-Editor wechseln */
export function StartFromTemplate({ id }: { id: number }) {
  const { api, exerciseById, showError } = useApp();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.getTemplate(id).then(
      async (t) => {
        if (hasDraft() && !(await ask(`Es läuft bereits ein Training. Verwerfen und „${t.name}“ starten?`, { title: 'Training läuft', ok: 'Neu starten', danger: true }))) {
          redirect('#/neu');
          return;
        }
        saveDraft(stateFromTemplate(t, exerciseById));
        redirect('#/neu');
      },
      (err) => {
        showError(err);
        redirect('#/workouts');
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return <Loading />;
}
