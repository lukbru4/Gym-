// Admin-Menü (nur für den Admin; der Server prüft jede Aktion selbst):
// alle Farben frei wählen, eigene Farbschemata entwerfen und im Shop anbieten, Meldungen bearbeiten.
import { ask } from '../components/Dialog';
import { useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import type { AdminReport } from '../data/social';
import { useCosmetics } from '../lib/cosmetics';
import { fmt } from '../lib/format';
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

export function Admin() {
  const { api } = useApp();
  const { admin } = useCosmetics();
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
      <MyColors />
      <Designer />
      <Reports />
    </>
  );
}
