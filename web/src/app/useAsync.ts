// Lädt Daten für eine Seite und lädt neu, wenn sich die Abhängigkeiten ändern.
import { useEffect, useState, type DependencyList } from 'react';

/** Fehler einheitlich als Error – Supabase liefert z. B. Objekte mit message/code statt Error */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  const o = e as { message?: string; code?: string; details?: string } | null;
  const err = new Error(o?.message || (typeof e === 'string' ? e : 'Unbekannter Fehler'));
  if (o?.code) (err as Error & { code?: string }).code = o.code;
  return err;
}

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ok'; data: T };

export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ status: 'ok', data }),
      (error) => {
        console.error(error);
        if (alive) setState({ status: 'error', error: toError(error) });
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
