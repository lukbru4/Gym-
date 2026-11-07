// Meldet Designwechsel (Hell/Dunkel, Farbschema) an React-Komponenten, z. B. damit Diagramme neu zeichnen.
let version = 0;
const listeners = new Set<() => void>();
export const themeVersion = () => version;
export function subscribeTheme(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
export function notifyThemeChanged() {
  version++;
  listeners.forEach((l) => l());
}
