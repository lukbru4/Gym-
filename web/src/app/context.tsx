// Globaler App-Zustand: Speicher-Backend, angemeldeter Nutzer, Übungsliste, Fehleranzeige.
import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Backend } from '../data/backend';
import type { Exercise, ExerciseMap, User } from '../lib/types';

interface AppState {
  api: Backend;
  user: User | null;
  exercises: Exercise[];
  setExercises: (list: Exercise[]) => void;
  addExercise: (ex: Exercise) => void;
  exerciseById: (id: number | string) => Exercise | undefined;
  exerciseMap: () => ExerciseMap;
  /** Zeigt eine Fehlermeldung unten an */
  showError: (err: unknown) => void;
  /** Erhöht sich bei jeder Datenänderung → Seiten und Kopfzeile laden neu */
  dataVersion: number;
  dataChanged: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp außerhalb von AppProvider');
  return v;
}

const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, 'de');

export function AppProvider(props: {
  api: Backend;
  user: User | null;
  exercises: Exercise[];
  setExercises: Dispatch<SetStateAction<Exercise[]>>;
  showError: (err: unknown) => void;
  children: ReactNode;
}) {
  const { api, user, exercises, setExercises, showError } = props;
  const [dataVersion, setDataVersion] = useState(0);
  const dataChanged = useCallback(() => setDataVersion((v) => v + 1), []);
  const value = useMemo<AppState>(() => {
    const byId = new Map(exercises.map((e) => [e.id, e]));
    return {
      api,
      user,
      exercises,
      setExercises: (list) => setExercises([...list].sort(byName)),
      // funktional, damit mehrere Aufrufe hintereinander sich nicht gegenseitig überschreiben
      addExercise: (ex) => setExercises((list) => [...list.filter((e) => e.id !== ex.id), ex].sort(byName)),
      exerciseById: (id) => byId.get(Number(id)),
      exerciseMap: () => new Map(byId),
      showError,
      dataVersion,
      dataChanged,
    };
  }, [api, user, exercises, setExercises, showError, dataVersion, dataChanged]);
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}
