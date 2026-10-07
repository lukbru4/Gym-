// Fragen (Einstellungen → Fragen): beantworten, daraus einen Trainingsplan erstellen und als Vorlagen übernehmen.
import { useState } from 'react';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { ask, notify } from '../components/Dialog';
import { pickNumber } from '../components/NumberPicker';
import { Paywall } from '../components/Pro';
import { usePro } from '../lib/pro';
import { calorieNeeds, JOB_OPTIONS } from '../lib/calories';
import { fmt } from '../lib/format';
import { activeQuestions, answerLabel, generatePlan, hasOtherSport, isAnswered, QUESTIONS, loadQuiz, PLAN_PREFIX, saveQuiz, type Answers, type Question } from '../lib/plan';
import { setLocalWeekGoal } from '../lib/weekGoal';
import type { TemplateExercise } from '../lib/types';

const WEEKDAY_NAMES: Record<string, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag' };

export function Quiz() {
  const { api, exercises, showError, dataChanged } = useApp();
  const [answers, setAnswers] = useState<Answers>(() => loadQuiz()?.answers ?? {});
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'quiz' | 'plan'>('quiz');
  const [busy, setBusy] = useState(false);
  const pro = usePro();
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

  if (phase === 'plan' && !pro.pro) {
    const preview = generatePlan(answers);
    return (
      <>
        <h2>Dein Plan ist fertig</h2>
        <div className="card" id="plan-locked">
          <p>
            Wir haben aus deinen Antworten <strong>{preview.templates.length} {preview.templates.length === 1 ? 'Vorlage' : 'Vorlagen'}</strong> und einen
            Wochenplan mit <strong>{preview.weekGoal}× Training pro Woche</strong> zusammengestellt – dazu gehört auch die Berechnung, wie viele Kalorien du am Tag essen solltest.
          </p>
          <p className="muted small">Deine Antworten sind gespeichert – nach dem Freischalten ist dein Plan sofort da.</p>
        </div>
        <Paywall reason="Um den Plan freizuschalten, brauchst du Pro." />
        <button className="btn block" id="plan-back" onClick={() => setPhase('quiz')}>‹ Antworten ändern</button>
      </>
    );
  }
  if (phase === 'plan') {
    const plan = generatePlan(answers);
    const needs = calorieNeeds(answers);
    const setDays = (v: string) => store({ ...answers, days: v });
    const sportDays = hasOtherSport(answers) ? String(answers.sportDays ?? '0') : '0';
    // Sport außerhalb vom Gym direkt im Plan ändern (0 = keiner; ohne gewählte Sportart gilt „Anderer Sport“)
    const setSportDays = (v: string) => {
      if (v === '0') return store({ ...answers, sports: ['keine'], sportDays: undefined as unknown as string });
      store({ ...answers, sports: hasOtherSport(answers) ? answers.sports : ['andere'], sportDays: v, sportMin: String(answers.sportMin ?? '60') });
    };
    const takeGoal = async () => {
      if (!needs || !api.social) return;
      try {
        await api.social.setNutritionGoal(needs.target);
        await notify(`Dein Tagesziel ist jetzt ${fmt(needs.target, 0)} kcal. Du siehst es auf der Seite „Essen“.`, { title: 'Tagesziel übernommen' });
      } catch (err) {
        showError(err);
      }
    };
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
        <div className="card" id="calorie-card">
          <h3>Dein Kalorienbedarf</h3>
          <label>Training pro Woche
            <select id="plan-days" value={String(plan.weekGoal)} onChange={(e) => setDays(e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}× pro Woche</option>)}
            </select>
          </label>
          <label>Anderer Sport außerhalb vom Gym
            <select id="plan-sport" value={sportDays} onChange={(e) => setSportDays(e.target.value)}>
              <option value="0">Keiner</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}× pro Woche</option>)}
            </select>
          </label>
          <label>Alltag (ohne Training)
            <select id="plan-job" value={String(answers.job ?? 'gemischt')} onChange={(e) => store({ ...answers, job: e.target.value })}>
              {JOB_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          {needs ? (
            <>
              <p className="calorie-target"><strong id="calorie-target">{fmt(needs.target, 0)}</strong> <span>kcal pro Tag</span></p>
              <ul className="plan-list calorie-lines">
                <li><span>Grundumsatz</span><span>{fmt(needs.bmr, 0)} kcal</span></li>
                <li><span>Alltag</span><span>+ {fmt(needs.daily - needs.bmr, 0)} kcal</span></li>
                <li><span>Training ({plan.weekGoal}× pro Woche)</span><span>+ {fmt(needs.training, 0)} kcal</span></li>
                {needs.sport > 0 && <li><span>Sport außerhalb ({answerLabel(QUESTIONS.find((x) => x.id === 'sports')!, answers)}, {sportDays}× pro Woche)</span><span>+ {fmt(needs.sport, 0)} kcal</span></li>}
                <li><span>Verbrauch gesamt</span><span>{fmt(needs.tdee, 0)} kcal</span></li>
                <li><span>Ziel: {needs.goalNote}</span><span>{needs.adjust > 0 ? '+' : ''}{fmt(needs.adjust, 0)} kcal</span></li>
              </ul>
              <p className="small" id="calorie-macros">Richtwerte: <strong>{needs.protein} g Eiweiß</strong> · {needs.carbs} g Kohlenhydrate · {needs.fat} g Fett</p>
              {api.social ? (
                <button className="btn block" id="calorie-take" onClick={takeGoal}>Als Tagesziel übernehmen</button>
              ) : (
                <p className="muted small">Kalorien tracken (Essen) braucht ein Konto – dann kannst du den Wert als Tagesziel übernehmen.</p>
              )}
              <p className="muted small">Nur eine Schätzung (Grundumsatz nach Mifflin-St-Jeor plus Aktivität), kein ärztlicher Rat.{Number(answers.age) < 18 ? ' Unter 18 Jahren bitte unbedingt mit einer Ärztin oder einem Arzt sprechen – Wachstum braucht mehr Energie.' : ''} Bei Beschwerden oder Vorerkrankungen bitte ärztlich abklären.</p>
            </>
          ) : (
            <p className="muted small">Beantworte Alter, Größe und Gewicht, dann rechnen wir deinen Kalorienbedarf aus.</p>
          )}
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
