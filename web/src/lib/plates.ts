// Scheibenrechner (welche Scheiben je Seite auf die Stange) und automatische Aufwärmsätze.
import { useSyncExternalStore } from 'react';
import { keywordsOf } from './exerciseCatalog';

export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const BARS = [20, 15, 10, 0] as const;
export interface PlateSetup { bar: number; plates: number[] }
export const DEFAULT_SETUP: PlateSetup = { bar: 20, plates: [...ALL_PLATES] };

const KEY = 'gym-tracker-plates';
const subs = new Set<() => void>();
let cache: PlateSetup | null = null;
export function getSetup(): PlateSetup {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (v && typeof v.bar === 'number' && Array.isArray(v.plates)) {
      const plates = ALL_PLATES.filter((p) => v.plates.includes(p));
      cache = { bar: (BARS as readonly number[]).includes(v.bar) ? v.bar : 20, plates: plates.length ? plates : [...ALL_PLATES] };
      return cache;
    }
  } catch {
    /* Standard */
  }
  cache = DEFAULT_SETUP;
  return cache;
}
export function setSetup(s: PlateSetup) {
  cache = { bar: s.bar, plates: ALL_PLATES.filter((p) => s.plates.includes(p)) };
  if (!cache.plates.length) cache.plates = [...ALL_PLATES];
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* nur Komfort */ }
  for (const f of subs) f();
}
export const usePlateSetup = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getSetup, getSetup);

const r2 = (n: number) => Math.round(n * 100) / 100;
export interface PlateResult {
  /** Scheiben je Seite, größte zuerst */
  perSide: number[];
  /** tatsächlich aufgelegtes Gesamtgewicht */
  loaded: number;
  /** passt genau? */
  exact: boolean;
  /** nächste machbare Lasten (falls nicht genau) */
  lower: number; upper: number;
}
/** Scheiben je Seite für ein Gesamtgewicht (unbegrenzt viele Scheiben je Größe) */
export function platesFor(total: number, bar = 20, available: readonly number[] = ALL_PLATES): PlateResult {
  const plates = [...available].sort((a, b) => b - a);
  const greedy = (side: number) => {
    const out: number[] = [];
    let left = r2(side);
    for (const p of plates) while (left >= p - 1e-9) { out.push(p); left = r2(left - p); }
    return { out, left };
  };
  const side = Math.max(0, (total - bar) / 2);
  const { out, left } = greedy(side);
  const loaded = r2(bar + 2 * out.reduce((s, p) => s + p, 0));
  const smallest = plates[plates.length - 1] ?? 1.25;
  const exact = left < 1e-9 && total >= bar;
  // nächste machbare Last darüber: in kleinsten Schritten suchen
  let upper = loaded;
  if (!exact) for (let t = loaded + 2 * smallest; t <= total + 2 * (plates[0] ?? 25); t = r2(t + 2 * smallest)) { const g = greedy((t - bar) / 2); if (g.left < 1e-9 && t >= total) { upper = r2(t); break; } }
  return { perSide: out, loaded, exact, lower: loaded, upper: exact ? loaded : Math.max(upper, bar) };
}
/** Text „20 + 10 + 2,5“ */
export const plateText = (perSide: number[]) => (perSide.length ? perSide.map((p) => String(p).replace('.', ',')).join(' + ') : 'keine Scheiben');

/** Langhantel-Übung? (Scheibenrechner sinnvoll) */
export function isBarbell(name: string): boolean {
  const n = name.toLowerCase();
  if (/kurzhantel|dumbbell|maschine|kabel|cable|smith|multipresse|kettlebell|band|körpergewicht/.test(n)) return false;
  const text = `${n} ${keywordsOf(name).toLowerCase()}`;
  return /langhantel|barbell|\bsz\b|sz-stange|kreuzheben|deadlift|landmine/.test(text);
}

export interface WarmupSet { weight: number; reps: number }
/**
 * Aufwärmsätze bis zum Arbeitsgewicht: ab 40 kg Stange × 10, ~40 % × 8, ~60 % × 5, ~80 % × 3; darunter 50 % × 10, 75 % × 5.
 * Gerundet auf machbare Lasten (step = kleinste Stufe, z. B. 2,5 kg), aufsteigend, ohne Dopplungen, immer leichter als das Arbeitsgewicht.
 */
export function warmupSets(work: number, bar = 20, step = 2.5): WarmupSet[] {
  if (!(work > 0)) return [];
  const round = (kg: number) => Math.max(0, Math.round(kg / step) * step);
  const plan: [number, number][] = work >= 40 ? [[0, 10], [0.4, 8], [0.6, 5], [0.8, 3]] : [[0.5, 10], [0.75, 5]];
  const out: WarmupSet[] = [];
  for (const [pct, reps] of plan) {
    const w = r2(pct === 0 ? Math.min(bar || round(work * 0.3), work) : round(work * pct));
    if (w <= 0 || w >= work) continue;
    if (out.length && w - out[out.length - 1].weight < Math.max(step, work * 0.1) - 1e-9) continue; // zu nah am vorigen
    if (bar && work >= 40 && w < bar) continue;
    out.push({ weight: w, reps });
  }
  return out;
}

/** Farbe einer Scheibe (übliche Wettkampffarben) */
export const plateColor = (p: number) => ({ 25: '#d6283b', 20: '#1c64d8', 15: '#e9b51c', 10: '#2c9a4b', 5: '#f2f2f2', 2.5: '#d6283b', 1.25: '#9aa0a8' } as Record<number, string>)[p] ?? '#666';
