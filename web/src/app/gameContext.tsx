// Spielstand für die aktuelle Seite (wird bei jedem Seitenwechsel und jeder Datenänderung neu berechnet).
import { createContext, useContext, type ReactNode } from 'react';
import type { AsyncState } from './useAsync';
import type { Game } from './game';

const Ctx = createContext<AsyncState<Game>>({ status: 'loading' });
export const GameProvider = ({ value, children }: { value: AsyncState<Game>; children: ReactNode }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);
export const useGame = () => useContext(Ctx);
