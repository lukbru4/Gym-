// Essen: Ernährungscoach (Interview → Plan) und Tagestracker mit Kalorienring, Makros, Wasser, 7 Tagen und Tagebuch (nur Pro).
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { ask, askText, notify } from '../components/Dialog';
import { itemsFromEntries } from '../lib/myMeals';
import { AddFood } from '../components/FoodAdd';
import { DISCLAIMER, FoodSetup, PlanResultView } from '../components/FoodSetup';
import { Paywall } from '../components/Pro';
import { fmt } from '../lib/format';
import { MEALS, mealForHour, totals, type FoodEntry, type Meal } from '../lib/food';
import { computePlan, type PlanInput, type PlanResult } from '../lib/nutritionPlan';
import { getWaterStep, loadPlan, loadWater, saveWater, savePlan, setWaterStep, WATER_STEPS, type StoredPlan } from '../lib/nutritionStore';
import { usePro } from '../lib/pro';
import { addDays, todayISO } from '../lib/stats';

/** Zahl weich hochzählen, wenn sich der Zielwert ändert */
function useCountUp(target: number): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current, t0 = performance.now(), dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const cur = start + (target - start) * (1 - Math.pow(1 - p, 3));
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return Math.round(v);
}

function Ring({ value, goal, size, stroke, color, children, over }: { value: number; goal: number; size: number; stroke: number; color: string; children?: React.ReactNode; over?: boolean }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <div className="nc-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true" style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}>
        <circle cx={size / 2} cy={size / 2} r={r} className="nc-ring-track" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={over ? '#ef4444' : color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${p * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="nc-ring-fill" />
      </svg>
      <div className="nc-ring-mid">{children}</div>
    </div>
  );
}

const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MEAL_COLOR: Record<Meal, string> = { fruehstueck: '#f59e0b', mittag: '#14b8a6', abend: '#2563eb', snack: '#a855f7' };
const MEAL_LABEL: Record<Meal, string> = { fruehstueck: 'Frühstück', mittag: 'Mittag', abend: 'Abend', snack: 'Snacks' };
const longDay = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

export function Food() {
  const { api, user, showError, dataVersion, dataChanged } = useApp();
  const pro = usePro();
  const social = api.social;
  const today = todayISO();
  const uid = user?.id ?? 'lokal';
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [plan, setPlan] = useState<StoredPlan | null>(() => loadPlan(uid));
  const [redo, setRedo] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [goalVersion, setGoalVersion] = useState(0);
  const [water, setWater] = useState(() => loadWater(uid, today));
  const [waterStep, setWaterStepState] = useState(getWaterStep);
  useEffect(() => setWater(loadWater(uid, date)), [uid, date]);
  const entries = useAsync(() => (social ? social.foodList(date) : Promise.resolve([] as FoodEntry[])), [social, date, dataVersion]);
  const week = useAsync(
    () => (social ? Promise.all(Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(async (d) => ({ d, kcal: totals(await social.foodList(d)).kcal }))) : Promise.resolve([] as { d: string; kcal: number }[])),
    [social, today, dataVersion],
  );
  const goal = useAsync(() => (social ? social.nutritionGoal() : Promise.resolve(2500)), [social, goalVersion]);
  const kcalNow = entries.status === 'ok' ? totals(entries.data).kcal : 0;
  const shownKcal = useCountUp(kcalNow);

  if (!social) return <><h2>Essen</h2><Paywall reason="Der Ernährungscoach gibt es mit einem Konto und Pro." /></>;
  if (!pro.loaded) return <Loading />;
  if (!pro.pro && entries.status === 'ok' && !entries.data.length) return <><h2>Essen</h2><Paywall reason="Der Ernährungscoach gibt es mit Pro." /></>;
  if (entries.status === 'loading' || goal.status === 'loading') return <Loading />;
  if (entries.status === 'error') return <LoadError error={entries.error} />;
  if (goal.status === 'error') return <LoadError error={goal.error} />;

  const finishSetup = async (input: PlanInput, result: PlanResult) => {
    try {
      await social.setNutritionGoal(result.kcal);
    } catch (err) {
      showError(err);
      return;
    }
    setPlan(savePlan(uid, input, result));
    setGoalVersion((n) => n + 1);
    setRedo(false);
    setShowPlan(false);
  };

  if (!plan || redo) {
    return <FoodSetup initial={redo ? plan?.input : null} onDone={finishSetup} onCancel={redo ? () => setRedo(false) : undefined} />;
  }
  if (showPlan) {
    return <PlanResultView input={plan.input} result={computePlan(plan.input)} confirmLabel="Zurück zum Tracker" onConfirm={() => setShowPlan(false)} onAdjust={() => { setShowPlan(false); setRedo(true); }} />;
  }

  const list = entries.data;
  const sum = totals(list);
  const target = goal.data;
  // Makroziele aus dem Plan, auf ein ggf. in den Einstellungen geändertes Kalorienziel skaliert
  const f = plan.result.kcal > 0 ? target / plan.result.kcal : 1;
  const macros = [
    { id: 'protein', label: 'Protein', value: sum.protein, goal: Math.round(plan.result.protein * f), color: '#2563EB' },
    { id: 'carbs', label: 'Kohlenh.', value: sum.carbs, goal: Math.round(plan.result.carbs * f), color: '#14B8A6' },
    { id: 'fat', label: 'Fett', value: sum.fat, goal: Math.round(plan.result.fat * f), color: '#F59E0B' },
  ];
  const waterGoalMl = Math.round(plan.result.waterL * 1000);
  const addWater = (ml: number) => {
    const n = Math.max(0, water + ml);
    setWater(n);
    saveWater(uid, date, n);
  };
  const remove = async (e: FoodEntry) => {
    if (!(await ask(`„${e.name}“ wird gelöscht.`, { title: 'Eintrag löschen?', ok: 'Löschen', danger: true }))) return;
    try {
      await social.foodDelete(e.id);
      dataChanged();
    } catch (err) {
      showError(err);
    }
  };
  const weekMax = Math.max(target, ...(week.status === 'ok' ? week.data.map((x) => x.kcal) : [0]), 1);
  const title = date === today ? 'Heute' : date === addDays(today, -1) ? 'Gestern' : new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long' });

  return (
    <div className="nc" id="nc-tracker">
      {!pro.pro && <Paywall reason="Dein Pro ist abgelaufen – ansehen geht weiter, neue Einträge brauchen Pro." />}
      <div className="nc-head">
        <div><h1 id="day-label">{title}</h1><small>{longDay(date)}</small></div>
        <div className="nc-pill" role="group" aria-label="Tag wechseln">
          <button type="button" id="day-prev" aria-label="Vorheriger Tag" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <button type="button" id="day-today" className="m" onClick={() => setDate(today)}>Heute</button>
          <button type="button" id="day-next" aria-label="Nächster Tag" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>›</button>
        </div>
      </div>

      <div className="nc-card nc-hero" id="food-summary">
        <Ring value={sum.kcal} goal={target} size={176} stroke={14} color="#2563EB" over={sum.kcal > target}>
          <strong id="food-eaten">{fmt(shownKcal, 0)}</strong>
          <small>von {fmt(target, 0)} kcal</small>
        </Ring>
        <p id="food-left" className="nc-left">{sum.kcal <= target ? `${fmt(target - sum.kcal, 0)} kcal übrig` : `${fmt(sum.kcal - target, 0)} kcal drüber`}</p>
      </div>

      <div className="nc-card" id="food-macros">
        <div className="nc-rings">
          {macros.map((m) => (
            <div key={m.id} data-macro={m.id}>
              <Ring value={m.value} goal={m.goal} size={68} stroke={7} color={m.color} over={m.value > m.goal * 1.15} />
              <b>{m.value} g</b>
              <small>{m.label} von {m.goal}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="nc-card" id="food-water">
        <div className="nc-between"><b>💧 Wasser</b><span id="water-val">{fmt(water / 1000, 2)} / {fmt(waterGoalMl / 1000, 1)} L</span></div>
        <div className="nc-track"><i className="water" style={{ width: `${Math.min(100, (water / waterGoalMl) * 100)}%` }} /></div>
        <div className="nc-row water-steps" role="group" aria-label="Menge pro Tippen">
          {WATER_STEPS.map((ml) => (
            <button key={ml} type="button" className={`chip${waterStep === ml ? ' active' : ''}`} data-water-step={ml} aria-pressed={waterStep === ml}
              onClick={() => { setWaterStepState(ml); setWaterStep(ml); }}>{ml} ml</button>
          ))}
        </div>
        <div className="nc-row">
          <button type="button" className="nc-btn ghost small" id="water-minus" aria-label={`${waterStep} ml weniger`} onClick={() => addWater(-waterStep)}>−</button>
          <button type="button" className="nc-btn small" id="water-plus" aria-label={`${waterStep} ml mehr`} onClick={() => addWater(waterStep)}>+ {waterStep} ml</button>
        </div>
      </div>

      <div className="nc-card" id="food-week">
        <b>Letzte 7 Tage</b>
        <div className="nc-bars">
          {week.status === 'ok' && week.data.map((x) => (
            <div key={x.d} className={x.d === date ? 'on' : ''}>
              <i style={{ height: `${Math.max(3, (x.kcal / weekMax) * 100)}%` }} title={`${fmt(x.kcal, 0)} kcal`} />
              <span>{WEEKDAY[new Date(x.d + 'T12:00:00').getDay()]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="nc-card" id="food-day">
        {MEALS.map(([meal]) => {
          const rows = list.filter((e) => e.meal === meal);
          const k = totals(rows).kcal;
          return (
            <section key={meal} data-meal={meal}>
              <div className="nc-meal"><i style={{ background: MEAL_COLOR[meal] }} /><b>{MEAL_LABEL[meal]}</b><span>{k ? `${fmt(k, 0)} kcal` : ''}</span></div>
              {rows.map((e) => (
                <div className="nc-entry" key={e.id}>
                  <span>{e.name}<small>{[e.brand, e.amount_g ? `${fmt(e.amount_g, 0)} g` : null, `P ${fmt(e.protein, 0)} · K ${fmt(e.carbs, 0)} · F ${fmt(e.fat, 0)}`].filter(Boolean).join(' · ')}</small></span>
                  <span className="nc-entry-k">{fmt(e.kcal, 0)}</span>
                  <button type="button" className="icon-btn" aria-label={`${e.name} löschen`} data-del={e.id} onClick={() => remove(e)}>✕</button>
                </div>
              ))}
              {!rows.length && <p className="nc-empty">–</p>}
              {rows.length > 0 && pro.pro && (
                <button type="button" className="nc-save-meal" data-save-meal={meal} onClick={async () => {
                  const name = await askText(`Die ${rows.length === 1 ? 'Zutat' : `${rows.length} Einträge`} von „${MEAL_LABEL[meal]}“ als eigene Mahlzeit speichern. Danach findest du sie unter Hinzufügen → Gerichte → Eigene.`, { title: 'Als Mahlzeit speichern', ok: 'Speichern', placeholder: 'Name, z. B. Mein Frühstück' });
                  if (!name?.trim()) return;
                  try {
                    await social.saveMyMeal(null, name.trim().slice(0, 80), itemsFromEntries(rows.slice(0, 40)));
                    await notify(`„${name.trim()}“ ist gespeichert.`);
                  } catch (err) {
                    showError(err);
                  }
                }}>☆ Als eigene Mahlzeit speichern</button>
              )}
            </section>
          );
        })}
        <button type="button" className="nc-btn ghost" id="food-add" disabled={!pro.pro} onClick={() => setAdding(date === today ? mealForHour(new Date().getHours()) : 'mittag')}>+ Eintrag hinzufügen</button>
      </div>

      <details className="nc-card" id="nc-planbox">
        <summary>Mein Plan</summary>
        <p className="nc-small">{fmt(plan.result.kcal, 0)} kcal · Protein {plan.result.protein} g · Kohlenhydrate {plan.result.carbs} g · Fett {plan.result.fat} g · Wasser {fmt(plan.result.waterL, 1)} L</p>
        <div className="nc-row">
          <button type="button" className="nc-btn ghost small" id="nc-show-plan" onClick={() => setShowPlan(true)}>Details & Methodik</button>
          <button type="button" className="nc-btn ghost small" id="nc-redo" onClick={() => setRedo(true)}>Plan neu berechnen</button>
        </div>
      </details>

      <p className="nc-foot">{DISCLAIMER}</p>

      {adding && (
        <AddFood
          onClose={() => setAdding(null)}
          onAdd={async (item) => {
            try {
              await social.foodAdd({ date, meal: adding, ...item });
              setAdding(null);
              dataChanged();
            } catch (err) {
              showError(err);
            }
          }}
          onAddMany={async (items) => {
            try {
              for (const item of items) await social.foodAdd({ date, meal: adding, ...item });
              setAdding(null);
              dataChanged();
            } catch (err) {
              dataChanged();
              showError(err);
            }
          }}
        />
      )}
    </div>
  );
}
