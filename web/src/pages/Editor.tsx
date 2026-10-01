// Editor für Live-Training (mit Pause-Timer und „Vorherig“), gespeichertes Training bearbeiten und Vorlagen.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading, MuscleChips } from '../components/Bits';
import { ExercisePicker } from '../components/ExercisePicker';
import {
  blockFor,
  clearDraft,
  editBlocks,
  lastPerformance,
  loadDraft,
  newLiveState,
  parseRow,
  parseRowSafe,
  previousFor,
  saveDraft,
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
      if (!confirm('Nicht abgehakte, leere Sätze werden nicht gespeichert. Training beenden?')) return;
    }
    setSaving(true);
    try {
      const savedId = await api.saveWorkout({ id: state.id, date: state.date, notes: state.notes.trim() || null, sets });
      if (live) {
        clearDraft();
        stopRest();
        if (state.template_id) await offerTemplateUpdate();
      }
      dataChanged();
      navigate(`#/training/${savedId}`);
    } catch (err) {
      setSaving(false);
      showError(err);
    }
  }

  /** Nach dem Training: Vorlage mit den heute geschafften Werten als neue Zielwerte aktualisieren? */
  async function offerTemplateUpdate() {
    let template;
    try {
      template = await api.getTemplate(state.template_id!);
    } catch {
      return; // Vorlage wurde inzwischen gelöscht
    }
    if (!confirm(`Vorlage „${template.name}“ mit den Werten von heute aktualisieren?`)) return;
    await api.saveTemplate({ id: template.id, name: template.name, exercises: templateFromWorkout(state.blocks, exerciseById) });
  }

  function cancel() {
    if (mode === 'edit') return navigate(`#/training/${state.id}`);
    if (mode === 'template') return navigate('#/workouts');
    if (state.blocks.length && !confirm('Training verwerfen? Die Eingaben gehen verloren.')) return;
    clearDraft();
    stopRest();
    navigate('#/workouts');
  }

  async function deleteTemplate() {
    if (!confirm(`Vorlage „${state.name}“ löschen?`)) return;
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
          <span className="muted" id="elapsed" aria-label="Trainingsdauer">
            {fmtDuration((Date.now() - state.started_at) / 1000)}
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
  const live = mode === 'live';
  const cardio = ex.type === 'cardio';
  let workNo = 0;

  const field = (si: number, f: RowField, inputMode: 'decimal' | 'numeric', aria: string, ph: Partial<Record<RowField, string>>) => {
    const value = b.sets[si][f] ?? '';
    return (
      <input
        inputMode={inputMode}
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
        <h3>{ex.name}</h3>
        <button
          className="icon-btn"
          data-action="remove-block"
          aria-label="Übung entfernen"
          onClick={() => confirm('Übung mit allen Sätzen entfernen?') && update((s) => void s.blocks.splice(bi, 1))}
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
      <div className={`set-table ${live ? 'live' : 'plain'}`}>
        <div className="set-row head">
          <span>Satz</span>
          {live && <span>Vorherig</span>}
          <span>{cardio ? 'min' : 'kg'}</span>
          <span>{cardio ? 'km' : 'Wdh.'}</span>
          <span />
        </div>
        {b.sets.map((s, si) => {
          const label = !cardio && s.warmup ? 'A' : String(++workNo);
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
                  className={`set-no set-type ${s.warmup ? 'warmup' : ''}`}
                  aria-label={`Satz ${label}: ${s.warmup ? 'Aufwärmsatz' : 'Arbeitssatz'} – tippen zum Umschalten`}
                  onClick={() => update((st) => void (st.blocks[bi].sets[si].warmup = !st.blocks[bi].sets[si].warmup))}
                >
                  {label}
                </button>
              )}
              {live && <span className="prev small">{prevText}</span>}
              {cardio ? (
                <>
                  {field(si, 'duration_min', 'decimal', 'Dauer in Minuten', ph)}
                  {field(si, 'distance_km', 'decimal', 'Distanz in km', ph)}
                </>
              ) : (
                <>
                  {field(si, 'weight_kg', 'decimal', 'Gewicht in kg', ph)}
                  {field(si, 'reps', 'numeric', 'Wiederholungen', ph)}
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
                  onClick={() =>
                    update((st) => {
                      st.blocks[bi].sets.splice(si, 1);
                      if (!st.blocks[bi].sets.length) st.blocks.splice(bi, 1);
                    })
                  }
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
            onClick={() =>
              update((st) => {
                st.blocks[bi].sets.pop();
                if (!st.blocks[bi].sets.length) st.blocks.splice(bi, 1);
              })
            }
          >
            − Satz
          </button>
        )}
      </div>
    </div>
  );
}
