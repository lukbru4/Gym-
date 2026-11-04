// Einstellungen im Konto sichern: Werte, die sonst nur im Speicher des Geräts liegen (Supplements, Erinnerungen,
// Trainingsplan, Ziele, Farben, Ernährung …), werden automatisch ins Konto geschrieben und nach Neuinstallation
// oder auf einem neuen Gerät wiederhergestellt. Pro Schlüssel gewinnt der neuere Stand (Zeitstempel).

/** Feste Schlüssel (gleich für alle Konten auf dem Gerät) */
const FIXED = [
  'gym-tracker-reminders', 'gym-tracker-quiz', 'gym-tracker-week-goal', 'gym-tracker-settings', 'gym-tracker-strength-goal',
  'gym-tracker-goal-weight', 'gym-tracker-custom-goals', 'gym-tracker-theme', 'gym-tracker-scheme', 'gym-tracker-accent',
  'gym-tracker-custom-scheme', 'gym-tracker-dark-hours', 'gym-tracker-dish-favorites', 'gym-tracker-water-step', 'gym-tracker-plates',
  'gym-tracker-checklist-hidden', 'gym-tracker-supps-invite-hidden', 'gym-tracker-photo-invite-hidden', 'gym-tracker-stats-period',
  'gym-tracker-recap-period', 'gym-tracker-progress-exercise', 'gym-tracker-board-exercise',
];
/** Kontobezogene Schlüssel: {uid} wird beim Sichern zum Platzhalter, beim Wiederherstellen zur eigenen ID */
const PER_USER = [
  'gym-tracker-supps:{uid}', 'gym-tracker-supps-taken:{uid}', 'gym-tracker-feedback-{uid}', 'gym-tracker-recovery-{uid}',
  'gym-tracker-nutrition-plan-{uid}', 'gym-tracker-gymlog:{uid}', 'gym-tracker-plan-offered:{uid}', 'gym-tracker-welcome:{uid}',
];
/** Tageswerte (Wasser): nur die letzten 60 Tage */
const WATER = /^gym-tracker-water-(.+)-(\d{4}-\d{2}-\d{2})$/;
export const META_KEY = 'gym-tracker-sync-meta';
export const MAX_KEYS = 200;
export const MAX_BYTES = 200_000;

/** Gerätschlüssel → Kontoschlüssel (mit {uid}); null = wird nicht gesichert */
export function cloudKey(key: string, uid: string, today: string): string | null {
  if (FIXED.includes(key)) return key;
  for (const p of PER_USER) if (p.replace('{uid}', uid) === key) return p;
  const w = key.match(WATER);
  if (w && w[1] === uid) {
    const age = (Date.parse(today) - Date.parse(w[2])) / 864e5;
    return age <= 60 && age >= -1 ? `gym-tracker-water-{uid}-${w[2]}` : null;
  }
  return null;
}
export const deviceKey = (ck: string, uid: string) => ck.replace('{uid}', uid);

export interface Entry { v: string | null; t: number }
export type Snapshot = Record<string, Entry>;

/**
 * Zusammenführen: pro Schlüssel der neuere Stand.
 * Liefert, was aufs Gerät geschrieben werden muss (toDevice), und den gemeinsamen Stand fürs Konto (merged).
 */
export function mergeSnapshots(device: Snapshot, cloud: Snapshot): { merged: Snapshot; toDevice: Snapshot; changedCloud: boolean } {
  const merged: Snapshot = {}, toDevice: Snapshot = {};
  let changedCloud = false;
  for (const k of new Set([...Object.keys(device), ...Object.keys(cloud)])) {
    const d = device[k], c = cloud[k];
    // Gleichstand (z. B. beide ohne Zeitstempel): Konto gewinnt, damit ein frisches Gerät nichts überschreibt
    if (c && (!d || c.t >= d.t)) {
      merged[k] = c;
      if (!d || d.v !== c.v) toDevice[k] = c;
    } else if (d) {
      merged[k] = d;
      if (!c || c.t !== d.t || c.v !== d.v) changedCloud = true;
    }
  }
  return { merged, toDevice, changedCloud };
}

/** Nicht zu groß: älteste Tageswerte zuerst weglassen */
export function trimSnapshot(s: Snapshot): Snapshot {
  let keys = Object.keys(s);
  const size = (ks: string[]) => JSON.stringify(Object.fromEntries(ks.map((k) => [k, s[k]]))).length;
  if (keys.length <= MAX_KEYS && size(keys) <= MAX_BYTES) return s;
  keys = keys.sort((a, b) => (a.startsWith('gym-tracker-water-') === b.startsWith('gym-tracker-water-') ? (s[b].t - s[a].t) : a.startsWith('gym-tracker-water-') ? 1 : -1));
  while (keys.length && (keys.length > MAX_KEYS || size(keys) > MAX_BYTES)) keys.pop();
  return Object.fromEntries(keys.map((k) => [k, s[k]]));
}

/** Prüft, ob ein Wert aus dem Konto plausibel ist */
export function cleanSnapshot(raw: unknown): Snapshot {
  const out: Snapshot = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, e] of Object.entries(raw as Record<string, unknown>)) {
    if (!k.startsWith('gym-tracker-') || !e || typeof e !== 'object') continue;
    const { v, t } = e as Record<string, unknown>;
    if ((typeof v === 'string' || v === null) && typeof t === 'number' && Number.isFinite(t)) out[k] = { v: typeof v === 'string' ? v.slice(0, 50_000) : null, t };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Laufzeit: Änderungen am Gerät erkennen, ins Konto schieben, beim Start wiederherstellen
// ---------------------------------------------------------------------------------------------
export interface SettingsApi { mySettings(): Promise<unknown>; setMySettings(s: Snapshot): Promise<void> }
let api: SettingsApi | null = null, uid = '', timer = 0, pushing = false, wrapped = false;
let lastSync: number | null = null;
const listeners = new Set<() => void>();
export const lastSyncedAt = () => lastSync;
export const onSyncChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const todayStr = () => new Date().toISOString().slice(0, 10);

function readMeta(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? '{}') ?? {}; } catch { return {}; }
}
function writeMeta(m: Record<string, number>) {
  try { (origSet ?? Storage.prototype.setItem).call(localStorage, META_KEY, JSON.stringify(m)); } catch { /* voll */ }
}
let origSet: ((k: string, v: string) => void) | null = null;
let origRemove: ((k: string) => void) | null = null;

/** Gerätestand der gesicherten Schlüssel */
export function deviceSnapshot(id = uid): Snapshot {
  const meta = readMeta(), out: Snapshot = {}, today = todayStr();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    const ck = cloudKey(k, id, today);
    if (ck) out[ck] = { v: localStorage.getItem(k), t: meta[ck] ?? 1 };
  }
  // gelöschte Schlüssel (z. B. Einladung wieder eingeblendet) als null merken
  for (const [ck, t] of Object.entries(meta)) if (!(ck in out) && ck.startsWith('gym-tracker-')) out[ck] = { v: null, t };
  return out;
}

function schedule() {
  if (!api) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void pushNow(), 3000);
}
/** localStorage einmalig umhüllen: Änderungen an gesicherten Schlüsseln bekommen einen Zeitstempel */
function wrapStorage() {
  if (wrapped || typeof localStorage === 'undefined') return;
  wrapped = true;
  const proto = Object.getPrototypeOf(localStorage) as Storage;
  origSet = proto.setItem;
  origRemove = proto.removeItem;
  const mark = (k: string) => {
    if (!uid) return;
    const ck = cloudKey(k, uid, todayStr());
    if (!ck) return;
    const m = readMeta();
    m[ck] = Date.now();
    writeMeta(m);
    schedule();
  };
  proto.setItem = function (this: Storage, k: string, v: string) { origSet!.call(this, k, v); if (this === localStorage) mark(k); };
  proto.removeItem = function (this: Storage, k: string) { origRemove!.call(this, k); if (this === localStorage) mark(k); };
}

export async function pushNow(): Promise<void> {
  if (!api || pushing) return;
  pushing = true;
  try {
    await api.setMySettings(trimSnapshot(deviceSnapshot()));
    lastSync = Date.now();
    for (const f of listeners) f();
  } catch {
    /* offline oder Datenbank-Update fehlt – beim nächsten Mal */
  } finally {
    pushing = false;
  }
}

const RELOAD_FLAG = 'gym-tracker-sync-reloaded';
/**
 * Beim Start mit Konto: Kontostand laden, zusammenführen, Neueres aufs Gerät schreiben (dann einmal neu laden),
 * gemeinsamen Stand hochladen. Ohne Konto passiert nichts.
 */
export async function startCloudSettings(a: SettingsApi | null, userId: string | null): Promise<void> {
  api = a; uid = userId ?? '';
  if (!a || !userId || typeof localStorage === 'undefined') return;
  let cloud: Snapshot;
  try {
    cloud = cleanSnapshot(await a.mySettings());
  } catch {
    return; // offline oder Datenbank-Update 70 fehlt
  }
  const { merged, toDevice, changedCloud } = mergeSnapshots(deviceSnapshot(), cloud);
  // erst jetzt Änderungen verfolgen: was die App beim Start von selbst schreibt, überschreibt so nicht das Konto
  wrapStorage();
  const meta = readMeta();
  for (const [ck, e] of Object.entries(toDevice)) {
    const k = deviceKey(ck, userId);
    try {
      if (e.v === null) origRemove!.call(localStorage, k); else origSet!.call(localStorage, k, e.v);
    } catch { /* voll */ }
    meta[ck] = e.t;
  }
  writeMeta(meta);
  if (changedCloud || !Object.keys(cloud).length) await pushNow();
  else { lastSync = Date.now(); for (const f of listeners) f(); }
  void merged;
  if (Object.keys(toDevice).length) {
    // damit alle Bereiche die wiederhergestellten Werte übernehmen – nur einmal pro Sitzung
    let again = false;
    try { again = sessionStorage.getItem(RELOAD_FLAG) === '1'; sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { again = true; }
    if (!again) location.reload();
  }
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && api && timer) { window.clearTimeout(timer); timer = 0; void pushNow(); } });
