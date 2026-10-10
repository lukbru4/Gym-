// Anmelden / Registrieren / Passwort vergessen (nur im Cloud-Modus) und neues Passwort festlegen.
import { useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { PasswordInput } from '../components/PasswordInput';
import { authErrorMessage } from '../lib/authErrors';
import { MAIL_SENDER, legalUrl } from '../lib/legal';
import { notify } from '../components/Dialog';

type Mode = 'login' | 'signup' | 'reset' | 'check-mail';

export function Auth() {
  const { api, showError } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password') ?? '');
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'login') {
        await api.signIn(email.trim(), password);
      } else if (mode === 'signup') {
        const data = (await api.signUp(email.trim(), password)) as { session?: unknown };
        if (!data?.session) setMode('check-mail');
      } else {
        await api.resetPassword!(email.trim());
        setMode('login');
        setMessage(
          'Wenn es zu dieser E-Mail ein Konto gibt, kommt gleich eine Mail mit einem Link. Öffne den Link und lege dort ein neues Passwort fest. Schau auch im Spam-Ordner nach.',
        );
      }
    } catch (err) {
      showError(new Error(authErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      await api.resendConfirmation?.(email.trim());
      setMessage('Wir haben die E-Mail noch einmal geschickt.');
    } catch (err) {
      showError(new Error(authErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'check-mail')
    return (
      <div className="card auth check-mail" id="check-mail">
        <div className="big-icon" aria-hidden="true">✉️</div>
        <h2>Schau in dein Postfach!</h2>
        <p>
          Wir haben dir eine E-Mail an <strong>{email.trim()}</strong> geschickt.
        </p>
        <ol className="steps">
          <li>Öffne die Bestätigungs-E-Mail (Absender: <strong>{MAIL_SENDER}</strong>).</li>
          <li>Tippe auf den Link darin.</li>
          <li>Komm zurück und melde dich an.</li>
        </ol>
        <p className="muted small">Nichts angekommen? Schau auch im Spam- bzw. Werbung-Ordner nach. Es kann ein paar Minuten dauern.</p>
        {message && <p className="notice">{message}</p>}
        <button className="btn block" id="resend-mail" disabled={busy || !api.resendConfirmation} onClick={resend}>E-Mail erneut senden</button>
        <button className="btn primary block" id="to-login" onClick={() => { setMessage(''); setMode('login'); }}>Zur Anmeldung</button>
      </div>
    );

  const title = { login: 'Anmelden', signup: 'Konto erstellen', reset: 'Passwort zurücksetzen' }[mode];
  const button = { login: 'Anmelden', signup: 'Registrieren', reset: 'Link per E-Mail senden' }[mode];
  const switchTo = (m: Mode) => {
    setMode(m);
    setMessage('');
  };

  return (
    <div className="card auth">
      <h2>{title}</h2>
      <form id="auth-form" onSubmit={submit}>
        <label>
          E-Mail
          <input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'reset' && (
          <label>
            Passwort
            <PasswordInput name="password" minLength={6} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </label>
        )}
        {mode === 'signup' && (
          <label className="consent">
            <input type="checkbox" name="consent" id="consent" required />
            <span>
              Ich akzeptiere die{' '}
              <a href={legalUrl('nutzungsbedingungen')} target="_blank" rel="noopener">Nutzungsbedingungen</a> und habe die{' '}
              <a href={legalUrl('datenschutz')} target="_blank" rel="noopener">Datenschutzerklärung</a> gelesen. Ich willige ausdrücklich ein, dass meine
              Trainings- und Körperdaten (Gesundheitsdaten) für die App gespeichert werden. Widerruf jederzeit durch Löschen des Kontos.
            </span>
          </label>
        )}
        <button className="btn primary block" type="submit" disabled={busy}>
          {button}
        </button>
      </form>
      {message && <p className="notice">{message}</p>}
      <p className="center auth-links">
        {mode === 'login' && api.resetPassword && (
          <button className="link" id="forgot" type="button" onClick={() => switchTo('reset')}>
            Passwort vergessen?
          </button>
        )}
        <button className="link" id="toggle-mode" type="button" onClick={() => switchTo(mode === 'signup' ? 'login' : mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Zurück zur Anmeldung'}
        </button>
      </p>
      <LegalLinks />
    </div>
  );
}

export function LegalLinks() {
  return (
    <p className="legal-links muted small center">
      <a href={legalUrl('datenschutz')} target="_blank" rel="noopener">Datenschutz</a> ·{' '}
      <a href={legalUrl('nutzungsbedingungen')} target="_blank" rel="noopener">Nutzungsbedingungen</a> ·{' '}
      <a href={legalUrl('impressum')} target="_blank" rel="noopener">Impressum</a>
    </p>
  );
}

/** Nach dem Link „Passwort zurücksetzen“: neues Passwort festlegen */
export function SetNewPassword({ onDone }: { onDone: () => void }) {
  const { api, showError } = useApp();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get('password'));
    if (pw !== String(f.get('password2'))) return showError(new Error('Die beiden Passwörter sind nicht gleich.'));
    setBusy(true);
    try {
      await api.updatePassword!(pw);
      await notify('Dein neues Passwort ist gespeichert.', { title: 'Gespeichert' });
      onDone();
    } catch (err) {
      showError(new Error(authErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card auth">
      <h2>Neues Passwort festlegen</h2>
      <form id="new-password-form" onSubmit={submit}>
        <label>
          Neues Passwort
          <PasswordInput name="password" minLength={6} required autoComplete="new-password" />
        </label>
        <label>
          Neues Passwort wiederholen
          <PasswordInput name="password2" minLength={6} required autoComplete="new-password" />
        </label>
        <button className="btn primary block" type="submit" disabled={busy}>Speichern</button>
      </form>
    </div>
  );
}
