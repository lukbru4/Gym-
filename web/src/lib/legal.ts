// Links zu den Rechtstexten (liegen als eigene Seiten in public/, damit die Stores feste Adressen haben).
import { publicUrl } from './platform';

/** Version der Texte, der bei der Registrierung zugestimmt wird (bei Änderungen erhöhen) */
export const TERMS_VERSION = '2026-10';

export const legalUrl = (page: 'datenschutz' | 'nutzungsbedingungen' | 'impressum') => `${publicUrl()}${page}.html`;
