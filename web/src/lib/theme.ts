// Hell/Dunkel: standardmäßig nach Uhrzeit (18:00–6:00 Uhr dunkel), wahlweise wie Gerät oder fest.
// Das kleine Skript im <head> von index.html setzt das Design schon vor dem ersten Zeichnen
// (gleiche Regel), damit die Seite nicht kurz hell aufblitzt.

const KEY = 'gym-tracker-theme';
const SCHEME_KEY = 'gym-tracker-scheme';

export type SchemeId = 'energie' | 'violett' | 'ozean' | 'glut' | 'klassisch' | 'gold' | 'eis';
export type ThemeMode = 'time' | 'system' | 'light' | 'dark';

export const SCHEMES: [SchemeId, string][] = [
  ['energie', 'Energie (Schwarz + Neon-Grün)'],
  ['violett', 'Nacht-Violett'],
  ['ozean', 'Ozean (Petrol)'],
  ['glut', 'Glut (warmes Orange)'],
  ['klassisch', 'Klassisch'],
  ['gold', 'Schwarz-Gold (Shop)'],
  ['eis', 'Eisblau (Shop)'],
];
/** Farbschemata, die man im Shop kaufen muss: Schema → Shop-Artikel */
export const PREMIUM_SCHEMES: Partial<Record<SchemeId, string>> = { gold: 'scheme_gold', eis: 'scheme_eis' };
export const DEFAULT_SCHEME: SchemeId = 'energie';
export const THEME_OPTIONS: [ThemeMode, string][] = [
  ['time', 'Nach Uhrzeit (18–6 Uhr dunkel)'],
  ['system', 'Wie Gerät'],
  ['light', 'Immer hell'],
  ['dark', 'Immer dunkel'],
];
export const DARK_FROM_HOUR = 18;
export const DARK_UNTIL_HOUR = 6;

export const isNight = (date: Date) => date.getHours() >= DARK_FROM_HOUR || date.getHours() < DARK_UNTIL_HOUR;

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
  const before = `${root.dataset.theme ?? ''}|${root.dataset.scheme ?? ''}`;
  root.dataset.scheme = getScheme();
  const theme = resolveTheme(getThemeMode());
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const bg = getComputedStyle(root).getPropertyValue('--surface').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (dark ? '#1a1a19' : '#ffffff'));
  if (`${root.dataset.theme ?? ''}|${root.dataset.scheme ?? ''}` !== before) onChangeCb?.();
}

export function setScheme(scheme: SchemeId) {
  write(SCHEME_KEY, scheme);
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
  setInterval(applyTheme, 60 * 1000); // Wechsel um 18:00 / 6:00 ohne Neuladen
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && applyTheme());
}
