// Editor für Live-Training (mit Pause-Timer und „Vorherig“), gespeichertes Training bearbeiten und Vorlagen.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading, MuscleChips } from '../components/Bits';
import { ExercisePicker } from '../components/ExercisePicker';
import { ExerciseInfo } from '../components/ExerciseInfo';
import { WorkoutMuscles } from '../components/WorkoutMuscles';
import { suggestProgress, suggestionText } from '../lib/progression';
import {
  blockFor,
  blocksSignature,
  clearDraft,
  editBlocks,
  isUnilateral,
  lastPerformance,
  loadDraft,
  newLiveState,
  parseRow,
  parseRowSafe,
  partnerOf,
  previousFor,
  rowLabels,
  saveDraft,
  setUnilateral,
  templateBlocks,
  templateFromBlocks,
  templateFromWorkout,
  type Block,
  type EditorMode,
  type EditorState,
  type Row,
  type RowField,
} from '../lib/editor';
import { fmt, fmtDuration, parseNum, toInput } from '../lib/format';
import { REST_OPTIONS, getDefaultRest, startRest, stopRest } from '../lib/timer';
import type { Exercise, ExerciseType, MuscleId, WorkoutSet } from '../lib/types';
import type { SetInput } from '../data/backend';
import { ask } from '../components/Dialog';
import { PICK_SPECS, pickNumber } from '../components/NumberPicker';

interface Loaded { state: EditorState; prev: Map<number, WorkoutSet[]> }

export function Editor({ mode, id }: { mode: EditorMode; id?: number }) {
  const { api, exerciseById } = useApp();
  const loaded = useAsync<Loaded>(async () => {
    if (mode === 'edit') {
      const w = await api.getWorkout(id!);
      return {
        state: { ...newLiveState(), mode, id: id!, date: w.date, notes: w.notes ?? '', blocks: editBlocks(w.sets, exerciseById) },
        prev: new Map(),
      };
    }
    if (mode === 'template') {
      const t = id ? await api.getTemplate(id) : { id: null, name: '', exercises: [] };
      return { state: { ...newLiveState(), mode, id: t.id, name: t.name, blocks: templateBlocks(t, exerciseById) }, prev: new Map() };
    }
    const [workouts, sets] = await Promise.all([api.listWorkouts(), api.listSets()]);
    const state = loadDraft() || newLiveState();
    state.blocks = state.blocks.filter((b) => exerciseById(b.exercise_id));
    return { state, prev: lastPerformance(workouts, sets, null) };
  }, [mode, id]);
  if (loaded.status === 'loading') return <Loading />;
  if (loaded.status === 'error') return <LoadError error={loaded.error} />;
  return <EditorForm key={`${mode}-${id ?? ''}`} initial={loaded.data.state} prev={loaded.data.prev} />;
}

const REST_SELECT_STD = '';

function EditorForm({ initial, prev }: { initial: EditorState; prev: Map<number, WorkoutSet[]> }) {
  const { api, exerciseById, exercises, addExercise, showError, dataChanged } = useApp();
  const [state, setState] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [newEx, setNewEx] = useState<{ name: string; type: ExerciseType; muscles: MuscleId[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [, tick] = useState(0);
  const newExRef = useRef<HTMLFormElement>(null);
  const { mode } = state;
  const live = mode === 'live';

  // Entwurf des laufenden Trainings bei jeder Änderung sichern (übersteht Neuladen)
  useEffect(() => {
    if (live) saveDraft(state);
  }, [state, live]);
  // Trainingsdauer jede Sekunde aktualisieren
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => {
    if (newEx && newExRef.current) {
      newExRef.current.scrollIntoView({ block: 'center' });
      newExRef.current.querySelector<HTMLInputElement>('input[name=name]')?.focus();
    }
  }, [newEx === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (fn: (s: EditorState) => void) =>
    setState((s) => {
      const next: EditorState = structuredClone(s);
      fn(next);
      return next;
    });
  const typeOf = (b: Block) => exerciseById(b.exercise_id)!.type;
  // Nach dem Training: Vorlage aktualisieren (Training aus Vorlage) bzw. als neue Vorlage speichern
  // „Vorlage so lassen“ ist Standard; Änderungen übernimmt man nur bewusst
  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [asTemplate, setAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const addBlock = (ex: Exercise) => update((s) => void s.blocks.push(blockFor(ex, prev.get(ex.id))));

  /** Platzhalter einer Zeile: Werte vom letzten Mal, sonst Zielwerte der Vorlage */
  const placeholders = (b: Block, si: number): Partial<Record<RowField, string>> => {
    const row = b.sets[si];
    const cardio = typeOf(b) === 'cardio';
    const p = live ? previousFor(prev.get(b.exercise_id), b, si) : null;
    if (p) return cardio ? { duration_min: toInput(p.duration_min), distance_km: toInput(p.distance_km) } : { reps: toInput(p.reps), weight_kg: toInput(p.weight_kg) };
    if (row.target)
      return cardio
        ? { duration_min: toInput(row.target.duration_min), distance_km: toInput(row.target.distance_km) }
        : { reps: toInput(row.target.reps), weight_kg: toInput(row.target.weight_kg) };
    return {};
  };

  function toggleDone(bi: number, si: number) {
    const block = state.blocks[bi];
    const row = block.sets[si];
    if (row.done) return update((s) => void (s.blocks[bi].sets[si].done = false));
    // Leere Felder mit dem Vorschlag (vorherig bzw. Vorlage) füllen
    const ph = placeholders(block, si);
    const filled: Row = { ...row };
    for (const f of Object.keys(ph) as RowField[]) if (!filled[f] && ph[f]) filled[f] = ph[f];
    try {
      if (!parseRow(filled, typeOf(block) === 'cardio')) return showError(new Error('Bitte zuerst Werte eintragen.'));
    } catch (err) {
      return showError(err);
    }
    update((s) => void (s.blocks[bi].sets[si] = { ...filled, done: true }));
    startRest(block.rest_seconds ?? getDefaultRest());
  }

  async function saveTemplate() {
    const name = state.name.trim();
    if (!name) return showError(new Error('Bitte gib der Vorlage einen Namen.'));
    if (!state.blocks.length) return showError(new Error('Füge mindestens eine Übung hinzu.'));
    let templateExercises;
    try {
      templateExercises = templateFromBlocks(state.blocks, exerciseById);
    } catch (err) {
      return showError(err);
    }
    setSaving(true);
    try {
      await api.saveTemplate({ id: state.id, name, exercises: templateExercises });
      dataChanged();
      navigate('#/workouts');
    } catch (err) {
      setSaving(false);
      showError(err);
    }
  }

  async function saveWorkout() {
    const sets: SetInput[] = [];
    try {
      for (const block of state.blocks) {
        const cardio = typeOf(block) === 'cardio';
        for (const row of block.sets) {
          const v = parseRow(row, cardio);
          if (v) sets.push({ exercise_id: block.exercise_id, ...v });
        }
      }
    } catch (err) {
      return showError(err);
    }
    if (!state.date) return showError(new Error('Bitte ein Datum angeben.'));
    if (!sets.length && !state.notes.trim()) return showError(new Error('Das Training ist noch leer.'));
    if (live && state.blocks.some((b) => b.sets.some((r) => !r.done && !parseRowSafe(r, typeOf(b) === 'cardio')))) {
      if (!(await ask('Nicht abgehakte, leere Sätze werden nicht gespeichert.', { title: 'Training beenden?', ok: 'Beenden' }))) return;
    }
    setSaving(true);
    try {
      const savedId = await api.saveWorkout({ id: state.id, date: state.date, notes: state.notes.trim() || null, sets });
      if (live) {
        clearDraft();
        stopRest();
        await storeTemplate(); // Fehler hier dürfen das gespeicherte Training nicht blockieren
      }
      dataChanged();
      navigate(`#/training/${savedId}`);
    } catch (err) {
      setSaving(false);
      showError(err);
    }
  }

  /** Nach dem Training: heutige Übungen, Sätze und Werte in die Vorlage übernehmen bzw. neue Vorlage anlegen */
  async function storeTemplate() {
    try {
      const exercisesOut = templateFromWorkout(state.blocks, exerciseById);
      if (!exercisesOut.length) return;
      if (state.template_id && updateTemplate) {
        let template;
        try {
          template = await api.getTemplate(state.template_id);
        } catch {
          template = null; // Vorlage wurde inzwischen gelöscht → als neue anlegen
        }
        await api.saveTemplate({ id: template?.id ?? null, name: template?.name ?? (state.name || 'Training'), exercises: exercisesOut });
      } else if (!state.template_id && asTemplate) {
        await api.saveTemplate({ id: null, name: newTemplateName.trim() || state.name || 'Mein Training', exercises: exercisesOut });
      }
    } catch (err) {
      showError(new Error(`Training gespeichert, aber die Vorlage nicht: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  async function cancel() {
    if (mode === 'edit') return navigate(`#/training/${state.id}`);
    if (mode === 'template') return navigate('#/workouts');
    if (state.blocks.length && !(await ask('Die Eingaben gehen verloren.', { title: 'Training verwerfen?', ok: 'Verwerfen', danger: true }))) return;
    clearDraft();
    stopRest();
    navigate('#/workouts');
  }

  async function deleteTemplate() {
    if (!(await ask(`Vorlage „${state.name}“ wird gelöscht.`, { title: 'Vorlage löschen?', ok: 'Löschen', danger: true }))) return;
    try {
      await api.deleteTemplate(state.id!);
      dataChanged();
      navigate('#/workouts');
    } catch (err) {
      showError(err);
    }
  }

  async function createExercise(e: FormEvent) {
    e.preventDefault();
    if (!newEx) return;
    const name = newEx.name.trim();
    if (!name) return;
    const existing = exercises.find((x) => x.name.toLowerCase() === name.toLowerCase());
    try {
      const ex = existing || (await api.createExercise(name, newEx.type, newEx.type === 'cardio' ? [] : newEx.muscles));
      if (!existing) addExercise(ex);
      addBlock(ex);
      setNewEx(null);
    } catch (err) {
      showError(err);
    }
  }

  const title = live ? state.name || 'Training' : mode === 'edit' ? 'Training bearbeiten' : state.id ? 'Vorlage bearbeiten' : 'Neue Vorlage';

  return (
    <>
      <div className="editor-head">
        <h2>{title}</h2>
        {live && (
          <span className="editor-head-right">
            <span className="muted" id="elapsed" aria-label="Trainingsdauer">
              {fmtDuration((Date.now() - state.started_at) / 1000)}
            </span>
            <button type="button" className="btn small-btn" id="minimize" onClick={() => navigate('#/')} title="Training läuft weiter – unten zurückkehren">
              ⌄ Minimieren
            </button>
          </span>
        )}
      </div>
      {mode === 'template' && (
        <div className="card">
          <label>
            Name der Vorlage
            <input id="t-name" maxLength={80} value={state.name} placeholder="z. B. Push" required onChange={(e) => update((s) => void (s.name = e.target.value))} />
          </label>
        </div>
      )}
      {mode === 'edit' && (
        <div className="card">
          <label>
            Datum
            <input type="date" id="w-date" value={state.date} required onChange={(e) => update((s) => void (s.date = e.target.value))} />
          </label>
        </div>
      )}
      <WorkoutMuscles exercises={state.blocks.map((b) => exerciseById(b.exercise_id)).filter((e): e is Exercise => Boolean(e))} title={live ? 'Heute trainierst du' : 'Diese Muskeln trainierst du'} />
      {state.blocks.map((b, bi) => (
        <BlockCard
          key={bi}
          block={b}
          bi={bi}
          mode={mode}
          exercise={exerciseById(b.exercise_id)!}
          prevSets={prev.get(b.exercise_id)}
          placeholders={(si) => placeholders(b, si)}
          update={update}
          onDone={(si) => toggleDone(bi, si)}
        />
      ))}
      <div className="card">
        <button className="btn primary block" type="button" id="add-exercise" onClick={() => setPicking(true)}>
          + Übung hinzufügen
        </button>
        {newEx && (
          <form id="new-exercise" className="inline-form" ref={newExRef} onSubmit={createExercise}>
            <h3>Eigene Übung anlegen</h3>
            <input type="text" name="name" placeholder="Name der Übung" maxLength={80} required value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} />
            <select name="type" value={newEx.type} onChange={(e) => setNewEx({ ...newEx, type: e.target.value as ExerciseType })}>
              <option value="strength">Kraft</option>
              <option value="cardio">Cardio</option>
            </select>
            {newEx.type === 'strength' && <MuscleChips selected={newEx.muscles} onChange={(muscles) => setNewEx({ ...newEx, muscles })} />}
            <button className="btn" type="submit">Anlegen</button>
          </form>
        )}
      </div>
      {mode !== 'template' && (
        <div className="card">
          {live && (
            <label>
              Datum
              <input type="date" id="w-date" value={state.date} required onChange={(e) => update((s) => void (s.date = e.target.value))} />
            </label>
          )}
          <label>
            Notizen
            <textarea id="w-notes" rows={3} maxLength={2000} placeholder="Wie lief's?" value={state.notes} onChange={(e) => update((s) => void (s.notes = e.target.value))} />
          </label>
        </div>
      )}
      {live && state.blocks.length > 0 && (
        <div className="card template-save">
          {state.template_id ? (
            <fieldset className="tpl-choice" id="template-choice">
              <legend>Vorlage <strong>„{state.name || 'Training'}“</strong></legend>
              {state.template_sig !== undefined && state.template_sig !== blocksSignature(state.blocks) && (
                <p className="notice small" id="template-changed">Du hast Übungen oder Sätze gegenüber der Vorlage geändert.</p>
              )}
              <label className={`check-row${!updateTemplate ? ' on' : ''}`}>
                <input type="radio" name="tpl" id="tpl-keep" checked={!updateTemplate} onChange={() => setUpdateTemplate(false)} />
                <span><strong>Vorlage wie vorher lassen</strong><small className="muted">Nur dieses Training wird gespeichert.</small></span>
              </label>
              <label className={`check-row${updateTemplate ? ' on' : ''}`}>
                <input type="radio" name="tpl" id="tpl-update" checked={updateTemplate} onChange={() => setUpdateTemplate(true)} />
                <span><strong>Vorlage speichern</strong><small className="muted">Übungen, Sätze und Werte von heute kommen in die Vorlage.</small></span>
              </label>
            </fieldset>
          ) : (
            <>
              <label className="check-row">
                <input type="checkbox" id="save-as-template" checked={asTemplate} onChange={(e) => setAsTemplate(e.target.checked)} />
                <span>Als Vorlage speichern (für das nächste Mal)</span>
              </label>
              {asTemplate && (
                <input id="new-template-name" maxLength={80} placeholder="Name der Vorlage, z. B. Push" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
              )}
            </>
          )}
        </div>
      )}
      <div className="row">
        <button className="btn primary grow" id="save" disabled={saving} onClick={() => (mode === 'template' ? saveTemplate() : saveWorkout())}>
          {live ? 'Beenden & speichern' : 'Speichern'}
        </button>
        <button className="btn" id="cancel" onClick={cancel}>
          {live ? 'Verwerfen' : 'Abbrechen'}
        </button>
      </div>
      {mode === 'template' && state.id && (
        <p className="center">
          <button className="btn danger" id="delete-template" onClick={deleteTemplate}>Vorlage löschen</button>
        </p>
      )}
      {picking && (
        <ExercisePicker
          added={new Set(state.blocks.map((b) => b.exercise_id))}
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setPicking(false);
            addBlock(ex);
          }}
          onNew={(name) => {
            setPicking(false);
            setNewEx({ name, type: 'strength', muscles: [] });
          }}
        />
      )}
    </>
  );
}

function BlockCard(props: {
  block: Block;
  bi: number;
  mode: EditorMode;
  exercise: Exercise;
  prevSets: WorkoutSet[] | undefined;
  placeholders: (si: number) => Partial<Record<RowField, string>>;
  update: (fn: (s: EditorState) => void) => void;
  onDone: (si: number) => void;
}) {
  const { block: b, bi, mode, exercise: ex, update } = props;
  const [info, setInfo] = useState(false);
  const live = mode === 'live';
  const cardio = ex.type === 'cardio';
  const uni = !cardio && isUnilateral(b);
  const labels = rowLabels(b.sets, cardio);
  // Gewichtsvorschlag aus dem letzten Training (Doppelte Progression); Zielwiederholungen aus dem Plan
  const targetReps = b.sets.find((r) => !r.warmup && r.target?.reps)?.target?.reps ?? null;
  const suggestion = live && !cardio ? suggestProgress(props.prevSets, targetReps) : null;
  const takeSuggestion = () => {
    if (!suggestion) return;
    update((st) => {
      for (const r of st.blocks[bi].sets) if (!r.warmup && !r.done && !r.weight_kg) r.weight_kg = String(suggestion.weight);
    });
  };
  /** Zeile entfernen – einseitig immer das ganze Paar L+R */
  const removeRow = (st: EditorState, si: number) => {
    const sets = st.blocks[bi].sets;
    const p = partnerOf(sets, si);
    sets.splice(p >= 0 ? Math.min(si, p) : si, p >= 0 ? 2 : 1);
    if (!sets.length) st.blocks.splice(bi, 1);
  };

  const DEFAULTS: Record<RowField, string> = { weight_kg: '20', reps: '10', duration_min: '20', distance_km: '3' };
  const NAMES: Record<RowField, string> = { weight_kg: 'Gewicht', reps: 'Wiederholungen', duration_min: 'Dauer', distance_km: 'Distanz' };
  /** Antippen öffnet die Wisch-Leiste; Startwert: eingetragen → Vorschlag → letzter Satz → Standard */
  const openPicker = async (si: number, f: RowField, label: string, ph: Partial<Record<RowField, string>>) => {
    const prevRow = si > 0 ? b.sets[si - 1][f] : '';
    const start = b.sets[si][f] || ph[f] || prevRow || DEFAULTS[f];
    const v = await pickNumber({ ...PICK_SPECS[f], title: `${ex.name} · Satz ${label} · ${NAMES[f]}`, value: start });
    if (v !== null) update((s) => void (s.blocks[bi].sets[si][f] = v));
  };
  const field = (si: number, f: RowField, inputMode: 'decimal' | 'numeric', aria: string, ph: Partial<Record<RowField, string>>, label = '') => {
    const value = b.sets[si][f] ?? '';
    return (
      <input
        // Auf dem Handy keine Tastatur: Antippen öffnet die Wisch-Leiste (Eintippen geht dort)
        inputMode="none"
        data-input-mode={inputMode}
        onClick={() => openPicker(si, f, label, ph)}
        data-b={bi}
        data-s={si}
        data-f={f}
        value={value}
        placeholder={ph[f] ?? ''}
        aria-label={aria}
        className={Number.isNaN(parseNum(value)) ? 'invalid' : undefined}
        onChange={(e) => update((s) => void (s.blocks[bi].sets[si][f] = e.target.value))}
      />
    );
  };

  return (
    <div className="card block">
      <div className="block-head">
        <h3>{ex.name} <button type="button" className="info-btn" data-action="exercise-info" aria-label={`Anleitung und Animation: ${ex.name}`} onClick={() => setInfo(true)}>▶</button></h3>
        {info && <ExerciseInfo ex={ex} onClose={() => setInfo(false)} />}
        {!cardio && (
          <button
            type="button"
            className={`side-toggle ${uni ? 'on' : ''}`}
            data-action="toggle-side"
            aria-pressed={uni}
            title={uni ? 'Einseitig (links/rechts) – tippen für beidseitig' : 'Einseitig trainieren (links/rechts getrennt)'}
            aria-label={uni ? 'Einseitig: an' : 'Einseitig: aus'}
            onClick={() => update((st) => void (st.blocks[bi] = setUnilateral(st.blocks[bi], !uni)))}
          >
            L/R
          </button>
        )}
        <button
          className="icon-btn"
          data-action="remove-block"
          aria-label="Übung entfernen"
          onClick={async () => (await ask('Die Übung wird mit allen Sätzen entfernt.', { title: 'Übung entfernen?', ok: 'Entfernen', danger: true })) && update((s) => void s.blocks.splice(bi, 1))}
        >
          ✕
        </button>
      </div>
      {mode !== 'edit' && (
        <label className="rest-select small">
          Pause
          <select
            data-rest-b={bi}
            value={b.rest_seconds ?? REST_SELECT_STD}
            onChange={(e) => update((s) => void (s.blocks[bi].rest_seconds = e.target.value ? Number(e.target.value) : null))}
          >
            <option value={REST_SELECT_STD}>Standard ({fmtDuration(getDefaultRest())})</option>
            {REST_OPTIONS.map((sec) => (
              <option key={sec} value={sec}>{fmtDuration(sec)}</option>
            ))}
          </select>
        </label>
      )}
      {live && !cardio && suggestion && (
        <div className={`suggest suggest-${suggestion.action}`} id={`suggest-${bi}`}>
          <p className="suggest-line">
            <span className="muted small">Vorschlag heute</span> <strong>{suggestionText(suggestion)}</strong>
            <span className="muted small"> · letztes Mal {suggestion.last}</span>
          </p>
          <p className="muted small">{suggestion.why}</p>
          <button type="button" className="btn small-btn" data-action="take-suggestion" onClick={takeSuggestion}>Gewicht übernehmen</button>
        </div>
      )}
      <div className={`set-table ${live ? 'live' : 'plain'}`}>
        <div className="set-row head">
          <span>Satz</span>
          {live && <span>Vorherig</span>}
          <span>{cardio ? 'min' : 'kg'}</span>
          <span>{cardio ? 'km' : 'Wdh.'}</span>
          <span />
        </div>
        {b.sets.map((s, si) => {
          const label = labels[si];
          const p = live ? previousFor(props.prevSets, b, si) : null;
          const ph = props.placeholders(si);
          const prevText = p ? (cardio ? `${fmt(p.duration_min)} min · ${fmt(p.distance_km, 2)} km` : `${fmt(p.weight_kg, 2)} × ${p.reps}`) : '–';
          return (
            <div className={`set-row ${s.done ? 'done' : ''}`} key={si}>
              {cardio ? (
                <span className="set-no">{label}</span>
              ) : (
                <button
                  data-action="toggle-warmup"
                  className={`set-no set-type ${s.warmup ? 'warmup' : ''}${s.side ? ` side-${s.side}` : ''}`}
                  aria-label={`Satz ${label}: ${s.warmup ? 'Aufwärmsatz' : 'Arbeitssatz'}${s.side === 'L' ? ' links' : s.side === 'R' ? ' rechts' : ''} – tippen zum Umschalten`}
                  onClick={() =>
                    update((st) => {
                      const sets = st.blocks[bi].sets;
                      const warmup = !sets[si].warmup;
                      sets[si].warmup = warmup;
                      const p = partnerOf(sets, si);
                      if (p >= 0) sets[p].warmup = warmup;
                    })
                  }
                >
                  {label}
                </button>
              )}
              {live && <span className="prev small">{prevText}</span>}
              {cardio ? (
                <>
                  {field(si, 'duration_min', 'decimal', 'Dauer in Minuten', ph, label)}
                  {field(si, 'distance_km', 'decimal', 'Distanz in km', ph, label)}
                </>
              ) : (
                <>
                  {field(si, 'weight_kg', 'decimal', 'Gewicht in kg', ph, label)}
                  {field(si, 'reps', 'numeric', 'Wiederholungen', ph, label)}
                </>
              )}
              {live ? (
                <button className={`check ${s.done ? 'on' : ''}`} data-action="done" aria-pressed={Boolean(s.done)} aria-label="Satz erledigt" onClick={() => props.onDone(si)}>
                  ✓
                </button>
              ) : (
                <button
                  className="icon-btn"
                  data-action="remove-set"
                  aria-label="Satz entfernen"
                  onClick={() => update((st) => removeRow(st, si))}
                >
                  −
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="row">
        <button
          className="btn small-btn grow"
          data-action="add-set"
          onClick={() =>
            update((st) => {
              const sets = st.blocks[bi].sets;
              const last = sets[sets.length - 1];
              if (uni) {
                // Einseitig: neues Paar L + R mit den Werten des letzten Paars
                const l = [...sets].reverse().find((x) => x.side === 'L') ?? last;
                const r = [...sets].reverse().find((x) => x.side === 'R') ?? last;
                sets.push({ ...l, side: 'L', warmup: false, done: false }, { ...r, side: 'R', warmup: false, done: false });
                return;
              }
              sets.push(last ? { ...last, warmup: false, done: false } : cardio ? { duration_min: '', distance_km: '' } : { warmup: false, reps: '', weight_kg: '' });
            })
          }
        >
          + {cardio ? 'Eintrag' : 'Satz'}
        </button>
        {live && (
          <button
            className="btn small-btn"
            data-action="remove-last"
            aria-label="Letzten Satz entfernen"
            onClick={() => update((st) => removeRow(st, st.blocks[bi].sets.length - 1))}
          >
            − Satz
          </button>
        )}
      </div>
    </div>
  );
}
