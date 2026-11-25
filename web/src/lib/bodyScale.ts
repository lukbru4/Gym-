// Proportionen der Körperfigur anpassen: Beine verlängern (alles unter der Hüfte wird in der Höhe gestreckt).
// Wirkt auf absolute Pfadangaben (M, L, C …); die Muskelformen selbst müssen nicht neu gezeichnet werden.
export const HIP_Y = 268;
export const LEG_STRETCH = 1.16;
/** Neue Höhe der Figur (Fußsohle war bei y = 458) */
export const FIGURE_BOTTOM = HIP_Y + (458 - HIP_Y) * LEG_STRETCH;

export const stretchY = (y: number) => (y > HIP_Y ? HIP_Y + (y - HIP_Y) * LEG_STRETCH : y);

const cache = new Map<string, string>();
export function stretchPath(d: string): string {
  const hit = cache.get(d);
  if (hit) return hit;
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const out: string[] = [];
  let cmd = '';
  let n = 0; // wievielte Zahl seit dem letzten Befehl
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) {
      if (!/[MLCQSTZ]/.test(t)) throw new Error(`Pfadbefehl ${t} wird beim Strecken nicht unterstützt`);
      cmd = t;
      n = 0;
      out.push(t);
      continue;
    }
    const v = Number(t);
    out.push(cmd !== 'Z' && n % 2 === 1 ? String(Math.round(stretchY(v) * 100) / 100) : t);
    n++;
  }
  const result = out.join(' ');
  cache.set(d, result);
  return result;
}
