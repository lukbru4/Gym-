// Hell/Dunkel: standardmäßig nach Uhrzeit (18:00–6:00 Uhr dunkel), wahlweise wie Gerät oder fest.
// Das kleine Skript im <head> von index.html setzt das Design schon vor dem ersten Zeichnen
// (gleiche Regel), damit die Seite nicht kurz hell aufblitzt.

const KEY = 'gym-tracker-theme';
export const THEME_OPTIONS = [
  ['time', 'Nach Uhrzeit (18–6 Uhr dunkel)'],
  ['system', 'Wie Gerät'],
  ['light', 'Immer hell'],
  ['dark', 'Immer dunkel'],
];
export const DARK_FROM_HOUR = 18;
export const DARK_UNTIL_HOUR = 6;

export const isNight = (date) => date.getHours() >= DARK_FROM_HOUR || date.getHours() < DARK_UNTIL_HOUR;

export function getThemeMode() {
  try {
    const m = localStorage.getItem(KEY);
    return THEME_OPTIONS.some(([id]) => id === m) ? m : 'time';
  } catch {
    return 'time';
  }
}

// Liefert 'dark', 'light' oder null (= Gerät entscheidet)
export function resolveTheme(mode, now = new Date()) {
  if (mode === 'time') return isNight(now) ? 'dark' : 'light';
  if (mode === 'light' || mode === 'dark') return mode;
  return null;
}

let onChangeCb = null;

export function applyTheme() {
  const root = document.documentElement;
  const before = root.dataset.theme ?? null;
  const theme = resolveTheme(getThemeMode());
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1a1a19' : '#1f6fd1');
  if ((root.dataset.theme ?? null) !== before) onChangeCb?.();
}

export function setThemeMode(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ohne Speicher gilt die Uhrzeit */
  }
  applyTheme();
}

export function initTheme(onChange) {
  onChangeCb = onChange;
  applyTheme();
  setInterval(applyTheme, 60 * 1000); // Wechsel um 18:00 / 6:00 ohne Neuladen
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && applyTheme());
}
