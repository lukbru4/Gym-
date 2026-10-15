// Ernährungscoach: Begrüßung → 11 Fragen (eine pro Bildschirm) → Ergebnis mit Methodik → „Passt so“.
import { useState } from 'react';
import { fmt } from '../lib/format';
import {
  ACTIVITY_OPTIONS, computePlan, DIET_OPTIONS, GOAL_OPTIONS, PACE_OPTIONS,
  type Activity, type Diet, type Goal, type Pace, type PlanInput, type PlanResult, type Sex,
} from '../lib/nutritionPlan';

export const DISCLAIMER = 'Ich bin eine KI, kein medizinisches Fachpersonal. Sprich mit deinem Hausarzt, bevor du eine neue Ernährungsform startest.';

type Draft = { name: string; age: string; sex: Sex | ''; height: string; weight: string; goal: Goal | ''; goalWeight: string; activity: Activity | ''; pace: Pace | ''; diet: Diet | ''; notes: string };
const EMPTY: Draft = { name: '', age: '', sex: '', height: '', weight: '', goal: '', goalWeight: '', activity: '', pace: '', diet: '', notes: '' };
const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && s.trim() !== '' ? n : null;
};
const toDraft = (i: PlanInput): Draft => ({ name: i.name, age: String(i.age), sex: i.sex, height: String(i.heightCm), weight: String(i.weightKg), goal: i.goal, goalWeight: i.goalWeightKg === null ? '' : String(i.goalWeightKg), activity: i.activity, pace: i.pace, diet: i.diet, notes: i.notes });

type Step = { id: keyof Draft; title: string; help: string; skip?: (d: Draft) => boolean };
const STEPS: Step[] = [
  { id: 'name', title: 'Wie heißt du?', help: 'Dein Vorname reicht – so kann ich dich ansprechen.' },
  { id: 'age', title: 'Wie alt bist du?', help: 'Das Alter fließt in die Berechnung deines Grundumsatzes ein.' },
  { id: 'sex', title: 'Biologisches Geschlecht', help: 'Wird für die Stoffwechsel-Rechnung gebraucht (Mifflin-St-Jeor).' },
  { id: 'height', title: 'Wie groß bist du?', help: 'In Zentimetern, zum Beispiel 178.' },
  { id: 'weight', title: 'Wie viel wiegst du aktuell?', help: 'In Kilogramm. Eine ehrliche Zahl ist besser als eine schöne.' },
  { id: 'goal', title: 'Was ist dein Ziel?', help: 'Daran richte ich dein Kalorienziel aus.' },
  { id: 'goalWeight', title: 'Was ist dein Zielgewicht?', help: 'In Kilogramm. Damit schätze ich, wie lange es dauert.', skip: (d) => d.goal === 'halten' },
  { id: 'activity', title: 'Wie aktiv bist du?', help: 'Zähle Job, Wege und Sport zusammen – das bestimmt deinen Gesamtumsatz.' },
  { id: 'pace', title: 'Wie schnell willst du Ergebnisse?', help: 'Schneller heißt strenger. Stetig ist für die meisten ein guter Mittelweg.' },
  { id: 'diet', title: 'Wie ernährst du dich am liebsten?', help: 'Das ist deine Präferenz – die Kalorien ändern sich dadurch nicht.' },
  { id: 'notes', title: 'Meiden oder beachten?', help: 'Optional: Lebensmittel, die du meiden willst, oder gesundheitliche Notizen.' },
];

/** Fehlermeldung für den aktuellen Schritt (null = passt) */
function problem(id: keyof Draft, d: Draft): string | null {
  const n = num(d[id] as string);
  switch (id) {
    case 'name': return d.name.trim() ? null : 'Bitte gib deinen Vornamen ein.';
    case 'age': return n !== null && n >= 14 && n <= 100 ? null : 'Bitte ein Alter zwischen 14 und 100 angeben.';
    case 'sex': return d.sex ? null : 'Bitte wähle eine Option.';
    case 'height': return n !== null && n >= 120 && n <= 230 ? null : 'Bitte eine Größe zwischen 120 und 230 cm angeben.';
    case 'weight': return n !== null && n >= 30 && n <= 300 ? null : 'Bitte ein Gewicht zwischen 30 und 300 kg angeben.';
    case 'goal': return d.goal ? null : 'Bitte wähle ein Ziel.';
    case 'goalWeight': {
      const w = num(d.weight) ?? 0;
      if (n === null || n < 30 || n > 300) return 'Bitte ein Zielgewicht zwischen 30 und 300 kg angeben.';
      if (d.goal === 'abnehmen' && n >= w) return 'Zum Abnehmen sollte das Zielgewicht unter deinem aktuellen Gewicht liegen.';
      if (d.goal === 'zunehmen' && n <= w) return 'Zum Zunehmen sollte das Zielgewicht über deinem aktuellen Gewicht liegen.';
      return null;
    }
    case 'activity': return d.activity ? null : 'Bitte wähle ein Aktivitätslevel.';
    case 'pace': return d.pace ? null : 'Bitte wähle ein Tempo.';
    case 'diet': return d.diet ? null : 'Bitte wähle einen Ernährungsstil.';
    default: return null;
  }
}

function toInput(d: Draft): PlanInput {
  return {
    name: d.name.trim(), age: num(d.age)!, sex: d.sex as Sex, heightCm: num(d.height)!, weightKg: num(d.weight)!, goal: d.goal as Goal,
    goalWeightKg: d.goal === 'halten' ? null : num(d.goalWeight), activity: d.activity as Activity, pace: d.pace as Pace, diet: d.diet as Diet, notes: d.notes.trim(),
  };
}

const Choice = ({ options, value, onPick }: { options: [string, string, string?][]; value: string; onPick: (v: string) => void }) => (
  <div className="nc-options" role="radiogroup">
    {options.map(([v, label, sub]) => (
      <button key={v} type="button" role="radio" aria-checked={value === v} data-v={v} className={`nc-opt${value === v ? ' on' : ''}`} onClick={() => onPick(v)}>
        {label}{sub && <small>{sub}</small>}
      </button>
    ))}
  </div>
);

export function PlanResultView({ input, result, onConfirm, onAdjust, confirmLabel = 'Passt so' }: { input: PlanInput; result: PlanResult; onConfirm: () => void; onAdjust: () => void; confirmLabel?: string }) {
  const goalText = input.goal === 'abnehmen' ? 'Abnehmen' : input.goal === 'zunehmen' ? 'Zunehmen' : 'Gewicht halten';
  const paceText = input.pace === 'sanft' ? 'sanft' : input.pace === 'stetig' ? 'stetig' : 'aggressiv';
  return (
    <div className="nc-screen" id="nc-result">
      <h2>Dein Plan{input.name ? `, ${input.name}` : ''}</h2>
      <p className="nc-sub">Allgemeine Orientierung, keine medizinische Beratung.</p>
      <div className="nc-card nc-hero">
        <span>Tägliches Kalorienziel</span>
        <strong id="nc-kcal">{fmt(result.kcal, 0)} kcal</strong>
        <span>{goalText}{input.goal !== 'halten' ? ` · ${paceText} · ${result.adjust > 0 ? '+' : '−'}${Math.abs(result.adjust)} kcal pro Tag` : ''}</span>
      </div>
      <div className="nc-tiles">
        <div className="nc-tile"><span>Grundumsatz</span><b id="nc-bmr">{fmt(result.bmr, 0)}</b><small>kcal in Ruhe</small></div>
        <div className="nc-tile"><span>Gesamtumsatz</span><b id="nc-tdee">{fmt(result.tdee, 0)}</b><small>kcal pro Tag</small></div>
        <div className="nc-tile"><span><i className="nc-dot p" />Protein</span><b id="nc-protein">{result.protein} g</b></div>
        <div className="nc-tile"><span><i className="nc-dot c" />Kohlenhydrate</span><b id="nc-carbs">{result.carbs} g</b></div>
        <div className="nc-tile"><span><i className="nc-dot f" />Fett</span><b id="nc-fat">{result.fat} g</b></div>
        <div className="nc-tile"><span>Wasser</span><b id="nc-water">{fmt(result.waterL, 1)} L</b></div>
      </div>
      <div className="nc-card">
        {input.goal !== 'halten' && result.weeks !== null ? (
          <b id="nc-weeks">Zeitrahmen: etwa {result.weeks} {result.weeks === 1 ? 'Woche' : 'Wochen'} bis {fmt(input.goalWeightKg, 1)} kg</b>
        ) : input.goal !== 'halten' ? (
          <b>Kein Zeitrahmen möglich – prüfe dein Zielgewicht.</b>
        ) : (
          <b>Gewicht halten – dafür gibt es keinen Zeitrahmen.</b>
        )}
        <p id="nc-safety">{result.safety}</p>
      </div>
      <p className="nc-method"><b>Methodik:</b> Grundumsatz nach Mifflin-St-Jeor · Gesamtumsatz mit den üblichen Aktivitätsfaktoren (1,2 · 1,375 · 1,55 · 1,725 · 1,9) · rund 7.700 kcal je kg Körpergewicht für den Zeitrahmen · Protein und Fett aus gängigen sportmedizinischen Empfehlungen (Protein 1,8–2,2 g/kg, Fett 0,8 g/kg), der Rest sind Kohlenhydrate · Wasser 33 ml/kg.</p>
      <div className="nc-row">
        <button type="button" className="nc-btn ghost" id="nc-adjust" onClick={onAdjust}>Anpassen</button>
        <button type="button" className="nc-btn" id="nc-confirm" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  );
}

export function FoodSetup({ initial, onDone, onCancel }: { initial?: PlanInput | null; onDone: (input: PlanInput, result: PlanResult) => void | Promise<void>; onCancel?: () => void }) {
  const [d, setD] = useState<Draft>(initial ? toDraft(initial) : EMPTY);
  const [phase, setPhase] = useState<'intro' | 'ask' | 'result'>(initial ? 'ask' : 'intro');
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = STEPS.filter((s) => !s.skip?.(d));
  const step = visible[Math.min(idx, visible.length - 1)];
  const set = (k: keyof Draft, v: string) => { setD((p) => ({ ...p, [k]: v })); setErr(null); };

  if (phase === 'intro') {
    return (
      <div className="nc-screen" id="nc-intro">
        <div className="nc-bar"><i style={{ width: '0%' }} /></div>
        <div className="nc-wave" aria-hidden="true">👋</div>
        <h1>Hi! Ich bin dein Ernährungscoach. Lass uns deinen Plan scharf stellen.</h1>
        <div className="nc-note"><b>Kurz vorab:</b> Ich bin eine KI, kein medizinisches Fachpersonal. Sprich mit deinem Hausarzt, bevor du eine neue Ernährungsform startest oder bei einer medizinischen oder diätetischen Vorerkrankung etwas änderst.</div>
        <p>Zum Start stelle ich dir ein paar kurze Fragen, damit ich dich kennenlerne und einen Plan baue, der wirklich zu dir passt.</p>
        <button type="button" className="nc-btn" id="nc-start" onClick={() => setPhase('ask')}>Los geht’s</button>
        {onCancel && <button type="button" className="nc-btn ghost" onClick={onCancel}>Abbrechen</button>}
      </div>
    );
  }

  if (phase === 'result') {
    const input = toInput(d);
    const result = computePlan(input);
    return <PlanResultView input={input} result={result} onAdjust={() => { setPhase('ask'); setIdx(visible.length - 1); }} onConfirm={async () => { setBusy(true); try { await onDone(input, result); } finally { setBusy(false); } }} confirmLabel={busy ? 'Speichere …' : 'Passt so'} />;
  }

  const next = () => {
    const p = problem(step.id, d);
    if (p) return setErr(p);
    if (idx >= visible.length - 1) return setPhase('result');
    setIdx(idx + 1);
  };
  const back = () => (idx > 0 ? (setErr(null), setIdx(idx - 1)) : initial && onCancel ? onCancel() : setPhase('intro'));
  const value = d[step.id] as string;
  const inputFor = () => {
    switch (step.id) {
      case 'name': return <input id="nc-input" className="nc-in" value={value} maxLength={40} autoComplete="given-name" autoFocus onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} />;
      case 'age': case 'height': case 'weight': case 'goalWeight': {
        const unit = step.id === 'age' ? 'Jahre' : step.id === 'height' ? 'cm' : 'kg';
        return (
          <div className="nc-numrow">
            <input id="nc-input" className="nc-in" inputMode="decimal" value={value} autoFocus onChange={(e) => set(step.id, e.target.value.replace(/[^0-9.,]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && next()} />
            <span>{unit}</span>
          </div>
        );
      }
      case 'sex': return <Choice options={[['m', 'Männlich'], ['w', 'Weiblich']]} value={value} onPick={(v) => set('sex', v)} />;
      case 'goal': return <Choice options={GOAL_OPTIONS} value={value} onPick={(v) => set('goal', v)} />;
      case 'activity': return <Choice options={ACTIVITY_OPTIONS} value={value} onPick={(v) => set('activity', v)} />;
      case 'pace': return <Choice options={PACE_OPTIONS} value={value} onPick={(v) => set('pace', v)} />;
      case 'diet': return <Choice options={DIET_OPTIONS.map(([v, l]) => [v, l] as [string, string])} value={value} onPick={(v) => set('diet', v)} />;
      default: return <textarea id="nc-input" className="nc-in nc-text" rows={3} maxLength={300} value={value} placeholder="z. B. keine Nüsse, Laktoseintoleranz …" onChange={(e) => set('notes', e.target.value)} />;
    }
  };

  return (
    <div className="nc-screen" id="nc-ask" data-step={step.id}>
      <div className="nc-bar" role="progressbar" aria-valuenow={Math.round(((idx + 1) / (visible.length + 1)) * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${((idx + 1) / (visible.length + 1)) * 100}%` }} /></div>
      <p className="nc-count">Frage {idx + 1} von {visible.length}</p>
      <h2>{step.title}</h2>
      {inputFor()}
      <p className="nc-help">{step.help}</p>
      {err && <p className="nc-err" role="alert">{err}</p>}
      <div className="nc-row">
        <button type="button" className="nc-btn ghost" id="nc-back" onClick={back}>Zurück</button>
        <button type="button" className="nc-btn" id="nc-next" onClick={next}>{idx >= visible.length - 1 ? 'Plan berechnen' : 'Weiter'}</button>
      </div>
    </div>
  );
}
