// Links aus unseren Mails: #/bestaetigen?token_hash=…&type=… (statt Umweg über supabase.co)
export type EmailLinkType = 'email' | 'signup' | 'recovery' | 'email_change' | 'magiclink' | 'invite';
const TYPES: EmailLinkType[] = ['email', 'signup', 'recovery', 'email_change', 'magiclink', 'invite'];

export function parseEmailLink(hash: string): { tokenHash: string; type: EmailLinkType } | null {
  const m = /^#\/bestaetigen\?(.*)$/.exec(hash);
  if (!m) return null;
  const p = new URLSearchParams(m[1].replace(/&amp;/g, '&'));
  const tokenHash = p.get('token_hash') ?? '';
  const type = p.get('type') as EmailLinkType;
  if (!/^[A-Za-z0-9_-]{6,200}$/.test(tokenHash) || !TYPES.includes(type)) return null;
  return { tokenHash, type };
}

export const EMAIL_LINK_DONE: Record<EmailLinkType, string> = {
  email: 'Deine E-Mail ist bestätigt – willkommen bei Level Up! 💪',
  signup: 'Deine E-Mail ist bestätigt – willkommen bei Level Up! 💪',
  email_change: 'Deine neue E-Mail-Adresse ist bestätigt.',
  magiclink: 'Du bist angemeldet.',
  invite: 'Willkommen bei Level Up! Lege jetzt in den Einstellungen ein Passwort fest.',
  recovery: '',
};
