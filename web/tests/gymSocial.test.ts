import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { describe as describeNotif } from '../src/lib/notifications';

const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
const block = sql.slice(sql.indexOf('-- Datenbank-Update 69'));
test('DB 69: Anfeuern 1× pro Tag, nur Freunde; Geschenke 10–200, max. 300/Tag; Rangliste unverändert', () => {
  expect(block).toMatch(/primary key \(from_user, to_user, day\)/);
  expect(block).toMatch(/amount between 10 and 200/);
  expect(block).toMatch(/today \+ p_amount > 300/);
  expect(block).toMatch(/not public\.are_friends\(me, p_user\) or public\.is_blocked\(me, p_user\)/);
  expect(block).toMatch(/bal := public\.wallet_balance\(me\)/);
  // Rangliste nutzt weiter nur credits_total (ohne Geschenke)
  expect(block).not.toMatch(/create or replace function public\.credits_total/);
  expect(block).toMatch(/revoke all on public\.gym_cheers, public\.credit_gifts from anon, authenticated/);
});
test('Mitteilungen: Anfeuern und Geschenk', () => {
  const base = { at: new Date().toISOString(), actor: 'u1', actor_name: 'Tom', workout_id: null, challenge_id: null, unread: true };
  expect(describeNotif({ ...base, kind: 'gym_cheer', body: null } as never).text).toBe('Tom hat dein Gym angefeuert (+5 Credits)');
  expect(describeNotif({ ...base, kind: 'gift', body: '50|Weiter so!' } as never).text).toBe('Tom hat dir 50 Credits geschenkt: „Weiter so!“');
  expect(describeNotif({ ...base, kind: 'gift', body: '25|' } as never).text).toBe('Tom hat dir 25 Credits geschenkt');
});
