// Zahlen und Datumsangaben im deutschen Format.
import type { ISODate } from './types';

export const fmt = (n: number | string | null | undefined, digits = 1) =>
  Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: digits });

export function fmtDate(iso: ISODate, withWeekday = true) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('de-DE', {
    timeZone: 'UTC',
    weekday: withWeekday ? 'short' : undefined,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export const fmtShortDate = (iso: ISODate) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

/** Akzeptiert "62,5" und "62.5". Leer → null, ungültig → NaN. */
export function parseNum(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export const fmtDuration = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Zahl als Text für ein Eingabefeld (Komma statt Punkt) */
export const toInput = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
