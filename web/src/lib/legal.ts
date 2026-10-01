// Links zu den Rechtstexten (liegen als eigene Seiten in public/, damit die Stores feste Adressen haben).
import { publicUrl } from './platform';

/** Version der Texte, der bei der Registrierung zugestimmt wird (bei Änderungen erhöhen) */
export const TERMS_VERSION = '2026-10';

export const legalUrl = (page: 'datenschutz' | 'nutzungsbedingungen' | 'impressum') => `${publicUrl()}${page}.html`;

/** Absendername der Anmelde-Mails. Solange kein eigener E-Mail-Versand (SMTP) in Supabase eingerichtet ist,
 *  kommen sie von „Supabase Auth“ – danach hier auf 'Level Up' ändern. */
export const MAIL_SENDER = 'Supabase Auth';
