// Essen: Kalorien und Nährwerte pro Tag und Mahlzeit (nur Pro). Hinzufügen per Suche, Barcode oder manuell.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ask } from '../components/Dialog';
import { pickNumber } from '../components/NumberPicker';
import { Paywall } from '../components/Pro';
import { fmt } from '../lib/format';
import { FoodAiError, isBarcode, lookupBarcode, MEALS, rescaleItem, scale, searchFood, suggestCalories, totals, type FoodEntry, type FoodItem, type Meal, type PhotoAnalysis, type PhotoItem } from '../lib/food';
import { toMaxJpeg } from '../lib/image';
import { loadQuiz } from '../lib/plan';
import { usePro } from '../lib/pro';
import { addDays, todayISO } from '../lib/stats';

const fmtDay = (iso: string, today: string) => (iso === today ? 'Heute' : iso === addDays(today, -1) ? 'Gestern' : new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }));

export function Food() {
  const { api, showError, dataVersion, dataChanged } = useApp();
  const pro = usePro();
  const social = api.social;
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [goalVersion, setGoalVersion] = useState(0);
  const entries = useAsync(() => (social ? social.foodList(date) : Promise.resolve([] as FoodEntry[])), [social, date, dataVersion]);
  const goal = useAsync(() => (social ? social.nutritionGoal() : Promise.resolve(2500)), [social, goalVersion]);
  if (!social) return <><h2>Essen</h2><Paywall reason="Kalorien tracken gibt es mit einem Konto und Pro." /></>;
  if (!pro.loaded) return <Loading />;
  if (!pro.pro && entries.status === 'ok' && !entries.data.length) return <><h2>Essen</h2><Paywall reason="Kalorien tracken gibt es mit Pro." /></>;
  if (entries.status === 'loading' || goal.status === 'loading') return <Loading />;
  if (entries.status === 'error') return <LoadError error={entries.error} />;
  if (goal.status === 'error') return <LoadError error={goal.error} />;
  const list = entries.data;
  const sum = totals(list);
  const target = goal.data;
  const pct = Math.min(100, Math.round((sum.kcal / target) * 100));
  const editGoal = async () => {
    const v = await pickNumber({ title: 'Tagesziel', unit: 'kcal', value: String(target), min: 800, max: 6000, step: 50, bigStep: 100, itemW: 12, labelEvery: 10, integer: true });
    if (v === null) return;
    try {
      await social.setNutritionGoal(Number(v));
      setGoalVersion((n) => n + 1);
    } catch (err) {
      showError(err);
    }
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

  return (
    <>
      <h2>Essen</h2>
      {!pro.pro && <Paywall reason="Dein Pro ist abgelaufen – ansehen geht weiter, neue Einträge brauchen Pro." />}
      <div className="day-nav">
        <button className="btn small-btn" id="day-prev" aria-label="Vorheriger Tag" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <strong id="day-label">{fmtDay(date, today)}</strong>
        <button className="btn small-btn" id="day-next" aria-label="Nächster Tag" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>
      <div className="card food-summary" id="food-summary">
        <button type="button" className="food-kcal" id="food-goal" onClick={editGoal} aria-label="Tagesziel ändern">
          <strong>{fmt(sum.kcal, 0)}</strong> <span>/ {fmt(target, 0)} kcal</span>
          <small>{sum.kcal <= target ? `noch ${fmt(target - sum.kcal, 0)} kcal` : `${fmt(sum.kcal - target, 0)} kcal drüber`} · Ziel ändern</small>
        </button>
        <SuggestGoal target={target} onTake={async (kcal) => {
          try {
            await social.setNutritionGoal(kcal);
            setGoalVersion((n) => n + 1);
          } catch (err) {
            showError(err);
          }
        }} />
        <div className="food-bar" aria-hidden="true"><i className={sum.kcal > target ? 'over' : ''} style={{ width: `${pct}%` }} /></div>
        <div className="tiles">
          <div className="tile"><span className="tile-value">{sum.protein}</span><span className="tile-label">g Eiweiß</span></div>
          <div className="tile"><span className="tile-value">{sum.carbs}</span><span className="tile-label">g Kohlenhydrate</span></div>
          <div className="tile"><span className="tile-value">{sum.fat}</span><span className="tile-label">g Fett</span></div>
        </div>
      </div>
      {MEALS.map(([meal, label]) => {
        const mine = list.filter((e) => e.meal === meal);
        return (
          <div className="card" key={meal} data-meal={meal}>
            <div className="block-head"><h3>{label}</h3><span className="muted small">{fmt(totals(mine).kcal, 0)} kcal</span></div>
            <ul className="food-list">
              {mine.map((e) => (
                <li key={e.id}>
                  <span className="food-name">{e.name}<small className="muted">{[e.brand, e.amount_g ? `${fmt(e.amount_g, 0)} g` : null].filter(Boolean).join(' · ')}</small></span>
                  <span>{fmt(e.kcal, 0)} kcal</span>
                  <button className="icon-btn" aria-label={`${e.name} löschen`} data-del={e.id} onClick={() => remove(e)}>✕</button>
                </li>
              ))}
            </ul>
            <button className="btn block" data-add={meal} disabled={!pro.pro} onClick={() => setAdding(meal)}>+ Hinzufügen</button>
          </div>
        );
      })}
      <p className="muted small">Kalorien und Nährwerte sind Richtwerte. Produktdaten stammen von Open Food Facts (Mitmach-Datenbank, nicht immer vollständig).</p>
      {adding && (
        <AddFood
          meal={adding}
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
          onAddMany={async (list) => {
            try {
              for (const item of list) await social.foodAdd({ date, meal: adding, ...item });
              setAdding(null);
              dataChanged();
            } catch (err) {
              dataChanged();
              showError(err);
            }
          }}
          analyze={(b64) => social.analyzeFoodPhoto(b64)}
        />
      )}
    </>
  );
}

function SuggestGoal({ target, onTake }: { target: number; onTake: (kcal: number) => void }) {
  const sug = suggestCalories(loadQuiz()?.answers ?? {});
  if (!sug)
    return <p className="muted small" id="food-nosuggest">Beantworte in den Einstellungen die Fragen (Größe, Gewicht, Alter), dann schlagen wir dir ein Tagesziel vor.</p>;
  if (sug.kcal === target) return <p className="muted small" id="food-suggest-ok">Dein Ziel passt zu deinem geschätzten Bedarf ({sug.note}).</p>;
  return (
    <div className="notice small" id="food-suggest">
      Vorschlag aus deinen Antworten: <strong>{fmt(sug.kcal, 0)} kcal</strong> ({sug.note}). Das ist nur eine Schätzung.
      <button className="btn small-btn" id="food-suggest-take" onClick={() => onTake(sug.kcal)}>Übernehmen</button>
    </div>
  );
}

type NewEntry = { name: string; brand?: string | null; amount_g?: number | null; kcal: number; protein: number; carbs: number; fat: number; barcode?: string | null; source: FoodEntry['source'] };

function AddFood({ meal, onClose, onAdd, onAddMany, analyze }: { meal: Meal; onClose: () => void; onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void>; analyze: (base64: string) => Promise<PhotoAnalysis> }) {
  const { showError } = useApp();
  const [tab, setTab] = useState<'search' | 'barcode' | 'manual' | 'photo'>('search');
  const [picked, setPicked] = useState<{ item: FoodItem; source: 'search' | 'barcode' } | null>(null);
  useEffect(() => {
    document.body.classList.add('picker-open');
    return () => document.body.classList.remove('picker-open');
  }, []);
  const label = MEALS.find((m) => m[0] === meal)![1];

  return (
    <div className="picker food-add" role="dialog" aria-modal="true" aria-label={`${label} hinzufügen`}>
      <div className="picker-head">
        <h2>{label}</h2>
        <button className="icon-btn" type="button" aria-label="Schließen" id="food-close" onClick={onClose}>✕</button>
      </div>
      {picked ? (
        <Amount item={picked.item} onBack={() => setPicked(null)} onAdd={(grams) => {
          const n = scale(picked.item.per100, grams);
          return onAdd({ name: picked.item.name, brand: picked.item.brand ?? null, amount_g: grams, ...n, barcode: picked.item.code ?? null, source: picked.source });
        }} />
      ) : (
        <>
          <div className="picker-cats" role="tablist" aria-label="Wie hinzufügen?">
            {([['search', 'Suche'], ['barcode', 'Barcode'], ['photo', 'Foto'], ['manual', 'Manuell']] as const).map(([id, text]) => (
              <button key={id} type="button" className="picker-cat" role="tab" data-tab={id} aria-selected={tab === id} onClick={() => setTab(id)}>{text}</button>
            ))}
          </div>
          <div className="food-body">
            {tab === 'search' && <Search onPick={(item) => setPicked({ item, source: 'search' })} onError={showError} />}
            {tab === 'barcode' && <Barcode onPick={(item) => setPicked({ item, source: 'barcode' })} onError={showError} />}
            {tab === 'photo' && <Photo analyze={analyze} onAddMany={onAddMany} onError={showError} />}
            {tab === 'manual' && <Manual onAdd={onAdd} />}
          </div>
        </>
      )}
    </div>
  );
}

const AI_KEY = 'gym-tracker-food-ai-ok';
function Photo({ analyze, onAddMany, onError }: { analyze: (b64: string) => Promise<PhotoAnalysis>; onAddMany: (e: NewEntry[]) => Promise<void>; onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PhotoAnalysis | null>(null);
  const [items, setItems] = useState<(PhotoItem & { on: boolean })[]>([]);
  const [msg, setMsg] = useState('');
  const pick = async (file: File | undefined) => {
    if (!file) return;
    let ok = false;
    try {
      ok = localStorage.getItem(AI_KEY) === '1';
    } catch {
      /* nochmal fragen */
    }
    if (!ok) {
      if (!(await ask('Dein Foto wird zur Auswertung an einen KI-Dienst (Anthropic, USA) gesendet. Es wird bei uns nicht gespeichert. Die Werte sind Schätzungen.', { title: 'Foto auswerten?', ok: 'Einverstanden' }))) return;
      try {
        localStorage.setItem(AI_KEY, '1');
      } catch {
        /* ignorieren */
      }
    }
    setBusy(true);
    setMsg('');
    try {
      const jpeg = await toMaxJpeg(file, 1024, 0.8);
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
        r.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'));
        r.readAsDataURL(jpeg);
      });
      const res = await analyze(b64);
      setResult(res);
      setItems(res.items.map((i) => ({ ...i, on: true })));
      if (!res.items.length) setMsg('Auf dem Foto konnte kein Essen erkannt werden. Versuche ein näheres Foto oder trage es manuell ein.');
    } catch (err) {
      if (err instanceof FoodAiError) setMsg(err.message);
      else onError(err);
    } finally {
      setBusy(false);
    }
  };
  const chosen = items.filter((i) => i.on);
  const sum = totals(chosen);
  return (
    <>
      {!result && (
        <>
          <label className={`btn primary block${busy ? ' disabled' : ''}`} id="photo-pick">
            📷 Foto aufnehmen oder auswählen
            <input type="file" id="photo-file" accept="image/*" capture="environment" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <p className="muted small">Die KI schätzt Gericht, Menge und Nährwerte. Das sind <strong>Schätzungen</strong> – prüfe die Mengen, bevor du speicherst. Das Foto wird nicht gespeichert.</p>
        </>
      )}
      {busy && <p className="muted" id="photo-busy">Das Foto wird ausgewertet …</p>}
      {msg && <p className="notice" id="photo-msg">{msg}</p>}
      {result && items.length > 0 && (
        <div className="card" id="photo-result">
          <h3>Erkannt</h3>
          {result.confidence === 'low' && <p className="notice small">Die KI ist unsicher. Bitte Mengen genau prüfen.</p>}
          {result.note && <p className="muted small">{result.note}</p>}
          <ul className="photo-items">
            {items.map((it, i) => (
              <li key={i} className={it.on ? '' : 'off'}>
                <label className="photo-check">
                  <input type="checkbox" checked={it.on} aria-label={`${it.name} übernehmen`} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                  <span className="food-name">{it.name}<small className="muted">{fmt(it.protein, 0)} g Eiweiß · {fmt(it.carbs, 0)} g KH · {fmt(it.fat, 0)} g Fett</small></span>
                </label>
                <button type="button" className="btn small-btn" data-grams={i} onClick={async () => {
                  const v = await pickNumber({ title: it.name, unit: 'g', value: String(it.grams), min: 1, max: 3000, step: 1, bigStep: 10, itemW: 8, labelEvery: 50, integer: false });
                  if (v !== null) setItems(items.map((x, j) => (j === i ? { ...rescaleItem(x, Number(v.replace(',', '.'))), on: x.on } : x)));
                }}>{fmt(it.grams, 0)} g</button>
                <strong className="photo-kcal">{fmt(it.kcal, 0)} kcal</strong>
              </li>
            ))}
          </ul>
          <p className="muted small" id="photo-sum">Zusammen {fmt(sum.kcal, 0)} kcal · noch {result.remaining} Foto{result.remaining === 1 ? '' : 's'} heute</p>
          <button className="btn primary block" id="photo-add" disabled={!chosen.length} onClick={() => onAddMany(chosen.map((i) => ({ name: i.name, amount_g: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, source: 'photo' as const })))}>
            Hinzufügen
          </button>
          <button className="btn block" id="photo-again" onClick={() => { setResult(null); setItems([]); setMsg(''); }}>Anderes Foto</button>
        </div>
      )}
    </>
  );
}

function ItemRow({ item, onPick }: { item: FoodItem; onPick: (i: FoodItem) => void }) {
  return (
    <li>
      <button type="button" className="picker-item" data-code={item.code} onClick={() => onPick(item)}>
        <span className="picker-name">{item.name}</span>
        <span className="picker-sub">{[item.brand, `${fmt(item.per100.kcal, 0)} kcal pro 100 g`].filter(Boolean).join(' · ')}</span>
      </button>
    </li>
  );
}

function Search({ onPick, onError }: { onPick: (i: FoodItem) => void; onError: (e: unknown) => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodItem[] | null>(null);
  const go = async () => {
    setBusy(true);
    try {
      setResults(await searchFood(q));
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <form className="row" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <input type="search" id="food-q" className="grow" placeholder="z. B. Haferflocken" aria-label="Lebensmittel suchen" autoComplete="off" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn primary" id="food-search" type="submit" disabled={busy || q.trim().length < 2}>Suchen</button>
      </form>
      {busy && <p className="muted small">Suche läuft …</p>}
      {results && !busy && (
        <ul className="picker-list food-results">
          {results.map((r, i) => <ItemRow key={`${r.code}-${i}`} item={r} onPick={onPick} />)}
          {!results.length && <li className="muted picker-empty">Nichts gefunden. Versuche einen anderen Begriff oder trage es manuell ein.</li>}
        </ul>
      )}
    </>
  );
}

function Barcode({ onPick, onError }: { onPick: (i: FoodItem) => void; onError: (e: unknown) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState('');
  const find = async (c: string) => {
    setBusy(true);
    setMsg('');
    try {
      const item = await lookupBarcode(c);
      if (item) onPick(item);
      else setMsg('Dieses Produkt kennt Open Food Facts nicht. Trage es manuell ein.');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };
  if (scanning)
    return <BarcodeScanner onClose={() => setScanning(false)} onCode={(c) => { setScanning(false); setCode(c); find(c); }} />;
  return (
    <>
      <button className="btn primary block" id="scan-start" type="button" onClick={() => setScanning(true)}>📷 Mit der Kamera scannen</button>
      <p className="muted small center">oder Nummer unter dem Barcode eintippen:</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); find(code); }}>
        <input id="food-code" className="grow" inputMode="numeric" placeholder="z. B. 3017620422003" aria-label="Barcode-Nummer" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" id="food-lookup" type="submit" disabled={busy || !isBarcode(code)}>Suchen</button>
      </form>
      {busy && <p className="muted small">Suche läuft …</p>}
      {msg && <p className="notice" id="food-msg">{msg}</p>}
    </>
  );
}

function Amount({ item, onBack, onAdd }: { item: FoodItem; onBack: () => void; onAdd: (grams: number) => Promise<void> }) {
  const [grams, setGrams] = useState(item.serving_g ?? 100);
  const [busy, setBusy] = useState(false);
  const n = scale(item.per100, grams);
  return (
    <div className="card" id="food-amount">
      <h3>{item.name}</h3>
      {item.brand && <p className="muted small">{item.brand}</p>}
      <button type="button" className="quiz-range" id="food-grams" onClick={async () => {
        const v = await pickNumber({ title: 'Menge', unit: 'g', value: String(grams), min: 1, max: 2000, step: 1, bigStep: 10, itemW: 10, labelEvery: 10, integer: false });
        if (v !== null) setGrams(Number(v.replace(',', '.')));
      }}>
        <strong>{fmt(grams, 0)}</strong> <span>g</span>
        <small>antippen zum Ändern{item.serving_g ? ` · Portion ${fmt(item.serving_g, 0)} g` : ''}</small>
      </button>
      <div className="tiles">
        <div className="tile"><span className="tile-value" id="food-kcal">{fmt(n.kcal, 0)}</span><span className="tile-label">kcal</span></div>
        <div className="tile"><span className="tile-value">{fmt(n.protein, 1)}</span><span className="tile-label">g Eiweiß</span></div>
        <div className="tile"><span className="tile-value">{fmt(n.carbs, 1)}</span><span className="tile-label">g Kohlenhydrate</span></div>
        <div className="tile"><span className="tile-value">{fmt(n.fat, 1)}</span><span className="tile-label">g Fett</span></div>
      </div>
      <button className="btn primary block" id="food-confirm" disabled={busy} onClick={async () => { setBusy(true); await onAdd(grams); setBusy(false); }}>Hinzufügen</button>
      <button className="btn block" id="food-back" onClick={onBack}>‹ Zurück</button>
    </div>
  );
}

function Manual({ onAdd }: { onAdd: (e: NewEntry) => Promise<void> }) {
  const [f, setF] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [busy, setBusy] = useState(false);
  const toNum = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(',', '.')));
  const valid = f.name.trim() !== '' && f.kcal.trim() !== '' && [f.kcal, f.protein, f.carbs, f.fat].every((x) => Number.isFinite(toNum(x)) && toNum(x) >= 0);
  const field = (key: keyof typeof f, label: string, mode: 'text' | 'decimal' = 'decimal') => (
    <label>{label}<input id={`m-${key}`} inputMode={mode} autoComplete="off" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></label>
  );
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      await onAdd({ name: f.name.trim(), kcal: toNum(f.kcal), protein: toNum(f.protein), carbs: toNum(f.carbs), fat: toNum(f.fat), source: 'manual' });
      setBusy(false);
    }}>
      {field('name', 'Name', 'text')}
      <div className="row pair">
        {field('kcal', 'Kalorien (kcal)')}
        {field('protein', 'Eiweiß (g)')}
      </div>
      <div className="row pair">
        {field('carbs', 'Kohlenhydrate (g)')}
        {field('fat', 'Fett (g)')}
      </div>
      <p className="muted small">Werte für die ganze Portion, die du gegessen hast.</p>
      <button className="btn primary block" id="manual-add" type="submit" disabled={!valid || busy}>Hinzufügen</button>
    </form>
  );
}
