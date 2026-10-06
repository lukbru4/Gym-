// Fragen (Einstellungen → Fragen): beantworten, daraus einen Trainingsplan erstellen und als Vorlagen übernehmen.
import { useState } from 'react';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { ask } from '../components/Dialog';
import { pickNumber } from '../components/NumberPicker';
import { activeQuestions, answerLabel, generatePlan, isAnswered, loadQuiz, PLAN_PREFIX, saveQuiz, type Answers, type Question } from '../lib/plan';
import { setLocalWeekGoal } from '../lib/weekGoal';
import type { TemplateExercise } from '../lib/types';

const WEEKDAY_NAMES: Record<string, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag' };

export function Quiz() {
  const { api, exercises, showError, dataChanged } = useApp();
  const [answers, setAnswers] = useState<Answers>(() => loadQuiz()?.answers ?? {});
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'quiz' | 'plan'>('quiz');
  const [busy, setBusy] = useState(false);
  const list = activeQuestions(answers);
  const q: Question | undefined = list[Math.min(step, list.length - 1)];

  const store = (next: Answers) => {
    setAnswers(next);
    saveQuiz({ answers: next, plan: loadQuiz()?.plan ?? null, savedAt: new Date().toISOString() });
  };
  const goNext = (next: Answers = answers) => {
    if (step >= activeQuestions(next).length - 1) setPhase('plan');
    else setStep(step + 1);
  };

  if (phase === 'plan') {
    const plan = generatePlan(answers);
    const apply = async () => {
      setBusy(true);
      try {
        const old = (await api.listTemplates()).filter((t) => t.name.startsWith(PLAN_PREFIX));
        if (old.length && !(await ask(`${old.length === 1 ? 'Die bisherige Plan-Vorlage wird' : `Die ${old.length} bisherigen Plan-Vorlagen werden`} durch den neuen Plan ersetzt. Deine anderen Vorlagen bleiben.`, { title: 'Plan ersetzen?', ok: 'Ersetzen' }))) {
          setBusy(false);
          return;
        }
        for (const t of old) await api.deleteTemplate(t.id);
        for (const t of plan.templates) {
          const out: TemplateExercise[] = [];
          for (const e of t.exercises) {
            const ex = exercises.find((x) => x.name.toLowerCase() === e.name.toLowerCase());
            if (ex) out.push({ exercise_id: ex.id, rest_seconds: null, sets: e.sets.map((s) => ({ warmup: Boolean(s.warmup), reps: s.reps ?? null, weight_kg: null, duration_min: s.duration_min ?? null, distance_km: null })) });
          }
          if (out.length) await api.saveTemplate({ id: null, name: t.name, exercises: out });
        }
        setLocalWeekGoal(plan.weekGoal);
        await api.social?.setWeekGoal(plan.weekGoal).catch(() => {});
        saveQuiz({ answers, plan: { week: plan.week, weekGoal: plan.weekGoal }, savedAt: new Date().toISOString() });
        dataChanged();
        navigate('#/workouts');
      } catch (err) {
        setBusy(false);
        showError(err);
      }
    };
    return (
      <>
        <h2>Dein Plan</h2>
        <div className="card" id="plan-week">
          <h3>Deine Woche</h3>
          <ul className="plan-week">
            {plan.week.map((w) => (
              <li key={w.day}><strong>{WEEKDAY_NAMES[w.day]}</strong><span>{w.template.replace(PLAN_PREFIX, '')}</span></li>
            ))}
          </ul>
          <p className="muted small">Wochenziel: {plan.weekGoal}× pro Woche – das zählt für deine 🔥 Serie.</p>
        </div>
        {plan.templates.map((t) => (
          <div className="card" key={t.name} data-plan-template={t.name}>
            <h3>{t.name.replace(PLAN_PREFIX, '')}</h3>
            <ul className="plan-list">
              {t.exercises.map((e) => {
                const work = e.sets.filter((s) => !s.warmup);
                return (
                  <li key={e.name}>
                    <span>{e.name}</span>
                    <span className="muted small">{e.cardio ? `${e.sets[0].duration_min} Min.` : `${work.length} × ${work[0]?.reps}`}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <ul className="plan-notes muted small">{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        <button className="btn primary block" id="plan-apply" disabled={busy} onClick={apply}>Plan übernehmen</button>
        <button className="btn block" id="plan-back" disabled={busy} onClick={() => setPhase('quiz')}>‹ Antworten ändern</button>
      </>
    );
  }

  if (!q) return null;
  const value = answers[q.id];
  const chosen = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  const choose = (v: string) => {
    if (q.type === 'one') {
      const next = { ...answers, [q.id]: v };
      store(next);
      setTimeout(() => goNext(next), 180);
      return;
    }
    const cur = Array.isArray(value) ? value : [];
    // „Keine“ und „Alles gleich“ schließen die anderen aus
    const exclusive = v === 'keine' || v === 'alles';
    const nextList = cur.includes(v) ? cur.filter((x) => x !== v) : exclusive ? [v] : [...cur.filter((x) => x !== 'keine' && x !== 'alles'), v];
    store({ ...answers, [q.id]: nextList });
  };
  const rangeValue = value !== undefined ? String(value) : String(q.def ?? q.min ?? 0);
  const editRange = async () => {
    const v = await pickNumber({ title: q.q, unit: q.unit ?? '', value: rangeValue, min: q.min ?? 0, max: q.max ?? 100, step: q.step ?? 1, bigStep: q.step && q.step < 1 ? 0.5 : 1, itemW: 14, labelEvery: q.step && q.step < 1 ? 10 : 5, integer: !q.step || q.step >= 1 });
    if (v !== null) store({ ...answers, [q.id]: v });
  };
  const canNext = q.type === 'range' || isAnswered(q, answers);

  return (
    <>
      <div className="editor-head">
        <h2>Fragen</h2>
        <a className="btn small-btn" href="#/konto" id="quiz-close">Schließen</a>
      </div>
      <div className="card quiz-card">
        <div className="quiz-top">
          <span className="muted small" id="quiz-count">Frage {Math.min(step, list.length - 1) + 1} von {list.length}</span>
        </div>
        <div className="quiz-progress" aria-hidden="true"><i style={{ width: `${(step / list.length) * 100}%` }} /></div>
        <h3 className="quiz-q">{q.q}</h3>
        {q.hint && <p className="muted small">{q.hint}</p>}
        {q.type === 'range' ? (
          <button type="button" className="quiz-range" id="quiz-range" onClick={editRange}>
            <strong>{rangeValue.replace('.', ',')}</strong> <span>{q.unit}</span>
            <small>antippen zum Ändern</small>
          </button>
        ) : (
          <div className="quiz-options" role={q.type === 'multi' ? 'group' : 'radiogroup'}>
            {q.options!.map(([v, label]) => (
              <button key={v} type="button" className={`quiz-option${chosen(v) ? ' on' : ''}`} data-v={v} aria-pressed={chosen(v)} onClick={() => choose(v)}>
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="row quiz-foot">
          <button className="btn" id="quiz-back" disabled={step === 0} onClick={() => setStep(step - 1)}>‹ Zurück</button>
          <button className="btn" id="quiz-skip" onClick={() => goNext()}>Überspringen</button>
          <button
            className="btn primary grow"
            id="quiz-next"
            disabled={!canNext}
            onClick={() => {
              if (q.type === 'range' && value === undefined) {
                const next = { ...answers, [q.id]: rangeValue };
                store(next);
                goNext(next);
              } else goNext();
            }}
          >
            {step >= list.length - 1 ? 'Plan erstellen' : 'Weiter'}
          </button>
        </div>
      </div>
      <details className="rules">
        <summary>Meine Antworten</summary>
        <ul>
          {list.map((x) => <li key={x.id}>{x.q} <strong>{answerLabel(x, answers)}</strong></li>)}
        </ul>
      </details>
    </>
  );
}
