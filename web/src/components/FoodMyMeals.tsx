// Eigene Mahlzeiten: erstellen (Zutaten suchen/scannen, Gramm), ändern, löschen und mit einem Tipp eintragen.
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { ask } from './Dialog';
import { Barcode, Search, type NewEntry } from './FoodAdd';
import { pickNumber } from './NumberPicker';
import { fmt } from '../lib/format';
import type { FoodItem } from '../lib/food';
import { itemFromFood, itemNutrients, mealTotals, type MealItem, type MyMeal } from '../lib/myMeals';
import { usePro } from '../lib/pro';

const FACTORS: [number, string][] = [[0.5, '½'], [1, '1'], [1.5, '1½'], [2, '2']];
const gramsSpec = (title: string, value: number) => ({ title, unit: 'g', value: String(Math.round(value)), min: 1, max: 3000, step: 1, bigStep: 10, itemW: 8, labelEvery: 50, integer: true });

/** Liste der eigenen Mahlzeiten (lädt vom Server) */
export function useMyMeals() {
  const { api } = useApp();
  const [meals, setMeals] = useState<MyMeal[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const reload = useCallback(() => {
    if (!api.social) return;
    api.social.myMeals().then((m) => { setMeals(m); setError(null); }).catch((e) => setError(e));
  }, [api.social]);
  useEffect(reload, [reload]);
  return { meals, error, reload };
}

/** Bearbeiten/Erstellen */
export function MealEditor({ initial, onDone, onCancel }: { initial: { id: number | null; name: string; items: MealItem[] }; onDone: (id: number) => void; onCancel: () => void }) {
  const { api, showError } = useApp();
  const [name, setName] = useState(initial.name);
  const [items, setItems] = useState<MealItem[]>(initial.items);
  const [adding, setAdding] = useState<'search' | 'barcode' | null>(null);
  const [busy, setBusy] = useState(false);
  const sum = mealTotals(items);
  const pick = async (f: FoodItem) => {
    const v = await pickNumber(gramsSpec(f.name, f.serving_g ?? 100));
    if (v === null) return;
    setItems([...items, itemFromFood(f, Number(v))]);
    setAdding(null);
  };
  const save = async () => {
    setBusy(true);
    try {
      onDone(await api.social!.saveMyMeal(initial.id, name.trim(), items));
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };
  if (adding)
    return (
      <div className="card" id="meal-ing-pick">
        <button type="button" className="btn small-btn" id="meal-ing-back" onClick={() => setAdding(null)}>‹ Zurück zur Mahlzeit</button>
        <div className="picker-cats" role="tablist" aria-label="Zutat finden">
          <button type="button" className="picker-cat" role="tab" data-ing-tab="search" aria-selected={adding === 'search'} onClick={() => setAdding('search')}>Suchen</button>
          <button type="button" className="picker-cat" role="tab" data-ing-tab="barcode" aria-selected={adding === 'barcode'} onClick={() => setAdding('barcode')}>Barcode</button>
        </div>
        {adding === 'search' ? <Search onPick={pick} onError={showError} /> : <Barcode onPick={pick} onError={showError} />}
      </div>
    );
  return (
    <div className="card" id="meal-editor">
      <h3>{initial.id ? 'Mahlzeit bearbeiten' : 'Neue Mahlzeit'}</h3>
      <label>Name<input id="meal-name" value={name} maxLength={80} placeholder="z. B. Mein Protein-Frühstück" onChange={(e) => setName(e.target.value)} /></label>
      <ul className="nc-ings" id="meal-items">
        {items.map((it, i) => (
          <li key={i}>
            <span className="food-name">{it.n}<small className="muted">{[it.b, `${fmt(itemNutrients(it).kcal, 0)} kcal`].filter(Boolean).join(' · ')}</small></span>
            <button type="button" className="btn small-btn" data-meal-grams={i} onClick={async () => {
              const v = await pickNumber(gramsSpec(it.n, it.g));
              if (v !== null) setItems(items.map((x, j) => (j === i ? { ...x, g: Number(v) } : x)));
            }}>{fmt(it.g, 0)} g</button>
            <button type="button" className="icon-btn" aria-label={`${it.n} entfernen`} data-meal-del={i} onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
      {!items.length && <p className="muted small">Noch keine Zutaten. Füge Lebensmittel hinzu – per Suche oder Barcode.</p>}
      <button type="button" className="btn block" id="meal-add-ing" disabled={items.length >= 40} onClick={() => setAdding('search')}>+ Zutat hinzufügen</button>
      <p className="muted small" id="meal-sum">Zusammen {fmt(sum.kcal, 0)} kcal · {fmt(sum.protein, 0)} g Eiweiß · {fmt(sum.carbs, 0)} g KH · {fmt(sum.fat, 0)} g Fett · {fmt(sum.grams, 0)} g</p>
      <button type="button" className="btn primary block" id="meal-save" disabled={busy || !name.trim() || !items.length} onClick={save}>Mahlzeit speichern</button>
      <button type="button" className="btn block" id="meal-cancel" onClick={onCancel}>Abbrechen</button>
    </div>
  );
}

/** Ansicht einer eigenen Mahlzeit: Portion, Zutaten an/aus, eintragen */
function MealDetail({ meal, onBack, onEdit, onDeleted, onAdd, onAddMany }: { meal: MyMeal; onBack: () => void; onEdit: () => void; onDeleted: () => void; onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void> }) {
  const { api, showError } = useApp();
  const [factor, setFactor] = useState(1);
  const [on, setOn] = useState(() => meal.items.map(() => true));
  const [busy, setBusy] = useState(false);
  const chosen = meal.items.filter((_, i) => on[i]);
  const sum = mealTotals(chosen, factor);
  const factorText = factor === 1 ? '' : ` (${FACTORS.find(([f]) => f === factor)?.[1]} ${factor <= 1 ? 'Portion' : 'Portionen'})`;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!(await ask(`„${meal.name}“ wird gelöscht. Einträge im Tagebuch bleiben.`, { title: 'Mahlzeit löschen?', ok: 'Löschen', danger: true }))) return;
    try {
      await api.social!.deleteMyMeal(meal.id);
      onDeleted();
    } catch (err) {
      showError(err);
    }
  };
  return (
    <div className="card" id="meal-detail" data-meal-id={meal.id}>
      <button type="button" className="btn small-btn" id="meal-back" onClick={onBack}>‹ Zurück</button>
      <h3>{meal.name}</h3>
      <div className="nc-factors" role="group" aria-label="Portion">
        {FACTORS.map(([f, t]) => <button key={f} type="button" data-f={f} className={`picker-cat${factor === f ? ' active' : ''}`} aria-pressed={factor === f} onClick={() => setFactor(f)}>{t} {f <= 1 ? 'Portion' : 'Portionen'}</button>)}
      </div>
      <ul className="nc-ings">
        {meal.items.map((it, i) => (
          <li key={i} className={on[i] ? '' : 'off'}>
            <input type="checkbox" checked={on[i]} aria-label={`${it.n} verwenden`} onChange={(e) => setOn(on.map((v, j) => (j === i ? e.target.checked : v)))} />
            <span className="food-name">{it.n}{it.b ? <small className="muted">{it.b}</small> : null}</span>
            <span className="muted small">{fmt(it.g * factor, 0)} g</span>
          </li>
        ))}
      </ul>
      <div className="nc-tiles small">
        <div className="nc-tile"><span>Kalorien</span><b id="meal-kcal">{fmt(sum.kcal, 0)}</b></div>
        <div className="nc-tile"><span>Protein</span><b>{fmt(sum.protein, 0)} g</b></div>
        <div className="nc-tile"><span>Kohlenh.</span><b>{fmt(sum.carbs, 0)} g</b></div>
        <div className="nc-tile"><span>Fett</span><b>{fmt(sum.fat, 0)} g</b></div>
      </div>
      <button type="button" className="btn primary block" id="meal-add" disabled={busy || !chosen.length} onClick={() => run(() => onAdd({ name: `${meal.name}${factorText}`, amount_g: sum.grams, kcal: sum.kcal, protein: sum.protein, carbs: sum.carbs, fat: sum.fat, source: 'manual' }))}>Als eine Mahlzeit eintragen</button>
      <button type="button" className="btn block" id="meal-add-many" disabled={busy || !chosen.length} onClick={() => run(() => onAddMany(chosen.map((it) => ({ name: it.n, brand: it.b ?? null, amount_g: Math.round(it.g * factor), ...itemNutrients(it, factor), source: 'manual' as const }))))}>Zutaten einzeln eintragen</button>
      <div className="nc-row">
        <button type="button" className="btn small-btn" id="meal-edit" onClick={onEdit}>Bearbeiten</button>
        <button type="button" className="btn small-btn danger" id="meal-delete" onClick={del}>Löschen</button>
      </div>
    </div>
  );
}

/** Bereich „Eigene“ im Tab Gerichte */
export function MyMeals({ onAdd, onAddMany, draft, onDraftDone }: { onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void>; draft?: { name: string; items: MealItem[] } | null; onDraftDone?: () => void }) {
  const { api } = useApp();
  const pro = usePro();
  const { meals, error, reload } = useMyMeals();
  const [open, setOpen] = useState<number | null>(null);
  const [edit, setEdit] = useState<{ id: number | null; name: string; items: MealItem[] } | null>(draft ? { id: null, ...draft } : null);
  if (!api.social) return <p className="muted">Eigene Mahlzeiten gibt es mit Konto.</p>;
  const finish = () => { setEdit(null); onDraftDone?.(); };
  if (edit) return <MealEditor initial={edit} onCancel={finish} onDone={(id) => { finish(); setOpen(id); reload(); }} />;
  const meal = meals?.find((m) => m.id === open);
  if (meal) return <MealDetail meal={meal} onBack={() => setOpen(null)} onEdit={() => setEdit({ id: meal.id, name: meal.name, items: meal.items })} onDeleted={() => { setOpen(null); reload(); }} onAdd={onAdd} onAddMany={onAddMany} />;
  return (
    <div id="my-meals">
      <button type="button" className="btn primary block" id="meal-new" disabled={!pro.pro} onClick={() => setEdit({ id: null, name: '', items: [] })}>+ Neue Mahlzeit erstellen</button>
      {error ? <p className="notice small">Deine Mahlzeiten konnten nicht geladen werden.</p> : null}
      {meals && !meals.length && <p className="muted" id="my-meals-empty">Hier sammelst du deine eigenen Mahlzeiten – z. B. dein Standard-Frühstück. Einmal erstellen, danach mit einem Tipp eintragen.</p>}
      {meals && meals.length > 0 && (
        <ul className="picker-list" id="my-meal-list">
          {meals.map((m) => {
            const t = mealTotals(m.items);
            return (
              <li key={m.id}>
                <button type="button" className="picker-item dish-item" data-my-meal={m.id} onClick={() => setOpen(m.id)}>
                  <span className="my-meal-icon" aria-hidden="true">🍽️</span>
                  <span className="dish-text">
                    <span className="picker-name">{m.name}</span>
                    <span className="picker-sub">{fmt(t.kcal, 0)} kcal · {fmt(t.protein, 0)} g Eiweiß · {m.items.length} {m.items.length === 1 ? 'Zutat' : 'Zutaten'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
