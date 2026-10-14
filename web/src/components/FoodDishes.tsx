// Tab „Gerichte“: Gericht suchen, Zutaten und Portion anpassen, als eine Mahlzeit oder einzeln eintragen.
import { useMemo, useState } from 'react';
import { DISH_BY_ID, dishNutrition, searchDishes, sumIngredients, type Dish } from '../lib/dishes';
import { toggleFavorite, useFavorites } from '../lib/dishFavorites';
import { coverOf, dishesOf, groupsIn, type DishGroup, type GroupSection } from '../lib/dishTags';
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
      <div className="dish-title-row"><h3>{dish.name}</h3><FavButton id={dish.id} name={dish.name} /></div>
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

/** Herz zum Merken eines Gerichts */
function FavButton({ id, name }: { id: string; name: string }) {
  const favs = useFavorites();
  const on = favs.includes(id);
  return (
    <button type="button" className={`fav-btn${on ? ' on' : ''}`} data-fav={id} aria-pressed={on} aria-label={on ? `${name} aus Favoriten entfernen` : `${name} zu Favoriten`}
      onClick={(e) => { e.stopPropagation(); toggleFavorite(id); }}>{on ? '♥' : '♡'}</button>
  );
}

/** Listenzeile: Bild, Name, Nährwerte, Herz */
function DishRow({ d, onOpen }: { d: Dish; onOpen: (d: Dish) => void }) {
  const n = dishNutrition(d);
  return (
    <li className="dish-row">
      <button type="button" className="picker-item dish-item" data-dish={d.id} onClick={() => onOpen(d)}>
        <DishImage dish={d} />
        <span className="dish-text">
          <span className="picker-name">{d.name}</span>
          <span className="picker-sub">{fmt(n.kcal, 0)} kcal · {fmt(n.protein, 0)} g Eiweiß{d.minutes ? ` · ${d.minutes} Min.` : d.ingredients.length === 1 ? ' · Fertiggericht' : ''}</span>
        </span>
      </button>
      <FavButton id={d.id} name={d.name} />
    </li>
  );
}

function GroupTile({ g, big, onOpen }: { g: DishGroup; big?: boolean; onOpen: (g: DishGroup) => void }) {
  const cover = big ? coverOf(g) : undefined;
  return (
    <button type="button" className={big ? 'dish-tile big' : 'dish-tile'} data-group={g.id} onClick={() => onOpen(g)}>
      {cover ? <DishImage dish={cover} className="dish-tile-img" /> : <span className="dish-tile-emoji" aria-hidden="true">{g.emoji}</span>}
      <span className="dish-tile-title">{g.title}</span>
      <span className="dish-tile-count">{dishesOf(g).length} Gerichte{big ? ' ›' : ''}</span>
    </button>
  );
}

const SECTIONS: { id: GroupSection; title: string; kind: 'row' | 'big' | 'grid' }[] = [
  { id: 'popular', title: 'Beliebte Kategorien', kind: 'row' },
  { id: 'meal', title: 'Nach Mahlzeit', kind: 'big' },
  { id: 'prep', title: 'Nach Zubereitung', kind: 'big' },
  { id: 'diet', title: 'Nach Ernährungsart', kind: 'grid' },
  { id: 'kcal', title: 'Nach Kalorien', kind: 'grid' },
];

export function Dishes({ onAdd, onAddMany }: { onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void> }) {
  const [q, setQ] = useState('');
  const [view, setView] = useState<'discover' | 'favs'>('discover');
  const [group, setGroup] = useState<DishGroup | null>(null);
  const [open, setOpen] = useState<Dish | null>(null);
  const favs = useFavorites();
  const results = useMemo(() => (q.trim() ? searchDishes(q, 'alle', 80) : []), [q]);
  if (open) return <DishDetail dish={open} onBack={() => setOpen(null)} onAdd={onAdd} onAddMany={onAddMany} />;
  const list = (items: Dish[]) => <ul className="picker-list dish-list" id="dish-list">{items.map((d) => <DishRow key={d.id} d={d} onOpen={setOpen} />)}</ul>;
  return (
    <div className="food-dishes">
      <div className="seg dish-seg" role="tablist" aria-label="Gerichte">
        <button type="button" role="tab" id="dish-discover" aria-selected={view === 'discover'} className={`seg-tab${view === 'discover' ? ' active' : ''}`} onClick={() => { setView('discover'); setGroup(null); }}>Entdecken</button>
        <button type="button" role="tab" id="dish-favs" aria-selected={view === 'favs'} className={`seg-tab${view === 'favs' ? ' active' : ''}`} onClick={() => { setView('favs'); setGroup(null); }}>Meine Favoriten{favs.length ? ` (${favs.length})` : ''}</button>
      </div>
      <input id="dish-q" type="search" placeholder="Gericht oder Zutat suchen, z. B. Bolognese, Döner, Feta" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim() ? (
        results.length ? list(results) : <p className="muted small">Kein Gericht gefunden. Versuche es mit „Beschreiben“ oder „Manuell“.</p>
      ) : view === 'favs' ? (
        favs.length ? list(favs.map((id) => DISH_BY_ID.get(id)).filter((d): d is Dish => Boolean(d))) : <p className="muted" id="dish-favs-empty">Noch keine Favoriten. Tippe bei einem Gericht auf ♡, dann findest du es hier wieder.</p>
      ) : group ? (
        <div id="dish-group" data-group={group.id}>
          <div className="dish-group-head">
            <button type="button" className="btn small-btn" id="dish-group-back" onClick={() => setGroup(null)}>‹ Zurück</button>
            <h3>{group.emoji} {group.title}</h3>
          </div>
          {list(dishesOf(group))}
        </div>
      ) : (
        <div id="dish-discover-page">
          {SECTIONS.map((sec) => {
            const groups = groupsIn(sec.id);
            if (!groups.length) return null;
            return (
              <section key={sec.id} className="dish-section" data-section={sec.id}>
                <h3>{sec.title}</h3>
                <div className={`dish-tiles dish-tiles-${sec.kind}`}>{groups.map((g) => <GroupTile key={g.id} g={g} big={sec.kind === 'big'} onOpen={setGroup} />)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
