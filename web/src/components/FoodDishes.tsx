// Tab „Gerichte“: Gericht suchen, Zutaten und Portion anpassen, als eine Mahlzeit oder einzeln eintragen.
import { useMemo, useState } from 'react';
import { DISH_CATS, dishNutrition, searchDishes, sumIngredients, type Dish, type DishCat } from '../lib/dishes';
import { fmt } from '../lib/format';
import { FOOD_BY_KEY } from '../lib/foodDb';
import { DishImage } from './DishImage';
import { pickNumber } from './NumberPicker';
import type { NewEntry } from './FoodAdd';

const FACTORS: [number, string][] = [[0.5, '½'], [1, '1'], [1.5, '1½'], [2, '2']];

export function DishDetail({ dish, onBack, onAdd, onAddMany, source = 'manual' }: { dish: Dish; onBack: () => void; onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void>; source?: 'manual' | 'photo' }) {
  const [grams, setGrams] = useState(() => dish.ingredients.map(([, g]) => g));
  const [on, setOn] = useState(() => dish.ingredients.map(() => true));
  const [factor, setFactor] = useState(1);
  const [busy, setBusy] = useState(false);
  const lines = dish.ingredients.map(([key, , label], i) => ({ key, label, i, grams: grams[i] * factor, on: on[i] }));
  const chosen = lines.filter((l) => l.on);
  const sum = sumIngredients(chosen);
  const factorText = factor === 1 ? '' : ` (${FACTORS.find(([f]) => f === factor)?.[1]} ${factor <= 1 ? 'Portion' : 'Portionen'})`;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card" id="dish-detail" data-dish={dish.id}>
      <button type="button" className="btn small-btn" id="dish-back" onClick={onBack}>‹ Zurück</button>
      <DishImage dish={dish} className="dish-hero" />
      <h3>{dish.name}</h3>
      <div className="nc-factors" role="group" aria-label="Portion">
        {FACTORS.map(([f, t]) => <button key={f} type="button" data-f={f} className={`picker-cat${factor === f ? ' active' : ''}`} aria-pressed={factor === f} onClick={() => setFactor(f)}>{t} {f <= 1 ? 'Portion' : 'Portionen'}</button>)}
      </div>
      <ul className="nc-ings" id="dish-ings">
        {lines.map((l) => (
          <li key={l.i} className={l.on ? '' : 'off'}>
            <input type="checkbox" checked={l.on} data-ing={l.i} aria-label={`${FOOD_BY_KEY.get(l.key)?.name ?? l.key} verwenden`} onChange={(e) => setOn(on.map((v, j) => (j === l.i ? e.target.checked : v)))} />
            <span className="food-name">{l.label.replace(/^\d+(?:,\d+)? (g|ml) /, '')}</span>
            <button type="button" className="btn small-btn" data-grams={l.i} onClick={async () => {
              const v = await pickNumber({ title: FOOD_BY_KEY.get(l.key)?.name ?? l.key, unit: 'g', value: String(Math.round(l.grams)), min: 1, max: 2000, step: 1, bigStep: 10, itemW: 8, labelEvery: 50, integer: true });
              if (v !== null) setGrams(grams.map((g, j) => (j === l.i ? Number(v) / factor : g)));
            }}>{fmt(l.grams, 0)} g</button>
          </li>
        ))}
      </ul>
      <div className="nc-tiles small" id="dish-sum">
        <div className="nc-tile"><span>Kalorien</span><b id="dish-kcal">{fmt(sum.kcal, 0)}</b></div>
        <div className="nc-tile"><span>Protein</span><b>{fmt(sum.protein, 0)} g</b></div>
        <div className="nc-tile"><span>Kohlenh.</span><b>{fmt(sum.carbs, 0)} g</b></div>
        <div className="nc-tile"><span>Fett</span><b>{fmt(sum.fat, 0)} g</b></div>
      </div>
      {dish.steps.length > 0 && (
        <details className="nc-steps">
          <summary>Zubereitung{dish.minutes ? ` · ${dish.minutes} Min.` : ''}</summary>
          <ol>{dish.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </details>
      )}
      <button type="button" className="btn primary block" id="dish-add" disabled={busy || !chosen.length} onClick={() => run(() => onAdd({ name: `${dish.name}${factorText}`, amount_g: Math.round(sum.grams), kcal: sum.kcal, protein: sum.protein, carbs: sum.carbs, fat: sum.fat, source }))}>Als eine Mahlzeit eintragen</button>
      <button type="button" className="btn block" id="dish-add-many" disabled={busy || !chosen.length} onClick={() => run(() => onAddMany(chosen.map((l) => {
        const n = sumIngredients([{ key: l.key, grams: l.grams }]);
        return { name: FOOD_BY_KEY.get(l.key)?.name ?? l.key, amount_g: Math.round(l.grams), kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, source };
      })))}>Zutaten einzeln eintragen</button>
    </div>
  );
}

export function Dishes({ onAdd, onAddMany }: { onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void> }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<DishCat | 'alle'>('alle');
  const [open, setOpen] = useState<Dish | null>(null);
  const list = useMemo(() => searchDishes(q, cat, 80), [q, cat]);
  if (open) return <DishDetail dish={open} onBack={() => setOpen(null)} onAdd={onAdd} onAddMany={onAddMany} />;
  return (
    <div className="food-dishes">
      <input id="dish-q" type="search" placeholder="Gericht oder Zutat suchen, z. B. Bolognese, Döner, Feta" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="picker-cats" role="tablist" aria-label="Kategorie">
        {DISH_CATS.map(([id, text]) => <button key={id} type="button" className="picker-cat" role="tab" data-cat={id} aria-selected={cat === id} onClick={() => setCat(id)}>{text}</button>)}
      </div>
      <ul className="picker-list" id="dish-list">
        {list.map((d) => {
          const n = dishNutrition(d);
          return (
            <li key={d.id}>
              <button type="button" className="picker-item dish-item" data-dish={d.id} onClick={() => setOpen(d)}>
                <DishImage dish={d} />
                <span className="dish-text">
                <span className="picker-name">{d.name}</span>
                <span className="picker-sub">{fmt(n.kcal, 0)} kcal · {fmt(n.protein, 0)} g Eiweiß · {d.ingredients.length === 1 ? 'Fertiggericht' : `${d.ingredients.length} Zutaten`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!list.length && <p className="muted small">Kein Gericht gefunden. Versuche es mit „Beschreiben“ oder „Manuell“.</p>}
    </div>
  );
}
