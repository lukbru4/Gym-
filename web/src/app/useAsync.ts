// Lädt Daten für eine Seite und lädt neu, wenn sich die Abhängigkeiten ändern.
import { useEffect, useState, type DependencyList } from 'react';

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ok'; data: T };

export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ status: 'ok', data }),
      (error) => {
        console.error(error);
        if (alive) setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
