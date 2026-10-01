// Hell/Dunkel: standardmäßig nach Uhrzeit (18:00–6:00 Uhr dunkel, Zeiten einstellbar), wahlweise wie Gerät oder fest.
// Dazu optional eine eigene Akzentfarbe, die automatisch für Hell und Dunkel lesbar gemacht wird.
// Das kleine Skript im <head> von index.html setzt das Design schon vor dem ersten Zeichnen
// (gleiche Regel), damit die Seite nicht kurz hell aufblitzt.

const KEY = 'gym-tracker-theme';
const SCHEME_KEY = 'gym-tracker-scheme';

export type SchemeId =
  | 'energie' | 'klassisch'
  | 'ozean' | 'violett' | 'glut' | 'kirsche' | 'wald' | 'mitternacht' | 'sunset' | 'mono' | 'gold' | 'eis';
export type ThemeMode = 'time' | 'system' | 'light' | 'dark';

export const SCHEMES: [SchemeId, string][] = [
  ['energie', 'Energie (Schwarz + Neon-Grün)'],
  ['klassisch', 'Klassisch'],
  ['ozean', 'Ozean (Shop)'],
  ['violett', 'Nacht-Violett (Shop)'],
  ['glut', 'Glut (Shop)'],
  ['kirsche', 'Kirschblüte (Shop)'],
  ['wald', 'Wald (Shop)'],
  ['mitternacht', 'Mitternacht (Shop)'],
  ['sunset', 'Sonnenuntergang (Shop)'],
  ['mono', 'Schwarz-Weiß (Shop)'],
  ['gold', 'Schwarz-Gold (Shop)'],
  ['eis', 'Eisblau (Shop)'],
];
/** Farbschemata, die man im Shop kaufen muss: Schema → Shop-Artikel. Wer eines davon schon aktiv hatte,
 *  bevor es in den Shop kam, behält es, bis er wechselt. */
export const PREMIUM_SCHEMES: Partial<Record<SchemeId, string>> = {
  ozean: 'scheme_ozean', violett: 'scheme_violett', glut: 'scheme_glut', kirsche: 'scheme_kirsche', wald: 'scheme_wald',
  mitternacht: 'scheme_mitternacht', sunset: 'scheme_sunset', mono: 'scheme_mono', gold: 'scheme_gold', eis: 'scheme_eis',
};
export const DEFAULT_SCHEME: SchemeId = 'energie';
export const THEME_OPTIONS: [ThemeMode, string][] = [
  ['time', 'Nach Uhrzeit'],
  ['system', 'Wie Gerät'],
  ['light', 'Immer hell'],
  ['dark', 'Immer dunkel'],
];
export const DARK_FROM_HOUR = 18;
export const DARK_UNTIL_HOUR = 6;
const HOURS_KEY = 'gym-tracker-dark-hours';
const ACCENT_KEY = 'gym-tracker-accent';

/** Eigene Zeiten für „Nach Uhrzeit“: ab `from` Uhr dunkel, bis `until` Uhr */
export interface DarkHours { from: number; until: number }
export function getDarkHours(): DarkHours {
  try {
    const v = JSON.parse(localStorage.getItem(HOURS_KEY) ?? 'null');
    const ok = (h: unknown) => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23;
    if (v && ok(v.from) && ok(v.until) && v.from !== v.until) return { from: v.from, until: v.until };
  } catch {
    /* Standard */
  }
  return { from: DARK_FROM_HOUR, until: DARK_UNTIL_HOUR };
}
export function setDarkHours(hours: DarkHours) {
  write(HOURS_KEY, JSON.stringify(hours));
  applyTheme();
}

/** Dunkel zwischen from und until (auch über Mitternacht, z. B. 20–7, oder tagsüber, z. B. 13–15) */
export function isNight(date: Date, hours: DarkHours = getDarkHours()): boolean {
  const h = date.getHours();
  return hours.from > hours.until ? h >= hours.from || h < hours.until : h >= hours.from && h < hours.until;
}
export const timeModeLabel = (hours = getDarkHours()) => `Nach Uhrzeit (${hours.from}–${hours.until} Uhr dunkel)`;

// ---- Eigene Akzentfarbe -------------------------------------------------------------
/** Vorschläge im Farbwähler */
export const ACCENT_PRESETS: [string, string][] = [
  ['#b6ff00', 'Neon-Grün'], ['#22c55e', 'Grün'], ['#14b8a6', 'Türkis'], ['#06b6d4', 'Cyan'],
  ['#3b82f6', 'Blau'], ['#6366f1', 'Indigo'], ['#a855f7', 'Lila'], ['#ec4899', 'Pink'],
  ['#ef4444', 'Rot'], ['#f97316', 'Orange'], ['#f59e0b', 'Bernstein'], ['#facc15', 'Gelb'],
];

type RGB = [number, number, number];
const hexToRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const rgbToHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
function luminance([r, g, b]: RGB): number {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const mix = (c: RGB, to: number, t: number): RGB => c.map((v) => v + (to - v) * t) as RGB;

export interface AccentVars { light: string; dark: string; lightText: string; darkText: string }
/** Passt die Wunschfarbe an, damit sie auf hellem bzw. dunklem Hintergrund gut lesbar ist (≥ 3:1)
 *  und wählt dazu weiße oder schwarze Schrift für Knöpfe. */
export function accentVariants(hex: string): AccentVars {
  const base = hexToRgb(hex);
  let light = base;
  for (let t = 0.05; contrast(rgbToHex(light), '#ffffff') < 3 && t <= 1; t += 0.05) light = mix(base, 0, t);
  let dark = base;
  for (let t = 0.05; contrast(rgbToHex(dark), '#121212') < 3 && t <= 1; t += 0.05) dark = mix(base, 255, t);
  const textOn = (c: string) => (contrast(c, '#ffffff') >= contrast(c, '#000000') ? '#ffffff' : '#000000');
  const l = rgbToHex(light), d = rgbToHex(dark);
  return { light: l, dark: d, lightText: textOn(l), darkText: textOn(d) };
}

export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export function getAccent(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(ACCENT_KEY) ?? 'null');
    return isHexColor(v?.color) ? v.color.toLowerCase() : null;
  } catch {
    return null;
  }
}
/** null = Farbe des Farbschemas */
export function setAccent(color: string | null) {
  try {
    if (color && isHexColor(color)) localStorage.setItem(ACCENT_KEY, JSON.stringify({ color: color.toLowerCase(), ...accentVariants(color) }));
    else localStorage.removeItem(ACCENT_KEY);
  } catch {
    /* ohne Speicher gilt das Farbschema */
  }
  applyTheme();
}

function read<T extends string>(key: string, allowed: [T, string][], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return allowed.some(([id]) => id === v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ohne Speicher gilt der Standard */
  }
}

export const getScheme = () => read(SCHEME_KEY, SCHEMES, DEFAULT_SCHEME);

// ---- Vorschau aus dem Shop: Farbschema nur anschauen, nicht speichern ----------------
let preview: SchemeId | null = null;
const previewListeners = new Set<() => void>();
export const getPreviewScheme = () => preview;
export function subscribePreview(cb: () => void) {
  previewListeners.add(cb);
  return () => void previewListeners.delete(cb);
}
/** null beendet die Vorschau; danach gilt wieder das eigene Farbschema */
export function setPreviewScheme(id: SchemeId | null) {
  preview = id;
  applyTheme();
  previewListeners.forEach((l) => l());
}
export const getThemeMode = () => read(KEY, THEME_OPTIONS, 'time');

/** Liefert 'dark', 'light' oder null (= Gerät entscheidet) */
export function resolveTheme(mode: ThemeMode, now = new Date()): 'dark' | 'light' | null {
  if (mode === 'time') return isNight(now) ? 'dark' : 'light';
  if (mode === 'light' || mode === 'dark') return mode;
  return null;
}

let onChangeCb: (() => void) | null = null;

export function applyTheme() {
  const root = document.documentElement;
  const before = `${root.dataset.theme ?? ''}|${root.dataset.scheme ?? ''}|${root.dataset.accent ?? ''}`;
  root.dataset.scheme = preview ?? getScheme();
  const theme = resolveTheme(getThemeMode());
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const accent = preview ? null : getAccent(); // in der Vorschau die echten Schema-Farben zeigen
  if (accent) {
    const v = accentVariants(accent);
    root.style.setProperty('--accent', dark ? v.dark : v.light);
    root.style.setProperty('--accent-text', dark ? v.darkText : v.lightText);
    root.dataset.accent = accent;
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-text');
    delete root.dataset.accent;
  }
  const bg = getComputedStyle(root).getPropertyValue('--surface').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (dark ? '#1a1a19' : '#ffffff'));
  if (`${root.dataset.theme ?? ''}|${root.dataset.scheme ?? ''}|${root.dataset.accent ?? ''}` !== before) onChangeCb?.();
}

export function setScheme(scheme: SchemeId) {
  write(SCHEME_KEY, scheme);
  preview = null;
  applyTheme();
}
export function setThemeMode(mode: ThemeMode) {
  write(KEY, mode);
  applyTheme();
}

/** Startet die automatische Umschaltung; onChange wird bei jedem Wechsel aufgerufen. */
export function initTheme(onChange?: () => void) {
  onChangeCb = onChange ?? null;
  applyTheme();
  setInterval(applyTheme, 60 * 1000); // Wechsel zur eingestellten Uhrzeit ohne Neuladen
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme); // „Wie Gerät“
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && applyTheme());
}
