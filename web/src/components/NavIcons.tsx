// Symbole der unteren Leiste (Duoton: leicht gefüllte Fläche + Kontur, übernehmen die Textfarbe).
import type { ReactNode } from 'react';

export type NavIconId = 'workout' | 'home' | 'raenge' | 'freunde' | 'profil';

const PATHS: Record<NavIconId, ReactNode> = {
  workout: (
    <>
      <rect x="7" y="10.6" width="10" height="2.8" rx="1.2" />
      <rect x="4.2" y="6.5" width="3.4" height="11" rx="1.4" />
      <rect x="16.4" y="6.5" width="3.4" height="11" rx="1.4" />
      <rect x="1.8" y="9" width="2.4" height="6" rx="1" />
      <rect x="19.8" y="9" width="2.4" height="6" rx="1" />
    </>
  ),
  home: <path d="M3.5 11 12 4l8.5 7v8.6a1.4 1.4 0 0 1-1.4 1.4H15v-5.6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1V21H4.9a1.4 1.4 0 0 1-1.4-1.4z" />,
  raenge: (
    <>
      <path d="M12 2.8 19.2 5.6v5.6c0 4.6-3 8.4-7.2 10-4.2-1.6-7.2-5.4-7.2-10V5.6z" />
      <path className="nav-icon-detail" d="M8.6 10.6 12 13l3.4-2.4M8.6 14.2 12 16.6l3.4-2.4" />
    </>
  ),
  freunde: (
    <>
      <circle cx="9" cy="8.2" r="3.4" />
      <path d="M2.6 19.4c0-3.6 2.9-6.2 6.4-6.2s6.4 2.6 6.4 6.2z" />
      <circle cx="17" cy="9.2" r="2.7" />
      <path d="M15.9 13.4c.4-.1.8-.1 1.2-.1 2.7 0 4.4 2.1 4.4 5h-4.3" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.4c0-4 3.6-6.6 8-6.6s8 2.6 8 6.6z" />
    </>
  ),
};

export function NavIcon({ id }: { id: NavIconId }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[id]}
    </svg>
  );
}
