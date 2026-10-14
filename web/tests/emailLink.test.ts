import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseEmailLink } from '../src/lib/emailLink';

const DIR = new URL('../../supabase/email-templates/', import.meta.url);
const TYPE: Record<string, string> = { bestaetigen: 'email', passwort: 'recovery', 'email-aendern': 'email_change', 'magic-link': 'magiclink', einladung: 'invite' };

describe('Mail-Vorlagen', () => {
  const subjects = JSON.parse(readFileSync(new URL('betreff.json', DIR), 'utf8'));
  test('jede Vorlage hat Betreff, Link in die App mit richtigem Typ und nichts Externes', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.html'));
    expect(files.length).toBe(5);
    for (const f of files) {
      const id = f.replace('.html', '');
      const html = readFileSync(new URL(f, DIR), 'utf8');
      expect(subjects[id], id).toMatch(/Level Up|Level-Up/);
      expect(html, id).toContain(`{{ .SiteURL }}#/bestaetigen?token_hash={{ .TokenHash }}&amp;type=${TYPE[id]}`);
      expect(html, id).not.toMatch(/<script|<img|supabase\.co|ConfirmationURL/);
      expect(html, id).toContain('Level Up');
    }
  });
  test('Link aus der Mail wird erkannt', () => {
    expect(parseEmailLink('#/bestaetigen?token_hash=pkce_abc123&type=email')).toEqual({ tokenHash: 'pkce_abc123', type: 'email' });
    expect(parseEmailLink('#/bestaetigen?token_hash=abc123&amp;type=recovery')).toEqual({ tokenHash: 'abc123', type: 'recovery' });
    expect(parseEmailLink('#/bestaetigen?token_hash=abc123&type=hack')).toBeNull();
    expect(parseEmailLink('#/bestaetigen?token_hash=a<b>&type=email')).toBeNull();
    expect(parseEmailLink('#/')).toBeNull();
  });
});
