// Rezepte mit Anleitung (Zusatz „Essen+“): Vorschläge passend zu dem, was heute noch übrig ist; ins Tagebuch eintragen.
import { useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { FoodPlusPaywall } from '../components/Pro';
import { fmt } from '../lib/format';
import { MEALS, totals, type Meal } from '../lib/food';
import { norm } from '../lib/describe';
import { usePro } from '../lib/pro';
import { nutrition, RECIPE_FILTERS, RECIPES, suggestRecipes, type Recipe, type RecipeFilter } from '../lib/recipes';
import { todayISO } from '../lib/stats';
import { navigate } from '../app/router';

export function Recipes() {
  const { api, showError, dataVersion, dataChanged } = useApp();
  const pro = usePro();
  const social = api.social;
  const today = todayISO();
  const [filter, setFilter] = useState<RecipeFilter>('alle');
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const day = useAsync(() => (social && pro.food ? Promise.all([social.foodList(today), social.nutritionGoal()]) : Promise.resolve(null)), [social, pro.food, dataVersion]);
  if (!social) return <><h2>Rezepte</h2><FoodPlusPaywall /></>;
  if (!pro.loaded) return <Loading />;

  if (!pro.food) {
    // Vorschau: Namen und Kalorien, ohne Zutaten und Anleitung
    return (
      <>
        <h2>Rezepte</h2>
        <FoodPlusPaywall />
        <div className="card" id="recipe-teaser">
          <h3>Das erwartet dich</h3>
          <ul className="plan-list">
            {RECIPES.slice(0, 4).map((r) => (
              <li key={r.id}><span>{r.name}</span><span className="muted small">{nutrition(r).kcal} kcal</span></li>
            ))}
          </ul>
          <p className="muted small">… und {RECIPES.length - 4} weitere mit Zutaten und Anleitung.</p>
        </div>
      </>
    );
  }
  if (day.status === 'loading') return <Loading />;
  if (day.status === 'error') return <LoadError error={day.error} />;
  const [entries, goal] = day.data!;
  const eaten = totals(entries);
  const left = { kcal: Math.max(0, goal - eaten.kcal), protein: 0 };
  const needle = norm(q);
  const list = suggestRecipes(left, filter).filter(({ recipe }) => !needle || norm(`${recipe.name} ${recipe.ingredients.map((i) => i[2]).join(' ')}`).includes(needle));
  const current: Recipe | undefined = RECIPES.find((r) => r.id === open);

  const log = async (r: Recipe, meal: Meal) => {
    const n = nutrition(r);
    try {
      await social.foodAdd({ date: today, meal, name: r.name, amount_g: n.grams, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, source: 'manual' });
      dataChanged();
      navigate('#/essen');
    } catch (err) {
      showError(err);
    }
  };

  if (current) {
    const n = nutrition(current);
    return (
      <>
        <p><button className="btn small-btn" id="recipe-back" onClick={() => setOpen(null)}>← Alle Rezepte</button></p>
        <h2>{current.name}</h2>
        <p className="muted small">{current.minutes} Minuten · 1 Portion · {MEALS.find((m) => m[0] === current.meal)![1]}</p>
        <div className="tiles">
          <div className="tile"><span className="tile-value" id="recipe-kcal">{fmt(n.kcal, 0)}</span><span className="tile-label">kcal</span></div>
          <div className="tile"><span className="tile-value">{fmt(n.protein, 0)}</span><span className="tile-label">g Eiweiß</span></div>
          <div className="tile"><span className="tile-value">{fmt(n.carbs, 0)}</span><span className="tile-label">g Kohlenhydrate</span></div>
          <div className="tile"><span className="tile-value">{fmt(n.fat, 0)}</span><span className="tile-label">g Fett</span></div>
        </div>
        <div className="card"><h3>Zutaten</h3><ul className="recipe-ingredients">{current.ingredients.map(([, , label]) => <li key={label}>{label}</li>)}</ul></div>
        <div className="card"><h3>So geht’s</h3><ol className="recipe-steps">{current.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
        <button className="btn primary block" id="recipe-log" onClick={() => log(current, current.meal)}>
          Als {MEALS.find((m) => m[0] === current.meal)![1]} eintragen
        </button>
        <p className="muted small">Nährwerte sind Richtwerte aus den Zutatenmengen (Zutaten roh bzw. wie angegeben).</p>
      </>
    );
  }

  return (
    <>
      <h2>Rezepte</h2>
      <div className="card" id="recipe-left">
        <p className="muted small">Heute noch übrig</p>
        <p><strong className="recipe-left-kcal">{fmt(left.kcal, 0)} kcal</strong> <span className="muted">von {fmt(goal, 0)}</span></p>
      </div>
      <input type="search" id="recipe-q" className="block" placeholder={`${RECIPES.length} Rezepte durchsuchen (Name oder Zutat)`} aria-label="Rezepte suchen" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="picker-cats recipe-filters" role="tablist" aria-label="Filter">
        {RECIPE_FILTERS.map(([id, label]) => (
          <button key={id} type="button" className="picker-cat" role="tab" data-filter={id} aria-selected={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      <ul className="recipe-list">
        {list.map(({ recipe, n, fits }) => (
          <li key={recipe.id}>
            <button type="button" className="recipe-card" data-recipe={recipe.id} onClick={() => setOpen(recipe.id)}>
              <span className="recipe-title">{recipe.name}</span>
              <span className="muted small">{recipe.minutes} Min. · {fmt(n.kcal, 0)} kcal · {fmt(n.protein, 0)} g Eiweiß</span>
              <span className={`recipe-fit${fits ? ' ok' : ''}`}>{fits ? 'Passt zu deinem Ziel' : 'Mehr als heute noch übrig'}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="muted" id="recipe-none">Dazu gibt es keine Rezepte. Probiere einen anderen Filter oder Suchbegriff.</li>}
      </ul>
    </>
  );
}
