// Linien-Symbole für die Einstellungs-Menüliste (24×24, Strich in Textfarbe).
const P: Record<string, string> = {
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0',
  konto: 'M4 6h16v12H4zM8 10v4m0-2h.01M12 12h5',
  pro: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
  ziele: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  statistik: 'M5 20V10m7 10V4m7 16v-7',
  daten: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zm0 0v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6m-14 6c0 1.7 3.1 3 7 3s7-1.3 7-3',
  themen: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-18v18',
  app: 'M12 4v10m0 0l-4-4m4 4l4-4M5 20h14',
  faq: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-2.5-11a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7m0 3h.01',
  news: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2',
  recht: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6m-6 4h6',
  logout: 'M10 4H5v16h5m4-4l4-4-4-4m4 4H9',
  shop: 'M4 9l1-5h14l1 5M5 9v11h14V9M9 20v-6h6v6',
};
export function SettingsIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[id] ?? P.profil} />
    </svg>
  );
}
