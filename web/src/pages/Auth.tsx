// Anmelden / Registrieren (nur im Cloud-Modus).
import { useState, type FormEvent } from 'react';
import { useApp } from '../app/context';

export function Auth() {
  const { api, showError } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    setBusy(true);
    try {
      if (mode === 'login') {
        await api.signIn(email, password);
      } else {
        const data = (await api.signUp(email, password)) as { session?: unknown };
        if (!data?.session) {
          setMode('login');
          setMessage('Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in der Mail und melde dich dann an.');
        }
      }
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth">
      <h2>{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</h2>
      <form id="auth-form" onSubmit={submit}>
        <label>
          E-Mail<input type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          Passwort
          <input type="password" name="password" minLength={6} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        <button className="btn primary block" type="submit" disabled={busy}>
          {mode === 'login' ? 'Anmelden' : 'Registrieren'}
        </button>
      </form>
      {message && <p className="notice">{message}</p>}
      <p className="center">
        <button
          className="link"
          id="toggle-mode"
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setMessage('');
          }}
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
      </p>
    </div>
  );
}
