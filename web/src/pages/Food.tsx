// Essen: Kalorien und Nährwerte pro Tag und Mahlzeit (nur Pro). Hinzufügen per Suche, Barcode oder manuell.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { foodChatEnabled, foodPhotoEnabled } from '../data/config';
import { FoodChat } from '../components/FoodChat';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ask } from '../components/Dialog';
import { pickNumber } from '../components/NumberPicker';
import { Paywall } from '../components/Pro';
import { fmt } from '../lib/format';
import { FoodAiError, isBarcode, lookupBarcode, mealForHour, nutritionScore, rescaleItem, scale, searchFood, totals, type FoodEntry, type FoodItem, type Meal, type PhotoAnalysis, type PhotoItem } from '../lib/food';
import { toMaxJpeg } from '../lib/image';
import { mealName, parseDescription, searchLocalFoods, type ParsedItem } from '../lib/describe';
import { usePro } from '../lib/pro';
import { addDays, todayISO } from '../lib/stats';

const MINI_LEN = 2 * Math.PI * 26;
function MiniRing({ id, label, value, goal }: { id: string; label: string; value: number; goal: number }) {
  const p = Math.min(1, value / goal);
  return (
    <div className="mini-ring" data-macro={id} title={`Richtwert ${fmt(goal, 0)} g`}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r="26" className="ring-track mini" />
        <circle cx="30" cy="30" r="26" className={`ring-fill mini ${id}`} strokeDasharray={`${p * MINI_LEN} ${MINI_LEN}`} transform="rotate(-90 30 30)" />
      </svg>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
const RING_LEN = 2 * Math.PI * 52;
const fmtDay = (iso: string, today: string) => (iso === today ? 'Heute' : iso === addDays(today, -1) ? 'Gestern' : new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }));

export function Food() {
  const { api, showError, dataVersion, dataChanged } = useApp();
  const pro = usePro();
  const social = api.social;
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
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
  const score = nutritionScore(sum, target);
  // Richtwerte: 50 % Kohlenhydrate, 25 % Eiweiß, 25 % Fett der Tageskalorien
  const macros = [
    { id: 'carbs', label: 'Kohlenhydrate', value: sum.carbs, goal: (target * 0.5) / 4 },
    { id: 'protein', label: 'Eiweiß', value: sum.protein, goal: (target * 0.25) / 4 },
    { id: 'fat', label: 'Fett', value: sum.fat, goal: (target * 0.25) / 9 },
  ];
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
        <button type="button" className="food-ring" id="food-goal" onClick={editGoal} aria-label="Tagesziel ändern">
          <span className="ring-side"><strong>{fmt(sum.kcal, 0)}</strong><small>gegessen</small></span>
          <svg viewBox="0 0 120 120" className="ring-svg" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="ring-track" />
            <circle cx="60" cy="60" r="52" className={`ring-fill${sum.kcal > target ? ' over' : ''}`} strokeDasharray={`${(pct / 100) * RING_LEN} ${RING_LEN}`} transform="rotate(-90 60 60)" />
          </svg>
          <span className="ring-mid" id="food-left">
            <strong>{fmt(Math.abs(target - sum.kcal), 0)}</strong>
            <small>{sum.kcal <= target ? 'übrig' : 'drüber'}</small>
          </span>
          <span className="ring-side"><strong>{fmt(target, 0)}</strong><small>Ziel</small></span>
        </button>
        <div className="macro-row" id="food-macros">
          {macros.map((m) => <MiniRing key={m.id} {...m} />)}
          <button type="button" className="macro-plus" id="food-plus" aria-label="Essen hinzufügen" disabled={!pro.pro} onClick={() => setAdding(mealForHour(new Date().getHours()))}>+</button>
        </div>
      </div>
      <div className="card" id="food-score">
        <div className="block-head"><h3>Nährwert-Score</h3><strong id="food-score-label">{score ? score.label : '–'}</strong></div>
        <div className="score-bar" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => <i key={n} className={score && n <= score.level ? `on l${score.level}` : ''} />)}
        </div>
        <p className="muted small">{score ? 'Einfache Schätzung aus Eiweiß, Fett, Kohlenhydraten und Kalorien des Tages.' : 'Trage etwas ein, dann siehst du hier deinen Score.'}</p>
      </div>
      <div className="card" id="food-day">
        <div className="block-head"><h3>Gegessen</h3><span className="muted small">{fmt(sum.kcal, 0)} kcal</span></div>
        <ul className="food-list">
          {list.map((e) => (
            <li key={e.id}>
              <span className="food-name">{e.name}<small className="muted">{[e.brand, e.amount_g ? `${fmt(e.amount_g, 0)} g` : null].filter(Boolean).join(' · ')}</small></span>
              <span>{fmt(e.kcal, 0)} kcal</span>
              <button className="icon-btn" aria-label={`${e.name} löschen`} data-del={e.id} onClick={() => remove(e)}>✕</button>
            </li>
          ))}
        </ul>
        {!list.length && <p className="muted small">Noch nichts eingetragen.</p>}
        <button className="btn primary block" id="food-add" disabled={!pro.pro} onClick={() => setAdding(mealForHour(new Date().getHours()))}>+ Hinzufügen</button>
      </div>
      {foodChatEnabled() && pro.pro && (
        <button className="btn primary block" id="open-chat" onClick={() => setChatOpen(true)}>💬 Mit dem Essens-Assistenten eintragen</button>
      )}
      <a className="btn block" id="open-recipes" href="#/rezepte">🍳 Rezepte – was kann ich jetzt kochen?</a>
      <p className="muted small">Kalorien und Nährwerte sind Richtwerte. Produktdaten stammen von Open Food Facts (Mitmach-Datenbank, nicht immer vollständig).</p>
      {chatOpen && (
        <FoodChat
          chat={(msgs) => social.foodChat(msgs)}
          onClose={() => setChatOpen(false)}
          onError={showError}
          onAdd={async (meal, items) => {
            for (const it of items) await social.foodAdd({ date, meal, name: it.name, amount_g: it.grams, kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat, source: 'chat' });
            dataChanged();
          }}
        />
      )}
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

type NewEntry = { name: string; brand?: string | null; amount_g?: number | null; kcal: number; protein: number; carbs: number; fat: number; barcode?: string | null; source: FoodEntry['source'] };

function AddFood({ onClose, onAdd, onAddMany, analyze }: { onClose: () => void; onAdd: (e: NewEntry) => Promise<void>; onAddMany: (e: NewEntry[]) => Promise<void>; analyze: (base64: string) => Promise<PhotoAnalysis> }) {
  const { showError } = useApp();
  const [tab, setTab] = useState<'search' | 'barcode' | 'describe' | 'manual' | 'photo'>('search');
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
            {([['search', 'Suche'], ['barcode', 'Barcode'], ['describe', 'Beschreiben'], ...(foodPhotoEnabled() ? ([['photo', 'Foto']] as const) : []), ['manual', 'Manuell']] as const).map(([id, text]) => (
              <button key={id} type="button" className="picker-cat" role="tab" data-tab={id} aria-selected={tab === id} onClick={() => setTab(id)}>{text}</button>
            ))}
          </div>
          <div className="food-body">
            {tab === 'search' && <Search onPick={(item) => setPicked({ item, source: 'search' })} onError={showError} />}
            {tab === 'barcode' && <Barcode onPick={(item) => setPicked({ item, source: 'barcode' })} onError={showError} />}
            {tab === 'photo' && foodPhotoEnabled() && <Photo analyze={analyze} onAddMany={onAddMany} onError={showError} />}
            {tab === 'describe' && <Describe onAdd={onAdd} onAddMany={onAddMany} onError={showError} />}
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
