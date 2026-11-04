// Körpermaße und Fortschritts-Fotos (Körper-Seite) sowie geteilte Fotos im Freundesprofil.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { ask, askText, notify } from './Dialog';
import { ChartView } from './ChartView';
import { addGymLog } from '../lib/activity';
import { fmt, fmtDate, fmtShortDate } from '../lib/format';
import { toMaxJpeg } from '../lib/image';
import { photoDate } from '../lib/photoDate';
import { cleanMeasure, comparablePoses, defaultPair, hasValues, latestValues, measureSummary, measureTrend, MEASURES, POSES, poseName, type Measure, type MeasureKey, type Pose, type ProgressPhoto } from '../lib/measures';
import { todayISO } from '../lib/stats';
import type { BodyWeight } from '../lib/types';
import { isMissingSchema, type FriendPhoto } from '../data/progress';
import { supabaseDashboardUrl } from '../data/config';
import { WEB_URL } from '../lib/platform';

/** Hinweis, wenn Fotos/Maße nicht geladen werden konnten – beim fehlenden Datenbank-Update mit Anleitung */
function LoadProblem({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isMissingSchema(error)) {
    return (
      <div className="notice small schema-missing" id="schema-missing">
        <strong>⚙️ Datenbank-Update 68 nötig</strong>
        <p>Damit Fotos und Maße in deinem Konto gespeichert werden, muss in Supabase einmal das Datenbank-Update laufen: SQL Editor öffnen, den Inhalt von <code>supabase/schema.sql</code> einfügen und auf „Run“ tippen.</p>
        <div className="row">
          <a className="btn small-btn primary" href={`${WEB_URL}supabase/einrichten.html`} target="_blank" rel="noopener">1. SQL kopieren</a>
          <a className="btn small-btn" href={supabaseDashboardUrl('sql/new')} target="_blank" rel="noopener">2. Supabase öffnen</a>
          <button type="button" className="btn small-btn" onClick={onRetry}>Erneut prüfen</button>
        </div>
      </div>
    );
  }
  return <p className="notice small" id="load-problem">Konnte nicht geladen werden. <button type="button" className="link-btn" onClick={onRetry}>Erneut versuchen</button></p>;
}

const signed = (n: number, unit: string) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${fmt(Math.abs(n), 1)} ${unit}`;

// ---------------------------------------------------------------------------------------------
// Körpermaße
// ---------------------------------------------------------------------------------------------
export function MeasuresSection() {
  const { api, user, showError, dataVersion, dataChanged } = useApp();
  const [retry, setRetry] = useState(0);
  const list = useAsync(() => api.progress.listMeasures(), [api, dataVersion, retry]);
  const [date, setDate] = useState(todayISO());
  const [vals, setVals] = useState<Record<string, string>>({});
  const [chart, setChart] = useState<MeasureKey | null>(null);
  const [open, setOpen] = useState(false);
  if (list.status === 'loading') return null;
  if (list.status === 'error') return <section id="measures"><h2>Körpermaße</h2><LoadProblem error={list.error} onRetry={() => setRetry((x) => x + 1)} /></section>;
  const rows = list.data;
  const last = latestValues(rows);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const v = cleanMeasure(vals);
    if (!hasValues(v)) return showError(new Error('Bitte mindestens ein Maß eintragen (z. B. Taille 82).'));
    try {
      await api.progress.saveMeasure(date, v);
      addGymLog(user?.id ?? 'local', date, `📏 Maße eingetragen: ${measureSummary(v)}`);
      setVals({}); setOpen(false); dataChanged();
    } catch (err) {
      showError(err);
    }
  };
  const trends = MEASURES.map((m) => ({ m, t: measureTrend(rows, m.key) })).filter((x) => x.t);
  const chartTrend = chart ? measureTrend(rows, chart) : null;
  const chartDef = chart ? MEASURES.find((m) => m.key === chart)! : null;
  return (
    <section id="measures">
      <h2>Körpermaße</h2>
      <p className="muted small">Nur für dich sichtbar – Freunde sehen deine Maße nie.</p>
      {trends.length > 0 && (
        <div className="measure-tiles" id="measure-tiles">
          {trends.map(({ m, t }) => (
            <button key={m.key} type="button" className={`measure-tile${chart === m.key ? ' active' : ''}`} data-measure={m.key} onClick={() => setChart(chart === m.key ? null : m.key)}>
              <span className="measure-name">{m.name}</span>
              <strong>{fmt(t!.last.value, 1)} {m.unit}</strong>
              {t!.points.length > 1 && <span className={`measure-change ${t!.good === null ? '' : t!.good ? 'good' : 'bad'}`}>{signed(t!.change, m.unit)} seit {fmtShortDate(t!.first.date)}</span>}
            </button>
          ))}
        </div>
      )}
      {chartTrend && chartDef && (
        <div className="card" id="measure-chart">
          <h3>{chartDef.name}</h3>
          <ChartView type="line" labels={chartTrend.points.map((p) => fmtShortDate(p.date))} series={[{ label: chartDef.name, data: chartTrend.points.map((p) => p.value), color: '--series-2' }]} unit={chartDef.unit} id="measure-chart-view" />
          <p className="muted small">So misst du: {chartDef.how}</p>
        </div>
      )}
      {!open ? (
        <button type="button" className="btn block" id="measure-open" onClick={() => setOpen(true)}>📏 Maße eintragen</button>
      ) : (
        <form className="card measure-form" id="measure-form" onSubmit={save}>
          <label>Datum<input type="date" value={date} required onChange={(e) => setDate(e.target.value)} /></label>
          <div className="measure-grid">
            {MEASURES.map((m) => (
              <label key={m.key} title={m.how}>
                {m.name} ({m.unit})
                <input inputMode="decimal" name={m.key} data-measure-input={m.key} placeholder={last[m.key] != null ? String(last[m.key]).replace('.', ',') : '–'}
                  value={vals[m.key] ?? ''} onChange={(e) => setVals({ ...vals, [m.key]: e.target.value })} />
              </label>
            ))}
          </div>
          <details className="small"><summary>So misst du richtig</summary><ul>{MEASURES.map((m) => <li key={m.key}><strong>{m.name}:</strong> {m.how}</li>)}</ul></details>
          <div className="row"><button type="submit" className="btn primary grow" id="measure-save">Speichern</button><button type="button" className="btn" onClick={() => setOpen(false)}>Abbrechen</button></div>
        </form>
      )}
      {rows.length > 0 && (
        <details className="table-toggle" id="measure-list">
          <summary>Alle Messungen ({rows.length})</summary>
          <ul className="list">
            {[...rows].reverse().map((r) => (
              <li className="list-row" key={r.id} data-measure-row={r.id}>
                <span>{fmtDate(r.date)}</span>
                <span className="small">{measureSummary(r) || '–'}</span>
                <button className="icon-btn" aria-label="Messung löschen" onClick={async () => {
                  if (!(await ask(`Messung vom ${fmtDate(r.date)} löschen?`, { title: 'Löschen?', ok: 'Löschen', danger: true }))) return;
                  try { await api.progress.deleteMeasure(r.id); dataChanged(); } catch (err) { showError(err); }
                }}>✕</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Fortschritts-Fotos
// ---------------------------------------------------------------------------------------------
function usePhotoUrls(ids: string[]) {
  const { api } = useApp();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = ids.join(',');
  useEffect(() => {
    let alive = true;
    if (!ids.length) { setUrls({}); return; }
    api.progress.photoUrls(ids).then((u) => alive && setUrls(u), () => {});
    return () => { alive = false; };
  }, [api, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return urls;
}

const monthOf = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

export function PhotosSection({ weights }: { weights: BodyWeight[] }) {
  const { api, user, showError, dataVersion, dataChanged } = useApp();
  const [retry, setRetry] = useState(0);
  const photos = useAsync(() => api.progress.listPhotos(), [api, dataVersion, retry]);
  const measures = useAsync(() => api.progress.listMeasures(), [api, dataVersion, retry]);
  const broken = photos.status === 'error';
  const list = photos.status === 'ok' ? photos.data : [];
  const urls = usePhotoUrls(list.map((p) => p.id));
  const fileRef = useRef<HTMLInputElement>(null), camRef = useRef<HTMLInputElement>(null);
  const [review, setReview] = useState<{ file: File; url: string; date: string; pose: Pose; skip: boolean }[] | null>(null);
  const [progress, setProgress] = useState('');
  const [pose, setPose] = useState<Pose>('front');
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ProgressPhoto | null>(null);
  const [cmp, setCmp] = useState<[string, string] | null>(null);
  const canShare = api.progress.canShare;
  /** Ausgewählte Fotos (Galerie: mehrere, mit Aufnahmedatum; Kamera: heute) erst prüfen lassen */
  const pick = async (files: FileList | null, fromCamera: boolean) => {
    const chosen = [...(files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)).slice(0, 20);
    if (fileRef.current) fileRef.current.value = '';
    if (camRef.current) camRef.current.value = '';
    if (!chosen.length) return;
    if ((files?.length ?? 0) > 20) void notify('Höchstens 20 Fotos auf einmal – die ersten 20 sind ausgewählt.');
    const items = await Promise.all(chosen.map(async (file) => ({ file, url: URL.createObjectURL(file), date: fromCamera ? todayISO() : await photoDate(file), pose, skip: false })));
    setReview(items);
  };
  const closeReview = () => { for (const r of review ?? []) URL.revokeObjectURL(r.url); setReview(null); setProgress(''); };
  const saveReview = async () => {
    const todo = (review ?? []).filter((r) => !r.skip);
    if (!todo.length) return closeReview();
    setBusy(true);
    const share = canShare && shared;
    let done = 0;
    try {
      for (const r of todo) {
        setProgress(`${done + 1} von ${todo.length} …`);
        const blob = await toMaxJpeg(r.file, 1024, 0.82);
        await api.progress.addPhoto(blob, r.date, r.pose, share);
        addGymLog(user?.id ?? 'local', r.date, `📷 Fortschritts-Foto (${poseName(r.pose)})${share ? ' – für Freunde' : ''}`);
        done++;
      }
      closeReview();
    } catch (err) {
      showError(err);
      // Gespeicherte aus der Liste nehmen, Rest bleibt zum erneuten Versuch
      setReview((cur) => cur && cur.filter((r) => !todo.slice(0, done).includes(r)));
      setProgress('');
    } finally {
      setBusy(false);
      dataChanged();
    }
  };
  const groups = useMemo(() => {
    const g = new Map<string, ProgressPhoto[]>();
    for (const p of [...list].reverse()) g.set(monthOf(p.date), [...(g.get(monthOf(p.date)) ?? []), p]);
    return [...g.entries()];
  }, [list]);
  const comparable = comparablePoses(list);
  const startCompare = () => {
    const pair = comparable.length ? defaultPair(list, comparable[0]) : null;
    if (pair) setCmp(pair);
  };
  return (
    <section id="photos">
      <h2>Fortschritts-Fotos</h2>
      {broken && <LoadProblem error={photos.error} onRetry={() => setRetry((x) => x + 1)} />}
      <div className="card photo-add">
        <div className="seg seg-small" role="group" aria-label="Pose">
          {POSES.map((p) => <button key={p.id} type="button" className={`seg-tab${pose === p.id ? ' active' : ''}`} aria-pressed={pose === p.id} data-pose={p.id} onClick={() => setPose(p.id)}>{p.name}</button>)}
        </div>
        {canShare ? (
          <div className="seg seg-small" role="group" aria-label="Wer sieht das Foto?">
            <button type="button" className={`seg-tab${!shared ? ' active' : ''}`} aria-pressed={!shared} id="photo-private" onClick={() => setShared(false)}>🔒 Nur ich</button>
            <button type="button" className={`seg-tab${shared ? ' active' : ''}`} aria-pressed={shared} id="photo-friends" onClick={() => setShared(true)}>👥 Freunde</button>
          </div>
        ) : <p className="muted small">🔒 Ohne Konto bleiben Fotos nur auf diesem Gerät.</p>}
        <input ref={fileRef} type="file" accept="image/*" multiple id="photo-file" hidden onChange={(e) => void pick(e.target.files, false)} />
        <input ref={camRef} type="file" accept="image/*" capture="user" id="photo-camera" hidden onChange={(e) => void pick(e.target.files, true)} />
        <div className="row photo-buttons">
          <button type="button" className="btn primary grow" id="photo-gallery" disabled={busy || broken} onClick={() => fileRef.current?.click()}>🖼️ Aus Galerie</button>
          <button type="button" className="btn grow" id="photo-add" disabled={busy || broken} onClick={() => camRef.current?.click()}>📷 Kamera</button>
        </div>
        <p className="muted small">Aus der Galerie kannst du mehrere Fotos auf einmal wählen – sie bekommen automatisch ihr Aufnahmedatum, das du vor dem Speichern prüfen kannst. Tipp: gleiches Licht, gleicher Ort, gleiche Pose.{canShare ? ' Bitte keine Nacktfotos – Freunde können Fotos melden.' : ''}</p>
      </div>
      {comparable.length > 0 && !cmp && <button type="button" className="btn block" id="photo-compare" onClick={startCompare}>↔️ Vorher / Nachher vergleichen</button>}
      {list.length > 0 && comparable.length === 0 && <p className="muted small" id="compare-hint">↔️ Für Vorher / Nachher brauchst du zwei Fotos mit <strong>derselben Pose</strong> an <strong>verschiedenen Tagen</strong> – z. B. heute „Vorne“ und in ein paar Wochen wieder „Vorne“.</p>}
      {cmp && <Compare photos={list} urls={urls} pair={cmp} onPair={setCmp} onClose={() => setCmp(null)} weights={weights} measures={measures.status === 'ok' ? measures.data : []} />}
      {list.length === 0 && <p className="muted small" id="photo-empty">Noch keine Fotos. Mach heute dein erstes – in ein paar Wochen wirst du froh sein!</p>}
      {groups.map(([month, ps]) => (
        <div key={month} className="photo-month">
          <h3 className="small">{month}</h3>
          <div className="photo-grid">
            {ps.map((p) => (
              <button key={p.id} type="button" className="photo-thumb" data-photo={p.id} onClick={() => setView(p)} aria-label={`Foto vom ${fmtDate(p.date)}, ${poseName(p.pose)}`}>
                {urls[p.id] ? <img src={urls[p.id]} alt="" loading="lazy" /> : <span className="photo-ph" />}
                <span className="photo-meta">{fmtShortDate(p.date)} · {poseName(p.pose)} {p.shared ? '👥' : '🔒'}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {review && (
        <div className="dialog-backdrop">
          <div className="dialog photo-review" id="photo-review" role="dialog" aria-modal="true" aria-label="Fotos hinzufügen">
            <h3>{review.length === 1 ? 'Foto hinzufügen' : `${review.length} Fotos hinzufügen`}</h3>
            <ul className="review-list">
              {review.map((r, i) => (
                <li key={r.url} className={r.skip ? 'skip' : ''} data-review={i}>
                  <img src={r.url} alt="" />
                  <div className="review-fields">
                    <label className="small">Datum<input type="date" value={r.date} max={todayISO()} data-review-date={i} onChange={(e) => e.target.value && setReview(review.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} /></label>
                    <select aria-label="Pose" data-review-pose={i} value={r.pose} onChange={(e) => setReview(review.map((x, j) => (j === i ? { ...x, pose: e.target.value as Pose } : x)))}>
                      {POSES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button type="button" className="icon-btn" data-review-skip={i} aria-label={r.skip ? 'Doch hinzufügen' : 'Weglassen'} onClick={() => setReview(review.map((x, j) => (j === i ? { ...x, skip: !x.skip } : x)))}>{r.skip ? '↩️' : '✕'}</button>
                </li>
              ))}
            </ul>
            {canShare && <p className="small">Sichtbar für: <strong>{shared ? '👥 Freunde' : '🔒 Nur dich'}</strong> <button type="button" className="link-btn" id="review-share" onClick={() => setShared(!shared)}>ändern</button></p>}
            {progress && <p className="small" id="review-progress">Wird gespeichert: {progress}</p>}
            <div className="row">
              <button type="button" className="btn primary grow" id="review-save" disabled={busy || review.every((r) => r.skip)} onClick={() => void saveReview()}>
                {busy ? 'Speichert …' : `${review.filter((r) => !r.skip).length} speichern`}
              </button>
              <button type="button" className="btn" id="review-cancel" disabled={busy} onClick={closeReview}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
      {view && (
        <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setView(null); }}>
          <div className="dialog photo-view" id="photo-view" role="dialog" aria-modal="true" aria-label="Foto">
            {urls[view.id] && <img src={urls[view.id]} alt={`Fortschritts-Foto vom ${fmtDate(view.date)}`} />}
            <p className="small"><strong>{fmtDate(view.date)}</strong> · {poseName(view.pose)} · {view.shared ? '👥 Freunde sehen es' : '🔒 Nur du'}</p>
            <div className="row">
              {canShare && <button type="button" className="btn small-btn grow" id="photo-toggle-share" onClick={async () => {
                try { await api.progress.setShared(view.id, !view.shared); setView({ ...view, shared: !view.shared }); dataChanged(); } catch (err) { showError(err); }
              }}>{view.shared ? '🔒 Nur noch für mich' : '👥 Mit Freunden teilen'}</button>}
              <button type="button" className="btn small-btn danger" id="photo-delete" onClick={async () => {
                if (!(await ask('Dieses Foto endgültig löschen?', { title: 'Foto löschen?', ok: 'Löschen', danger: true }))) return;
                try { await api.progress.deletePhoto(view.id); setView(null); setCmp(null); dataChanged(); } catch (err) { showError(err); }
              }}>Löschen</button>
            </div>
            <button type="button" className="btn block" id="photo-close" onClick={() => setView(null)}>Schließen</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Vorher/Nachher: zwei Fotos übereinander, Schieberegler blendet über; darunter Änderungen von Gewicht und Maßen */
function Compare({ photos, urls, pair, onPair, onClose, weights, measures }: {
  photos: ProgressPhoto[]; urls: Record<string, string>; pair: [string, string]; onPair: (p: [string, string]) => void; onClose: () => void;
  weights: BodyWeight[]; measures: Measure[];
}) {
  const [pos, setPos] = useState(50);
  const a = photos.find((p) => p.id === pair[0]), b = photos.find((p) => p.id === pair[1]);
  if (!a || !b) return null;
  // nur gleiche Pose, „Nachher“ mindestens einen Tag nach „Vorher“
  const [before, after] = a.date <= b.date ? [a, b] : [b, a];
  const poses = comparablePoses(photos);
  const same = photos.filter((p) => p.pose === before.pose).sort((x, y) => x.date.localeCompare(y.date));
  const lastDate = same[same.length - 1].date;
  const beforeOpts = same.filter((p) => p.date < lastDate);
  const afterOpts = same.filter((p) => p.date > before.date);
  const near = <T extends { date: string }>(rows: T[], d: string) => [...rows].filter((r) => r.date <= d).sort((x, y) => y.date.localeCompare(x.date))[0] ?? [...rows].sort((x, y) => x.date.localeCompare(y.date))[0];
  const w0 = near(weights, before.date), w1 = near(weights, after.date);
  const diffs: string[] = [];
  if (w0 && w1 && w0.date !== w1.date) diffs.push(`Gewicht ${signed(Math.round((Number(w1.weight_kg) - Number(w0.weight_kg)) * 10) / 10, 'kg')}`);
  const m0 = near(measures, before.date), m1 = near(measures, after.date);
  if (m0 && m1 && m0.id !== m1.id) for (const d of MEASURES) {
    const x = m0[d.key], y = m1[d.key];
    if (typeof x === 'number' && typeof y === 'number' && x !== y) diffs.push(`${d.name} ${signed(Math.round((y - x) * 10) / 10, d.unit)}`);
  }
  const days = Math.round((Date.parse(after.date) - Date.parse(before.date)) / 864e5);
  const pick = (i: 0 | 1, id: string) => {
    if (i === 1) return onPair([before.id, id]);
    const nb = photos.find((p) => p.id === id)!;
    // „Nachher“ muss später sein – sonst das neueste Foto der Pose nehmen
    onPair([id, after.date > nb.date ? after.id : same[same.length - 1].id]);
  };
  return (
    <div className="card photo-compare" id="photo-compare-view">
      <div className="block-head"><h3>Vorher / Nachher</h3><button type="button" className="icon-btn" aria-label="Vergleich schließen" onClick={onClose}>✕</button></div>
      {poses.length > 1 && (
        <div className="seg seg-small" role="group" aria-label="Pose vergleichen">
          {poses.map((p) => <button key={p} type="button" className={`seg-tab${before.pose === p ? ' active' : ''}`} aria-pressed={before.pose === p} data-compare-pose={p} onClick={() => { const d = defaultPair(photos, p); if (d) onPair(d); }}>{poseName(p)}</button>)}
        </div>
      )}
      <p className="muted small">Pose: <strong>{poseName(before.pose)}</strong> – verglichen werden nur Fotos mit derselben Pose von verschiedenen Tagen.</p>
      <div className="row pair">
        {([0, 1] as const).map((i) => (
          <label key={i} className="grow small">{i ? 'Nachher' : 'Vorher'}
            <select data-compare={i} value={i ? after.id : before.id} onChange={(e) => pick(i, e.target.value)}>
              {(i ? afterOpts : beforeOpts).map((p) => <option key={p.id} value={p.id}>{fmtDate(p.date)}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="compare-stage">
        {urls[after.id] && <img src={urls[after.id]} alt="Nachher" />}
        {urls[before.id] && <img src={urls[before.id]} alt="Vorher" className="compare-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
        <span className="compare-line" style={{ left: `${pos}%` }} aria-hidden="true" />
        <span className="compare-tag l">Vorher · {fmtShortDate(before.date)}</span><span className="compare-tag r">Nachher · {fmtShortDate(after.date)}</span>
      </div>
      <input type="range" min={0} max={100} value={pos} id="compare-slider" aria-label="Überblenden" onChange={(e) => setPos(Number(e.target.value))} />
      <p className="small" id="compare-diff"><strong>{days} {days === 1 ? 'Tag' : 'Tage'} dazwischen</strong>{diffs.length ? ` · ${diffs.join(' · ')}` : ''}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Freundesprofil: geteilte Fotos, mit Melden
// ---------------------------------------------------------------------------------------------
export function FriendPhotos({ userId, name }: { userId: string; name: string }) {
  const { api, showError } = useApp();
  const [list, setList] = useState<FriendPhoto[] | null>(null);
  const [view, setView] = useState<FriendPhoto | null>(null);
  useEffect(() => {
    let alive = true;
    api.progress.friendPhotos?.(userId).then((l) => alive && setList(l), () => alive && setList([]));
    return () => { alive = false; };
  }, [api, userId]);
  if (!list || !list.length) return null;
  return (
    <div className="card" id="friend-photos">
      <h3>Fortschritts-Fotos von {name}</h3>
      <div className="photo-grid">
        {[...list].reverse().map((p) => (
          <button key={p.id} type="button" className="photo-thumb" data-photo={p.id} onClick={() => setView(p)}>
            <img src={p.url} alt="" loading="lazy" /><span className="photo-meta">{fmtShortDate(p.date)} · {poseName(p.pose)}</span>
          </button>
        ))}
      </div>
      {view && (
        <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setView(null); }}>
          <div className="dialog photo-view" role="dialog" aria-modal="true" aria-label="Foto">
            <img src={view.url} alt={`Fortschritts-Foto von ${name}`} />
            <p className="small"><strong>{fmtDate(view.date)}</strong> · {poseName(view.pose)}</p>
            <div className="row">
              <button type="button" className="btn small-btn danger" id="photo-report" onClick={async () => {
                const reason = await askText('Was ist an dem Foto nicht in Ordnung? Es wird dir danach nicht mehr angezeigt.', { title: 'Foto melden', ok: 'Melden', placeholder: 'z. B. unpassend' });
                if (reason === null) return;
                try { await api.progress.reportPhoto?.(view.id, reason); setList(list.filter((x) => x.id !== view.id)); setView(null); void notify('Danke – das Foto wurde gemeldet.'); } catch (err) { showError(err); }
              }}>Melden</button>
              <button type="button" className="btn small-btn grow" onClick={() => setView(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Startseite: Einladung zum ersten Fortschritts-Foto
// ---------------------------------------------------------------------------------------------
const PHOTO_INVITE_KEY = 'gym-tracker-photo-invite-hidden';
export function PhotoInvite() {
  const { api, dataVersion } = useApp();
  const photos = useAsync(() => api.progress.listPhotos(), [api, dataVersion]);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(PHOTO_INVITE_KEY) === '1'; } catch { return false; } });
  if (hidden || photos.status === 'loading' || (photos.status === 'ok' && photos.data.length > 0)) return null;
  return (
    <div className="card supp-invite" id="photo-invite">
      <a href="#/fotos"><strong>📷 Fortschritts-Fotos</strong><span className="muted small">Fotos aus deiner Galerie oder mit der Kamera – und Vorher/Nachher vergleichen.</span><span className="btn small-btn primary">Los geht's</span></a>
      <button type="button" className="icon-btn" aria-label="Ausblenden" id="photo-invite-close" onClick={() => { try { localStorage.setItem(PHOTO_INVITE_KEY, '1'); } catch { /* nur Komfort */ } setHidden(true); }}>✕</button>
    </div>
  );
}
