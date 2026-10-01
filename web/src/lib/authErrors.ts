// Fehlermeldungen von Supabase-Login ins Deutsche übersetzen (unbekannte bleiben, wie sie sind).
const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-Mail oder Passwort stimmt nicht. Prüfe die Eingabe oder nutze „Passwort vergessen?“.'],
  [/email not confirmed/i, 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Mail.'],
  [/user already registered/i, 'Mit dieser E-Mail gibt es schon ein Konto. Melde dich an oder nutze „Passwort vergessen?“.'],
  [/password should be at least/i, 'Das Passwort muss mindestens 6 Zeichen haben.'],
  [/rate limit|too many requests|security purposes/i, 'Zu viele Versuche. Bitte warte ein paar Minuten und versuche es dann erneut.'],
  [/unable to validate email|invalid email/i, 'Bitte gib eine gültige E-Mail-Adresse ein.'],
  [/new password should be different/i, 'Das neue Passwort muss sich vom alten unterscheiden.'],
];

export function authErrorMessage(err: unknown): string {
  const msg = (err as Error)?.message || String(err);
  return MESSAGES.find(([re]) => re.test(msg))?.[1] ?? msg;
}
