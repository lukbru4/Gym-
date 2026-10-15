// Tab „Foto“: Gratis-Erkennung auf dem Handy (3 Vorschläge aus unseren Gerichten/Lebensmitteln)
// und – für Pro – die genaue KI-Analyse mit Mengenschätzung (Server-Funktion food-photo).
import { useState } from 'react';
import { useApp } from '../app/context';
import { DISH_BY_ID } from '../lib/dishes';
import { FoodAiError, rescaleItem, totals, type FoodItem, type PhotoAnalysis, type PhotoItem } from '../lib/food';
import { fmt } from '../lib/format';
import { toMaxJpeg } from '../lib/image';
import { foodItemOf, guessFood, photoModelReady, type PhotoGuess } from '../lib/photoGuess';
import { usePro } from '../lib/pro';
import { ask } from './Dialog';
import { DishImage } from './DishImage';
import { DishDetail } from './FoodDishes';
import { pickNumber } from './NumberPicker';
import type { NewEntry } from './FoodAdd';

const AI_KEY = 'gym-tracker-food-ai-ok';
const askedBefore = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const remember = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* ignorieren */
  }
};
const DOWNLOAD_KEY = 'gym-tracker-photo-download-ok';

const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'));
  r.readAsDataURL(blob);
});

/** Genaue KI-Analyse (Pro): Liste mit Mengen, abwählbar, Gramm anpassbar */
function AiResult({ result, onAddMany, onBack }: { result: PhotoAnalysis; onAddMany: (e: NewEntry[]) => Promise<void>; onBack: () => void }) {
  const [items, setItems] = useState<(PhotoItem & { on: boolean })[]>(() => result.items.map((i) => ({ ...i, on: true })));
  const chosen = items.filter((i) => i.on);
  const sum = totals(chosen);
  return (
    <div className="card" id="photo-result">
      <h3>KI-Analyse</h3>
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
              const v = await pickNumber({ title: it.name, unit: 'g', value: String(Math.round(it.grams)), min: 1, max: 3000, step: 1, bigStep: 10, itemW: 8, labelEvery: 50, integer: true });
              if (v !== null) setItems(items.map((x, j) => (j === i ? { ...rescaleItem(x, Number(v.replace(',', '.'))), on: x.on } : x)));
            }}>{fmt(it.grams, 0)} g</button>
            <strong className="photo-kcal">{fmt(it.kcal, 0)} kcal</strong>
          </li>
        ))}
      </ul>
      <p className="muted small" id="photo-sum">Zusammen {fmt(sum.kcal, 0)} kcal · noch {result.remaining} KI-Foto{result.remaining === 1 ? '' : 's'} heute</p>
      <button className="btn primary block" id="photo-add" disabled={!chosen.length} onClick={() => onAddMany(chosen.map((i) => ({ name: i.name, amount_g: Math.round(i.grams), kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, source: 'photo' as const })))}>
        Hinzufügen
      </button>
      <button className="btn block" id="photo-ai-back" onClick={onBack}>‹ Zurück zu den Vorschlägen</button>
    </div>
  );
}

export function FoodPhoto({ onAdd, onAddMany, onPickFood, onSearch }: {
  onAdd: (e: NewEntry) => Promise<void>;
  onAddMany: (e: NewEntry[]) => Promise<void>;
  /** einzelnes Lebensmittel → Mengen-Auswahl */
  onPickFood: (item: FoodItem) => void;
  /** „Nichts davon“ → zur Suche */
  onSearch: () => void;
}) {
  const { api, showError } = useApp();
  const pro = usePro();
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState<'' | 'guess' | 'ai'>('');
  const [progress, setProgress] = useState<number | null>(null);
  const [guesses, setGuesses] = useState<PhotoGuess[] | null>(null);
  const [msg, setMsg] = useState('');
  const [aiMsg, setAiMsg] = useState('');
  const [ai, setAi] = useState<PhotoAnalysis | null>(null);
  const [dish, setDish] = useState<string | null>(null);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(''); setGuesses(null); setMsg(''); setAiMsg(''); setAi(null); setDish(null); setProgress(null);
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!photoModelReady() && !askedBefore(DOWNLOAD_KEY)) {
      const ok = await ask('Die Gratis-Erkennung läuft direkt auf deinem Handy – das Foto verlässt dein Gerät nicht. Beim ersten Mal wird dafür einmalig ein Erkennungs-Modell geladen (ca. 60 MB, WLAN empfohlen). Danach geht es schneller.', { title: 'Foto erkennen?', ok: 'Laden und erkennen' });
      if (!ok) return;
      remember(DOWNLOAD_KEY);
    }
    reset();
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setBusy('guess');
    try {
      const small = await toMaxJpeg(f, 512, 0.85);
      const res = await guessFood(small, (p) => setProgress(p));
      setGuesses(res);
      if (!res.length) setMsg('Kein passendes Gericht gefunden. Suche es einfach über „Suche“ oder „Gerichte“.');
    } catch (err) {
      console.error(err);
      setMsg('Die Foto-Erkennung hat gerade nicht geklappt (keine Verbindung beim ersten Laden?). Versuche es später noch einmal oder nutze die Suche.');
    } finally {
      setBusy('');
      setProgress(null);
    }
  };

  const analyze = async () => {
    if (!file || !api.social) return;
    if (!askedBefore(AI_KEY)) {
      if (!(await ask('Für die genaue Analyse wird dein Foto an einen KI-Dienst (Anthropic, USA) gesendet. Es wird bei uns nicht gespeichert. Die Werte sind Schätzungen.', { title: 'Genau analysieren?', ok: 'Einverstanden' }))) return;
      remember(AI_KEY);
    }
    setBusy('ai');
    setAiMsg('');
    try {
      const res = await api.social.analyzeFoodPhoto(await toBase64(await toMaxJpeg(file, 1024, 0.8)));
      if (!res.items.length) setAiMsg('Auf dem Foto konnte kein Essen erkannt werden. Versuche ein näheres Foto.');
      else setAi(res);
    } catch (err) {
      if (err instanceof FoodAiError) setAiMsg(err.code === 'not_configured' ? 'Die genaue KI-Analyse ist noch nicht eingerichtet.' : err.message);
      else showError(err);
    } finally {
      setBusy('');
    }
  };

  const choose = (g: PhotoGuess) => {
    const [kind, id] = g.target.split(':');
    if (kind === 'dish') setDish(id);
    else {
      const item = foodItemOf(g.target);
      if (item) onPickFood(item);
    }
  };

  const openDish = dish ? DISH_BY_ID.get(dish) : null;
  if (openDish) return <DishDetail dish={openDish} onBack={() => setDish(null)} onAdd={onAdd} onAddMany={onAddMany} source="photo" />;
  if (ai) return <AiResult result={ai} onAddMany={onAddMany} onBack={() => setAi(null)} />;

  return (
    <div className="food-photo">
      <label className={`btn primary block${busy ? ' disabled' : ''}`} id="photo-pick">
        📷 {file ? 'Anderes Foto' : 'Foto aufnehmen oder auswählen'}
        <input type="file" id="photo-file" accept="image/*" capture="environment" hidden disabled={Boolean(busy)} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {!file && <p className="muted small">Gratis: Die Erkennung läuft auf deinem Handy und schlägt passende Gerichte vor – Menge und Zutaten passt du danach an. Das Foto wird nicht hochgeladen.</p>}
      {preview && <img className="photo-preview" id="photo-preview" src={preview} alt="Dein Foto" />}
      {busy === 'guess' && <p className="muted" id="photo-busy">{progress !== null && progress < 100 ? `Erkennung wird geladen … ${progress} %` : 'Foto wird erkannt …'}</p>}
      {msg && <p className="notice" id="photo-msg">{msg}</p>}
      {guesses && guesses.length > 0 && (
        <div className="card" id="photo-guesses">
          <h3>Sieht aus wie …</h3>
          <ul className="picker-list">
            {guesses.map((g) => (
              <li key={g.target}>
                <button type="button" className="picker-item dish-item" data-guess={g.target} onClick={() => choose(g)}>
                  {(() => { const d = g.target.startsWith('dish:') ? DISH_BY_ID.get(g.target.slice(5)) : undefined; return d ? <DishImage dish={d} /> : null; })()}
                  <span className="dish-text">
                    <span className="picker-name">{g.name}</span>
                    <span className="picker-sub">ca. {fmt(g.kcal, 0)} kcal pro Portion ({fmt(g.grams, 0)} g) · {Math.round(g.score * 100)} % sicher</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn block" id="photo-none" onClick={onSearch}>Nichts davon – selbst suchen</button>
          <p className="muted small">Vorschläge sind eine grobe Erkennung. Tippe einen an und passe Portion und Zutaten an.</p>
        </div>
      )}
      {file && busy !== 'guess' && (
        <div className="card" id="photo-ai">
          <h3>Genau analysieren <span className="pro-tag">Pro</span></h3>
          <p className="muted small">Die KI erkennt mehrere Teile auf dem Teller und schätzt die Mengen.</p>
          {!api.social ? (
            <p className="muted small" id="photo-ai-local">Mit Konto und Pro verfügbar.</p>
          ) : pro.pro ? (
            <button type="button" className="btn block" id="photo-ai-go" disabled={Boolean(busy)} onClick={analyze}>{busy === 'ai' ? 'Wird analysiert …' : '✨ Mit KI genau analysieren'}</button>
          ) : (
            <a className="btn block" id="photo-ai-pro" href="#/pro">Mit Pro freischalten</a>
          )}
          {aiMsg && <p className="notice small" id="photo-ai-msg">{aiMsg}</p>}
        </div>
      )}
    </div>
  );
}
