// Begrüßung nach der ersten Anmeldung: Name, kurze Erklärung der App in Schritten, dann Trainingsplan.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { navigate } from '../app/router';
import { markWelcomeSeen } from '../lib/onboarding';

const SLIDES = [
  { icon: '🏋️', title: 'Trainieren & leveln', text: 'Trag deine Trainings ein – Sätze, Gewichte, Wiederholungen. Jede Übung zeigt dir als Animation, wie sie geht. Für jedes Training bekommst du Erfahrung, steigst im Level auf und sammelst Credits für den Shop.' },
  { icon: '📋', title: 'Dein Plan', text: 'Beantworte ein paar Fragen (Ziel, Erfahrung, Trainingstage) und die App baut dir einen passenden Trainingsplan – mit Wochenplan und Erinnerungen, wenn du möchtest.' },
  { icon: '👥', title: 'Mit Freunden', text: 'Füge Freunde mit ihrem Freundescode hinzu. Ihr seht eure Trainings, könnt euch anfeuern, kommentieren und in Challenges gegeneinander antreten.' },
  { icon: '🍽️', title: 'Essen & Kalorien', text: 'Mit Pro trackst du dein Essen: suchen, Barcode scannen, Foto machen oder fertige Gerichte wählen. Dein Kalorienziel wird aus deinem Ziel berechnet.' },
];

export function Welcome() {
  const { api, user, showError } = useApp();
  const [step, setStep] = useState(0); // 0 = Name, 1..4 = Folien, 5 = Plan
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!api.social) return setLoaded(true);
    api.social.myProfile().then((p) => setName(p.display_name)).catch(() => {}).finally(() => setLoaded(true));
  }, [api]);
  const finish = (to: string) => {
    if (user) markWelcomeSeen(user.id);
    navigate(to);
  };
  const saveName = async () => {
    const n = name.trim().slice(0, 30);
    if (api.social && n) {
      try {
        const p = await api.social.myProfile();
        if (p.display_name !== n) await api.social.updateProfile(n, p.visibility);
      } catch (err) {
        showError(err);
        return;
      }
    }
    setStep(1);
  };
  const last = SLIDES.length + 1;
  return (
    <div className="welcome" id="welcome" data-step={step}>
      <div className="welcome-dots" aria-hidden="true">{Array.from({ length: last + 1 }, (_, i) => <i key={i} className={i === step ? 'on' : ''} />)}</div>
      {step === 0 && (
        <div className="welcome-slide">
          <div className="welcome-icon">👋</div>
          <h2>Willkommen bei Level Up!</h2>
          <p>Schön, dass du da bist. Wie sollen dich deine Freunde in der App sehen?</p>
          <label className="welcome-name">Dein Name<input id="welcome-name" value={name} maxLength={30} disabled={!loaded} placeholder="z. B. Lukas" onChange={(e) => setName(e.target.value)} /></label>
          <button type="button" className="btn primary block" id="welcome-next" disabled={!loaded || !name.trim()} onClick={saveName}>Weiter</button>
        </div>
      )}
      {step >= 1 && step < last && (
        <div className="welcome-slide">
          <div className="welcome-icon">{SLIDES[step - 1].icon}</div>
          <h2>{SLIDES[step - 1].title}</h2>
          <p>{SLIDES[step - 1].text}</p>
          <button type="button" className="btn primary block" id="welcome-next" onClick={() => setStep(step + 1)}>Weiter</button>
        </div>
      )}
      {step === last && (
        <div className="welcome-slide">
          <div className="welcome-icon">🚀</div>
          <h2>Los geht’s!</h2>
          <p>Am besten startest du mit deinem Trainingsplan – das dauert etwa 2 Minuten. Auf der Startseite zeigt dir eine kurze Checkliste die nächsten Schritte.</p>
          <button type="button" className="btn primary block" id="welcome-plan" onClick={() => finish('#/trainingsplan')}>Trainingsplan erstellen</button>
          <button type="button" className="btn block" id="welcome-later" onClick={() => finish('#/')}>Später – erst umschauen</button>
        </div>
      )}
      {step > 0 && step < last && <button type="button" className="welcome-skip" id="welcome-skip" onClick={() => setStep(last)}>Überspringen</button>}
    </div>
  );
}
