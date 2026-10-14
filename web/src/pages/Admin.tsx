// Admin-Menü (nur für den Besitzer; der Server prüft jede Aktion selbst):
// alle Farben frei wählen, eigene Farbschemata entwerfen und im Shop anbieten, Meldungen bearbeiten.
// Der Besitzer kann weitere Admins hinzufügen und entfernen – die haben alles aus Pro, aber kein Admin-Menü.
import { SCHEMA_VERSION, SUPABASE_REF, supabaseDashboardUrl } from '../data/config';
import { WEB_URL } from '../lib/platform';
import { ask } from '../components/Dialog';
import { useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { DishImage } from '../components/DishImage';
import type { AdminEntry, AdminReport } from '../data/social';
import { useCosmetics } from '../lib/cosmetics';
import { DISHES, searchDishes, type Dish } from '../lib/dishes';
import { setDishPhotoLocal, useDishPhotos } from '../lib/dishPhotos';
import { fmt } from '../lib/format';
import { toMaxJpeg } from '../lib/image';
import { paywallPreview, setPaywallPreview, usePro } from '../lib/pro';
import { setServerCatalog, useShopItems } from '../lib/shop';
import {
  ACCENT_PRESETS,
  SCHEMES,
  contrast,
  deriveVars,
  getAccent,
  getScheme,
  registerCustomSchemes,
  setAccent,
  setPreviewScheme,
  setScheme,
  type CustomPalette,
  type PaletteMode,
  type SchemeChoice,
} from '../lib/theme';

const START: CustomPalette = {
  light: { bg: '#f4f6fb', surface: '#ffffff', text: '#0a1020', accent: '#7c3aed' },
  dark: { bg: '#0b0716', surface: '#161028', text: '#f4f0ff', accent: '#a78bfa' },
  neon: '#a78bfa',
};
const DRAFT_ID = 'scheme_c_entwurf';
const FIELDS: [keyof PaletteMode, string][] = [
  ['bg', 'Hintergrund'],
  ['surface', 'Karten'],
  ['text', 'Schrift'],
  ['accent', 'Akzent'],
];

/** „Kirsch Traum!“ → scheme_c_kirsch_traum */
export function schemeIdFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return `scheme_c_${slug || 'schema'}`;
}

function MiniApp({ mode, dark }: { mode: PaletteMode; dark: boolean }) {
  const v = deriveVars(mode, dark);
  return (
    <div className="designer-preview" style={{ background: v['--bg'], color: v['--text'] }}>
      <div className="designer-card" style={{ background: v['--surface'], borderColor: v['--border'] }}>
        <strong>{dark ? 'Dunkel' : 'Hell'}</strong>
        <span style={{ color: v['--text-secondary'] }}>3 Trainings diese Woche</span>
        <span className="designer-bar" style={{ background: v['--grid'] }}>
          <i style={{ background: v['--accent'], width: '64%' }} />
        </span>
      </div>
      <span className="designer-btn" style={{ background: v['--accent'], color: v['--accent-text'] }}>Workout starten</span>
    </div>
  );
}

function Designer() {
  const { api, showError } = useApp();
  const items = useShopItems();
  const custom = items.filter((i) => i.custom);
  const [palette, setPalette] = useState<CustomPalette>(START);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('400');
  const [editId, setEditId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const social = api.social!;

  const setColor = (m: 'light' | 'dark', k: keyof PaletteMode, v: string) => setPalette((p) => ({ ...p, [m]: { ...p[m], [k]: v } }));
  const warnings = (['light', 'dark'] as const).flatMap((m) => {
    const p = palette[m];
    const out: string[] = [];
    if (contrast(p.text, p.surface) < 4.5) out.push(`${m === 'light' ? 'Hell' : 'Dunkel'}: Schrift auf Karten schwer lesbar`);
    if (contrast(p.text, p.bg) < 4.5) out.push(`${m === 'light' ? 'Hell' : 'Dunkel'}: Schrift auf Hintergrund schwer lesbar`);
    return out;
  });

  const preview = () => {
    registerCustomSchemes([{ id: DRAFT_ID, name: name.trim() || 'Entwurf', palette }]);
    setPreviewScheme(`custom:${DRAFT_ID}`);
  };
  const reloadCatalog = async () => setServerCatalog(await social.catalog());
  const save = async (useNow: boolean) => {
    const n = name.trim();
    if (!n) return showError(new Error('Bitte gib dem Farbschema einen Namen.'));
    const id = editId ?? schemeIdFromName(n);
    if (!editId && custom.some((c) => c.id === id) && !(await ask(`Es gibt schon „${id}“.`, { title: 'Überschreiben?', ok: 'Überschreiben' }))) return;
    try {
      await social.adminSaveScheme(id, n, Math.max(0, Math.round(Number(price) || 0)), palette);
      await reloadCatalog();
      setPreviewScheme(null);
      if (useNow) setScheme(`custom:${id}`);
      setEditId(id);
      setNote(`„${n}“ ist im Shop für ${fmt(Number(price) || 0, 0)} Credits.`);
    } catch (err) {
      showError(err);
    }
  };
  const edit = (id: string) => {
    const it = custom.find((c) => c.id === id);
    if (!it?.custom) return;
    setPalette(it.custom);
    setName(it.name);
    setPrice(String(it.price));
    setEditId(id);
    setNote('');
  };
  const hide = async (id: string, label: string) => {
    if (!(await ask('Wer es gekauft hat, behält es.', { title: `„${label}“ aus dem Shop nehmen?`, ok: 'Entfernen', danger: true }))) return;
    try {
      await social.adminHideScheme(id);
      await reloadCatalog();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div className="card" id="designer">
      <h3>Farbschema-Designer</h3>
      <p className="muted small">Wähle je 4 Farben für Hell und Dunkel. Rahmen, Raster und Zweitschrift werden automatisch abgeleitet, der Akzent wird bei Bedarf lesbar gemacht.</p>
      <div className="row pair">
        <label>
          Name
          <input id="designer-name" maxLength={30} value={name} placeholder="z. B. Kirsch Traum" onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Preis (Credits)
          <input id="designer-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
        </label>
      </div>
      <div className="designer-grid">
        {(['light', 'dark'] as const).map((m) => (
          <div key={m}>
            <h4>{m === 'light' ? 'Hell' : 'Dunkel'}</h4>
            {FIELDS.map(([k, label]) => (
              <label key={k} className="color-row">
                <input type="color" data-color={`${m}-${k}`} value={palette[m][k]} onChange={(e) => setColor(m, k, e.target.value)} />
                <span>{label}</span>
              </label>
            ))}
            <MiniApp mode={palette[m]} dark={m === 'dark'} />
          </div>
        ))}
      </div>
      <label className="color-row">
        <input type="color" data-color="neon" value={palette.neon} onChange={(e) => setPalette((p) => ({ ...p, neon: e.target.value }))} />
        <span>Neon (Körpergraph &amp; Avatar)</span>
      </label>
      {warnings.length > 0 && (
        <ul className="notice small designer-warnings">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <div className="row">
        <button className="btn grow" id="designer-preview" onClick={preview}>👁 In der App ansehen</button>
      </div>
      <div className="row">
        <button className="btn primary grow" id="designer-save" onClick={() => save(false)}>{editId ? 'Änderungen speichern' : 'Im Shop anbieten'}</button>
        <button className="btn grow" id="designer-use" onClick={() => save(true)}>Speichern &amp; selbst nutzen</button>
      </div>
      {editId && (
        <p className="small">
          Bearbeitest: <code>{editId}</code>{' '}
          <button className="link" onClick={() => { setEditId(null); setName(''); setPalette(START); setNote(''); }}>Neues Schema</button>
        </p>
      )}
      {note && <p className="notice small" id="designer-note">{note}</p>}
      <h4>Deine Schemata im Shop</h4>
      {custom.length ? (
        <ul className="admin-list">
          {custom.map((c) => (
            <li key={c.id} data-custom={c.id}>
              <span className="swatch-dot" style={{ background: c.custom!.dark.accent }} />
              <span className="grow">{c.name} · {fmt(c.price, 0)} Credits</span>
              <button className="btn small-btn" onClick={() => edit(c.id)}>Bearbeiten</button>
              <button className="btn small-btn" onClick={() => hide(c.id, c.name)}>Entfernen</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Noch keine eigenen Farbschemata.</p>
      )}
    </div>
  );
}

function MyColors() {
  const items = useShopItems();
  const [scheme, setSchemeState] = useState(getScheme());
  const [accent, setAccentState] = useState(getAccent());
  const all: [SchemeChoice, string][] = [
    ...SCHEMES.map(([id, label]): [SchemeChoice, string] => [id, label.replace(' (Shop)', '')]),
    ...items.filter((i) => i.custom).map((i): [SchemeChoice, string] => [`custom:${i.id}`, `${i.name} (eigenes)`]),
  ];
  const changeAccent = (color: string | null) => {
    setAccent(color);
    setAccentState(color);
  };
  const isPreset = ACCENT_PRESETS.some(([c]) => c === accent);
  return (
    <div className="card" id="admin-colors">
      <h3>Deine Farben (nur für dich)</h3>
      <label>
        Farbschema – alle frei
        <select id="admin-scheme" value={scheme} onChange={(e) => { setScheme(e.target.value as SchemeChoice); setSchemeState(e.target.value as SchemeChoice); }}>
          {all.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <div className="accent-picker">
        <span className="label-text">Akzentfarbe (Knöpfe, Links, Diagramme)</span>
        <div className="swatches-row" role="radiogroup" aria-label="Akzentfarbe">
          <button type="button" role="radio" aria-checked={!accent} className={`swatch scheme-default${!accent ? ' on' : ''}`} onClick={() => changeAccent(null)} title="Wie Farbschema">
            <span>Auto</span>
          </button>
          {ACCENT_PRESETS.map(([color, label]) => (
            <button key={color} type="button" role="radio" aria-checked={accent === color} aria-label={label} title={label} className={`swatch${accent === color ? ' on' : ''}`} style={{ background: color }} data-accent={color} onClick={() => changeAccent(color)} />
          ))}
          <label className={`swatch custom${accent && !isPreset ? ' on' : ''}`} title="Eigene Farbe" style={accent && !isPreset ? { background: accent } : undefined}>
            <span aria-hidden="true">＋</span>
            <input type="color" id="accent-custom" aria-label="Eigene Farbe wählen" value={accent ?? '#4f8cff'} onChange={(e) => changeAccent(e.target.value)} />
          </label>
        </div>
        <p className="muted small">Wird für Hell und Dunkel automatisch lesbar gemacht. Andere Nutzer sehen das nicht.</p>
      </div>
    </div>
  );
}

function Reports() {
  const { api, showError } = useApp();
  const [version, setVersion] = useState(0);
  const list = useAsync(() => api.social!.adminReports(), [api, version]);
  const resolve = async (r: AdminReport, deleteComment: boolean) => {
    if (deleteComment && !(await ask('Der Kommentar wird gelöscht und die Meldung geschlossen.', { title: 'Kommentar löschen?', ok: 'Löschen', danger: true }))) return;
    try {
      await api.social!.adminResolveReport(r.id, deleteComment);
      setVersion((v) => v + 1);
    } catch (err) {
      showError(err);
    }
  };
  return (
    <div className="card" id="admin-reports">
      <h3>Meldungen</h3>
      {list.status === 'loading' ? (
        <Loading />
      ) : list.status === 'error' ? (
        <LoadError error={list.error} />
      ) : !list.data.length ? (
        <p className="muted small">Keine offenen Meldungen. 👍</p>
      ) : (
        <ul className="admin-list reports">
          {list.data.map((r) => (
            <li key={r.id} data-report={r.id}>
              <div className="grow">
                <strong>{r.reported_name}</strong> gemeldet von {r.reporter_name}
                <span className="muted small"> · {new Date(r.created_at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <p className="small">Grund: {r.reason}</p>
                {r.comment_body && <blockquote className="small">„{r.comment_body}“</blockquote>}
              </div>
              <div className="report-actions">
                {r.comment_body && <button className="btn small-btn danger" onClick={() => resolve(r, true)}>Kommentar löschen</button>}
                <button className="btn small-btn" onClick={() => resolve(r, false)}>Erledigt</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Admins() {
  const { api, showError } = useApp();
  const [version, setVersion] = useState(0);
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const list = useAsync(() => api.social!.adminList(), [api, version]);
  const nameOf = (a: AdminEntry) => a.display_name || a.email || 'Unbekannt';
  const add = async () => {
    const value = who.trim();
    if (!value) return;
    setBusy(true);
    setNote('');
    try {
      await api.social!.adminAdd(value);
      setWho('');
      setNote(`${value} ist jetzt Admin.`);
      setVersion((v) => v + 1);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (a: AdminEntry) => {
    if (!(await ask(`${nameOf(a)} verliert die Admin-Rechte (Pro und Essen+ über den Admin-Zugang).`, { title: 'Admin entfernen?', ok: 'Entfernen', danger: true }))) return;
    try {
      await api.social!.adminRemove(a.user_id);
      setNote('');
      setVersion((v) => v + 1);
    } catch (err) {
      showError(err);
    }
  };
  return (
    <div className="card" id="admin-admins">
      <h3>Admins verwalten</h3>
      <p className="muted small">Admins haben alles aus Pro und Essen+, sehen aber kein Admin-Menü. Nur du kannst Admins hinzufügen oder entfernen.</p>
      {list.status === 'loading' ? (
        <Loading />
      ) : list.status === 'error' ? (
        <LoadError error={list.error} />
      ) : (
        <ul className="admin-list admins">
          {list.data.map((a) => (
            <li key={a.user_id} data-admin={a.email ?? a.user_id}>
              <div className="grow">
                <strong>{nameOf(a)}</strong>{a.is_owner && <span className="owner-tag">Besitzer</span>}
                <span className="muted small"> · {a.email ?? ''} · seit {new Date(a.since).toLocaleDateString('de-DE')}</span>
              </div>
              {!a.is_owner && <button type="button" className="btn small-btn danger" data-remove-admin={a.email ?? a.user_id} onClick={() => remove(a)}>Entfernen</button>}
            </li>
          ))}
        </ul>
      )}
      <form className="admin-add-row" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input id="admin-add-who" type="text" autoCapitalize="none" autoCorrect="off" placeholder="E-Mail oder Freundescode" value={who} onChange={(e) => setWho(e.target.value)} />
        <button type="submit" className="btn primary" id="admin-add" disabled={busy || !who.trim()}>Als Admin hinzufügen</button>
      </form>
      {note && <p className="small" id="admin-add-note">{note}</p>}
      <p className="muted small">Die Person braucht schon ein Konto. Den Freundescode findet sie unter Freunde.</p>
    </div>
  );
}

/** Echte Fotos für Gerichte hochladen (nur Besitzer). Ohne Foto zeigt die App den gezeichneten Teller. */
function DishPhotos() {
  const { api, showError } = useApp();
  const photos = useDishPhotos(api.social);
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [busy, setBusy] = useState('');
  const list = (q.trim() ? searchDishes(q, 'alle', 40) : DISHES).filter((d) => !onlyMissing || !photos[d.id]).slice(0, 12);
  const upload = async (d: Dish, file: File | undefined) => {
    if (!file) return;
    setBusy(d.id);
    try {
      const jpg = await toMaxJpeg(file, 1024, 0.82);
      await api.social!.uploadDishPhoto(d.id, jpg);
      setDishPhotoLocal(d.id, URL.createObjectURL(jpg));
    } catch (err) {
      showError(err);
    } finally {
      setBusy('');
    }
  };
  const remove = async (d: Dish) => {
    if (!(await ask(`Das Foto von „${d.name}“ wird gelöscht. Danach sieht man wieder den gezeichneten Teller.`, { title: 'Foto entfernen?', ok: 'Entfernen', danger: true }))) return;
    setBusy(d.id);
    try {
      await api.social!.removeDishPhoto(d.id);
      setDishPhotoLocal(d.id, null);
    } catch (err) {
      showError(err);
    } finally {
      setBusy('');
    }
  };
  const count = DISHES.filter((d) => photos[d.id]).length;
  return (
    <div className="card" id="admin-dish-photos">
      <h3>Fotos für Gerichte</h3>
      <p className="muted small">Lade zu einem Gericht ein eigenes Foto hoch – alle Nutzer sehen es dann statt des gezeichneten Tellers. Nimm nur Fotos, die du selbst gemacht hast oder frei verwenden darfst. <span id="dish-photo-count">{count} von {DISHES.length} Gerichten haben ein Foto.</span></p>
      <input id="dish-photo-q" type="search" placeholder="Gericht suchen" value={q} onChange={(e) => setQ(e.target.value)} />
      <label className="check-row"><input type="checkbox" id="dish-photo-missing" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /><span>Nur Gerichte ohne Foto</span></label>
      <ul className="admin-list dish-photo-list">
        {list.map((d) => (
          <li key={d.id} data-dish-photo={d.id}>
            <DishImage dish={d} />
            <div className="grow"><strong>{d.name}</strong>{photos[d.id] && <span className="muted small"> · Foto</span>}</div>
            <label className={`btn small-btn${busy ? ' disabled' : ''}`}>
              {busy === d.id ? '…' : photos[d.id] ? 'Ersetzen' : 'Foto'}
              <input type="file" accept="image/*" hidden disabled={Boolean(busy)} onChange={(e) => { void upload(d, e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {photos[d.id] && <button type="button" className="btn small-btn danger" disabled={Boolean(busy)} onClick={() => remove(d)}>✕</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Datenbank: Stand prüfen und Update mit zwei Knöpfen (SQL kopieren, Supabase öffnen) */
function Database() {
  const { api } = useApp();
  const [check, setCheck] = useState(0);
  const v = useAsync(() => api.social!.schemaVersion().catch(() => 0), [api, check]);
  const have = v.status === 'ok' ? Number(v.data) || 0 : null;
  const ok = have !== null && have >= SCHEMA_VERSION;
  return (
    <div className="card" id="admin-db">
      <h3>Datenbank (Supabase)</h3>
      {have === null ? <p className="muted">Wird geprüft …</p> : (
        <p id="admin-db-state" className={ok ? 'db-ok' : 'db-old'}>
          {ok ? '✓ Aktuell' : '⚠️ Update nötig'} · in Supabase: {have || 'alt'} · App braucht: {SCHEMA_VERSION}
        </p>
      )}
      <ol className="small">
        <li>„SQL kopieren“ antippen → auf der Seite <strong>SQL kopieren</strong>.</li>
        <li>„Supabase öffnen“ → SQL Editor: alles einfügen → <strong>Run</strong> → bei der Warnung <strong>Run query</strong>.</li>
        <li>Zurück hierher und „Erneut prüfen“.</li>
      </ol>
      <div className="nc-row">
        <a className="btn primary" id="admin-db-sql" href={`${WEB_URL}supabase/einrichten.html`} target="_blank" rel="noopener">1. SQL kopieren</a>
        <a className="btn" id="admin-db-open" href={supabaseDashboardUrl('sql/new')} target="_blank" rel="noopener">2. Supabase öffnen</a>
      </div>
      <button type="button" className="btn small-btn" id="admin-db-check" onClick={() => setCheck((c) => c + 1)}>Erneut prüfen</button>
      <p className="muted small">Supabase-Projekt: {SUPABASE_REF} · Anmelden auf supabase.com mit dem Konto, mit dem du das Projekt angelegt hast.</p>
    </div>
  );
}

function PaywallTest() {
  const [on, setOn] = useState(paywallPreview());
  return (
    <div className="card" id="admin-paywall">
      <h3>Bezahlseite testen</h3>
      <label className="check-row">
        <input type="checkbox" id="paywall-preview" checked={on} onChange={(e) => { setOn(e.target.checked); setPaywallPreview(e.target.checked); }} />
        <span>Auf diesem Gerät so tun, als hätte ich kein Pro (Plan und Kalorien gesperrt)</span>
      </label>
      <p className="muted small">Ändert nichts an deinem Konto. Anderen Konten gibst du Pro zum Testen im SQL Editor mit <code>admin_grant_pro</code>.</p>
    </div>
  );
}

export function Admin() {
  const { api } = useApp();
  const { admin } = useCosmetics();
  const { owner } = usePro();
  if (!api.social || !admin)
    return (
      <>
        <h2>Admin-Menü</h2>
        <div className="card"><p className="muted">Nur für Admins.</p></div>
      </>
    );
  return (
    <>
      <h2>🛠 Admin-Menü</h2>
      {owner && <Admins />}
      {owner && <Database />}
      {owner && <DishPhotos />}
      <MyColors />
      <PaywallTest />
      <Designer />
      <Reports />
    </>
  );
}
