// Eintrag hinzufügen (Suche, Gerichte, Barcode, Beschreiben, Manuell) für das Ernährungstagebuch.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { pickNumber } from './NumberPicker';
import { fmt } from '../lib/format';
import { isBarcode, lookupBarcode, searchFood, scale, totals, type FoodEntry, type FoodItem } from '../lib/food';
import { BarcodeScanner } from './BarcodeScanner';
import { Dishes } from './FoodDishes';
import { mealName, parseDescription, searchLocalFoods, type ParsedItem } from '../lib/describe';

export type NewEntry = { name: string; brand?: string | null; amount_g?: number | null; kcal: number; protein: number; carbs: number; fat: number; barcode?: string | null; source: FoodEntry['source'] };

export function AddFood({ onClose, onAdd, onAddMany }: { onClose: () => void; onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void> }) {
  const { showError } = useApp();
  const [tab, setTab] = useState<'search' | 'dishes' | 'barcode' | 'describe' | 'manual'>('search');
  const [picked, setPicked] = useState<{ item: FoodItem; source: 'search' | 'barcode' } | null>(null);
  useEffect(() => {
    document.body.classList.add('picker-open');
    return () => document.body.classList.remove('picker-open');
  }, []);

  return (
    <div className="picker food-add" role="dialog" aria-modal="true" aria-label="Essen hinzufügen">
      <div className="picker-head">
        <h2>Essen hinzufügen</h2>
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
            {([['search', 'Suche'], ['dishes', 'Gerichte'], ['barcode', 'Barcode'], ['describe', 'Beschreiben'], ['manual', 'Manuell']] as const).map(([id, text]) => (
              <button key={id} type="button" className="picker-cat" role="tab" data-tab={id} aria-selected={tab === id} onClick={() => setTab(id)}>{text}</button>
            ))}
          </div>
          <div className="food-body">
            {tab === 'search' && <Search onPick={(item) => setPicked({ item, source: 'search' })} onError={showError} />}
            {tab === 'dishes' && <Dishes onAdd={onAdd} onAddMany={onAddMany} />}
            {tab === 'barcode' && <Barcode onPick={(item) => setPicked({ item, source: 'barcode' })} onError={showError} />}
            {tab === 'describe' && <Describe onAdd={onAdd} onAddMany={onAddMany} onError={showError} />}
            {tab === 'manual' && <Manual onAdd={onAdd} />}
          </div>
        </>
      )}
    </div>
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
      else setMsg('Dieses Produkt kennt Open Food Facts nicht. Trage es unter „Manuell“ ein.');
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };
  if (scanning)
    return <BarcodeScanner onClose={() => setScanning(false)} onCode={(c) => { setScanning(false); setCode(c); void find(c); }} />;
  return (
    <>
      <button className="btn primary block" id="scan-start" type="button" onClick={() => setScanning(true)}>📷 Mit der Kamera scannen</button>
      <p className="muted small center">oder Nummer unter dem Barcode eintippen:</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void find(code); }}>
        <input id="food-code" className="grow" inputMode="numeric" placeholder="z. B. 3017620422003" aria-label="Barcode-Nummer" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" id="food-lookup" type="submit" disabled={busy || !isBarcode(code)}>Suchen</button>
      </form>
      {busy && <p className="muted small">Suche läuft …</p>}
      {msg && <p className="notice" id="food-msg">{msg}</p>}
      <p className="muted small">Die Nährwerte kommen von Open Food Facts (freie Produktdatenbank) – bitte kurz prüfen.</p>
    </>
  );
}

function Describe({ onAdd, onAddMany, onError }: { onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void>; onError: (e: unknown) => void }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<(ParsedItem & { on: boolean })[] | null>(null);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [asMeal, setAsMeal] = useState(true);
  const [name, setName] = useState('');
  const go = () => {
    const r = parseDescription(text);
    setItems(r.items.map((i) => ({ ...i, on: true })));
    setName(mealName(r.items));
    setUnknown(r.unknown);
    setMsg(r.items.length || r.unknown.length ? '' : 'Schreibe zum Beispiel „50 g Joghurt, 2 Eier, 1 Banane“.');
  };
  const online = async (name: string) => {
    setBusy(true);
    try {
      const found = (await searchFood(name))[0];
      if (!found) {
        setMsg(`„${name}“ wurde auch online nicht gefunden. Trage es manuell ein.`);
        return;
      }
      const grams = found.serving_g ?? 100;
      setItems((cur) => [...(cur ?? []), { key: found.code || name, name: found.name, grams, estimated: true, ...scale(found.per100, grams), on: true }]);
      setUnknown((u) => u.filter((x) => x !== name));
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };
  const chosen = (items ?? []).filter((i) => i.on);
  const sum = totals(chosen);
  return (
    <>
      <label>Was hast du gegessen?
        <textarea id="describe-text" rows={3} placeholder="z. B. 50 g Joghurt, 2 Eier, 1 Banane" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="btn primary block" id="describe-go" disabled={!text.trim()} onClick={go}>Auswerten</button>
      <p className="muted small">Das ist keine KI: Die Werte kommen aus einer eingebauten Tabelle (Richtwerte). Ohne Mengenangabe wird ein üblicher Wert angenommen – prüfe die Gramm.</p>
      {msg && <p className="notice" id="describe-msg">{msg}</p>}
      {items && items.length > 0 && (
        <div className="card" id="describe-result">
          <h3>Erkannt</h3>
          <ul className="photo-items">
            {items.map((it, i) => (
              <li key={`${it.key}-${i}`} className={it.on ? '' : 'off'}>
                <label className="photo-check">
                  <input type="checkbox" checked={it.on} aria-label={`${it.name} übernehmen`} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                  <span className="food-name">{it.name}<small className="muted">{it.estimated ? 'Menge geschätzt · ' : ''}{fmt(it.protein, 0)} g Eiweiß · {fmt(it.carbs, 0)} g KH · {fmt(it.fat, 0)} g Fett</small></span>
                </label>
                <button type="button" className="btn small-btn" data-grams={i} onClick={async () => {
                  const v = await pickNumber({ title: it.name, unit: 'g', value: String(it.grams), min: 1, max: 3000, step: 1, bigStep: 10, itemW: 8, labelEvery: 50, integer: false });
                  if (v !== null) {
                    const g = Number(v.replace(',', '.'));
                    const f = g / it.grams;
                    setItems(items.map((x, j) => (j === i ? { ...x, grams: g, estimated: false, kcal: Math.round(x.kcal * f * 10) / 10, protein: Math.round(x.protein * f * 10) / 10, carbs: Math.round(x.carbs * f * 10) / 10, fat: Math.round(x.fat * f * 10) / 10 } : x)));
                  }
                }}>{fmt(it.grams, 0)} g</button>
                <strong className="photo-kcal">{fmt(it.kcal, 0)} kcal</strong>
              </li>
            ))}
          </ul>
          <p className="muted small" id="describe-sum">Zusammen {fmt(sum.kcal, 0)} kcal · {fmt(sum.protein, 0)} g Eiweiß · {fmt(sum.carbs, 0)} g KH · {fmt(sum.fat, 0)} g Fett</p>
          <label className="check-row"><input type="checkbox" id="describe-meal" checked={asMeal} onChange={(e) => setAsMeal(e.target.checked)} /> Als eine Mahlzeit speichern</label>
          {asMeal && <label>Name der Mahlzeit<input id="describe-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>}
          <button className="btn primary block" id="describe-add" disabled={!chosen.length || (asMeal && !name.trim())} onClick={() => {
            if (asMeal) return onAdd({ name: name.trim(), amount_g: chosen.reduce((g, i) => g + i.grams, 0), ...sum, source: 'manual' });
            return onAddMany(chosen.map((i) => ({ name: i.name, amount_g: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, source: 'manual' as const })));
          }}>
            {asMeal ? 'Mahlzeit hinzufügen' : 'Einzeln hinzufügen'}
          </button>
        </div>
      )}
      {unknown.length > 0 && (
        <div className="card" id="describe-unknown">
          <h3>Nicht gefunden</h3>
          {unknown.map((u) => (
            <div className="goal-row" key={u}>
              <span>{u}</span>
              <button type="button" className="btn small-btn" data-online={u} disabled={busy} onClick={() => online(u)}>Online suchen</button>
            </div>
          ))}
          <p className="muted small">„Online suchen“ nimmt das erste Ergebnis von Open Food Facts (je nach Produkt ungenau). Sonst: Tab „Manuell“.</p>
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
  const [offline, setOffline] = useState(false);
  const local = searchLocalFoods(q);
  const go = async () => {
    setBusy(true);
    setOffline(false);
    try {
      setResults(await searchFood(q));
    } catch {
      setResults([]);
      setOffline(true);
    } finally {
      setBusy(false);
    }
  };
  void onError;
  return (
    <>
      <form className="row" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <input type="search" id="food-q" className="grow" placeholder="z. B. Joghurt, Haferflocken, Pizza" aria-label="Lebensmittel suchen" autoComplete="off" enterKeyHint="search" value={q} onChange={(e) => { setQ(e.target.value); setResults(null); }} />
        <button className="btn primary" id="food-search" type="submit" disabled={busy || q.trim().length < 2}>Online suchen</button>
      </form>
      {local.length > 0 && (
        <>
          <h3 className="food-group">Standardwerte</h3>
          <ul className="picker-list food-local" id="food-local">
            {local.map((r) => <ItemRow key={r.name} item={r} onPick={onPick} />)}
          </ul>
        </>
      )}
      {q.trim().length >= 2 && !local.length && !results && <p className="muted small">Dazu gibt es keine Standardwerte. Tippe auf „Online suchen“ oder trage es manuell ein.</p>}
      {busy && <p className="muted small">Suche läuft …</p>}
      {offline && <p className="notice small" id="food-offline">Open Food Facts ist gerade nicht erreichbar. Die Standardwerte oben funktionieren trotzdem.</p>}
      {results && !busy && !offline && (
        <>
          <h3 className="food-group">Produkte (Open Food Facts)</h3>
          <ul className="picker-list food-results">
            {results.map((r, i) => <ItemRow key={`${r.code}-${i}`} item={r} onPick={onPick} />)}
            {!results.length && <li className="muted picker-empty">Online nichts gefunden. Versuche einen anderen Begriff oder trage es manuell ein.</li>}
          </ul>
        </>
      )}
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

