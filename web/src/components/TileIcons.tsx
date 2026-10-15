// Symbole für die Zeilen im Profil (Duoton wie die untere Leiste: leicht gefüllte Fläche + Kontur).
import type { ReactNode } from 'react';

export type TileIconId = 'aufgaben' | 'medaillen' | 'vorlagen' | 'verlauf' | 'gewicht' | 'essen' | 'einstellungen' | 'shop' | 'backup';

const PATHS: Record<TileIconId, ReactNode> = {
  aufgaben: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2.2" />
      <path d="M9.2 4.5V3.2h5.6v1.3" />
      <path className="tile-detail" d="m8.6 11.2 1.4 1.4 2.4-2.6M8.6 16.4h6.8" />
    </>
  ),
  medaillen: (
    <>
      <circle cx="12" cy="14.2" r="5.6" />
      <path d="m8.4 3.2 3.6 6.4 3.6-6.4" />
      <path className="tile-detail" d="m12 11.6.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" />
    </>
  ),
  vorlagen: (
    <>
      <rect x="4" y="3.5" width="12.5" height="15" rx="2" />
      <path d="M8 21h10.5a1.5 1.5 0 0 0 1.5-1.5V8" />
      <path className="tile-detail" d="M7.4 8.4h6M7.4 12h6M7.4 15.4h3.4" />
    </>
  ),
  verlauf: (
    <>
      <rect x="3.8" y="5.2" width="16.4" height="15" rx="2.4" />
      <path className="tile-detail" d="M3.8 10h16.4M8.2 3v4.4M15.8 3v4.4" />
    </>
  ),
  gewicht: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.4" />
      <path className="tile-detail" d="M8 10.2a4.4 4.4 0 0 1 8 0M12 10.4l1.8-2.2" />
    </>
  ),
  essen: (
    <>
      <path d="M7 3.2v6.6a2.1 2.1 0 0 0 4.2 0V3.2" />
      <path className="tile-detail" d="M9.1 3.2V21" />
      <path d="M17.6 21V3.2c-2.4 1.1-3.7 4-3.7 7.6h3.7" />
    </>
  ),
  einstellungen: (
    <>
      <circle cx="15.8" cy="7" r="2.4" />
      <circle cx="8.2" cy="17" r="2.4" />
      <path className="tile-detail" d="M3.6 7h9.8M18.2 7h2.2M3.6 17h2.2M10.6 17h9.8" />
    </>
  ),
  shop: (
    <>
      <path d="M5.2 8.2h13.6l-1 12H6.2z" />
      <path className="tile-detail" d="M9 8.2a3 3 0 0 1 6 0" />
    </>
  ),
  backup: (
    <>
      <path d="M5 3.8h11l3.2 3.2V20.2H5z" />
      <path className="tile-detail" d="M8 3.8v5h7.2v-5M8 20.2v-6h8v6" />
    </>
  ),
};

export function TileIcon({ id }: { id: TileIconId }) {
  return (
    <svg className="tile-svg" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[id]}
    </svg>
  );
}
