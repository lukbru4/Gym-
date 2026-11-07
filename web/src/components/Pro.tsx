// Pro-Abo: Bezahlseite (Monat/Jahr) und Sperr-Hinweis. Echte Käufe folgen, sobald Apple- und Google-Konto eingerichtet sind.
import { useState } from 'react';
import { useApp } from '../app/context';
import { fmtEuro, PRO_PRICES, usePro, yearSavingPct } from '../lib/pro';
import { notify } from './Dialog';
import { Icon } from './Icon';

const BENEFITS = [
  'Persönlicher Trainingsplan aus deinen Antworten (Vorlagen + Wochenplan)',
  'Muskel-Auswertung: Körpergraph und Radar zeigen, wie stark du jede Muskelgruppe trainierst',
  'Ernährungscoach: persönlicher Kalorien- und Makroplan, Tagebuch, Wasser und 7-Tage-Verlauf',
  'Alle künftigen Pro-Funktionen',
];

export function Paywall({ reason }: { reason?: string }) {
  const { api } = useApp();
  const pro = usePro();
  const [tier, setTier] = useState<'year' | 'month'>('year');
  const buy = async () => {
    await notify('Der Kauf ist noch nicht freigeschaltet: Dafür müssen zuerst Apple- und Google-Konto eingerichtet werden. Sobald es soweit ist, kannst du hier Pro abonnieren.', { title: 'Bald verfügbar' });
  };
  if (pro.pro)
    return (
      <div className="card" id="pro-active">
        <h3>Pro aktiv ✓</h3>
        <p className="small">{pro.admin ? 'Als Admin hast du Pro immer.' : !pro.paid ? 'Im Moment ist alles freigeschaltet.' : pro.until ? `Dein Pro-Abo läuft bis ${new Date(pro.until).toLocaleDateString('de-DE')}.` : 'Dein Pro-Abo ist aktiv.'}</p>
      </div>
    );
  return (
    <div className="card paywall" id="paywall">
      {reason && <p className="notice" id="paywall-reason">{reason}</p>}
      <h3>Level Up Pro</h3>
      <ul className="paywall-benefits">
        {BENEFITS.map((b) => <li key={b}>{b}</li>)}
      </ul>
      <div className="paywall-tiers" role="radiogroup" aria-label="Abo wählen">
        <button type="button" role="radio" aria-checked={tier === 'year'} className={`paywall-tier${tier === 'year' ? ' on' : ''}`} data-tier="year" onClick={() => setTier('year')}>
          <strong>Jahr</strong>
          <span>{fmtEuro(PRO_PRICES.year)} / Jahr</span>
          <small>≈ {fmtEuro(PRO_PRICES.year / 12)} im Monat · spare {yearSavingPct()} %</small>
        </button>
        <button type="button" role="radio" aria-checked={tier === 'month'} className={`paywall-tier${tier === 'month' ? ' on' : ''}`} data-tier="month" onClick={() => setTier('month')}>
          <strong>Monat</strong>
          <span>{fmtEuro(PRO_PRICES.month)} / Monat</span>
          <small>jederzeit kündbar</small>
        </button>
      </div>
      {api.mode !== 'cloud' && <p className="muted small">Pro gibt es mit einem Konto. Melde dich dafür an.</p>}
      <button className="btn primary block" id="pro-buy" disabled={api.mode !== 'cloud'} onClick={buy}>
        Pro freischalten – {tier === 'year' ? `${fmtEuro(PRO_PRICES.year)} / Jahr` : `${fmtEuro(PRO_PRICES.month)} / Monat`}
      </button>
      <p className="muted small paywall-print">
        Das Abo verlängert sich automatisch um den gleichen Zeitraum, wenn du nicht mindestens 24 Stunden vor Ablauf kündigst. Bezahlung und
        Kündigung laufen über deinen Apple- bzw. Google-Account. Preise inkl. MwSt. (Entwurf – Texte werden vor dem Start rechtlich geprüft.)
      </p>
    </div>
  );
}

export function ProPage() {
  return (
    <>
      <h2>Pro</h2>
      <Paywall />
    </>
  );
}

const GATE_POINTS: [string, string, string][] = [
  ['target', 'Dein Trainingsplan', 'Aus deinen Antworten – mit Übungen, Sätzen und Wochenplan.'],
  ['info', 'Jede Übung erklärt', 'Anleitung und Muskeln zu jeder Übung, ideal zum Lernen.'],
  ['up', 'Fortschritt sehen', 'Bestwerte, Körpergraph, Maße und Fotos.'],
  ['people', 'Mit Freunden', 'Feed, Ranglisten und euer eigenes Gym.'],
];

/** Ganzseitige Bezahlseite (nach der Testphase oder zum Ansehen unter #/abo) */
export function ProGate({ daysLeft, onLogout }: { daysLeft?: number; onLogout?: () => void }) {
  const [tier, setTier] = useState<'year' | 'month'>('year');
  const [code, setCode] = useState(false);
  const soon = () => notify('Bezahlen über den App Store kommt bald. Sobald es geht, kannst du hier dein Abo starten – du bekommst dann eine Mitteilung.', { title: 'Kommt bald' });
  const price = tier === 'year' ? `${fmtEuro(PRO_PRICES.year)} pro Jahr` : `${fmtEuro(PRO_PRICES.month)} pro Monat`;
  return (
    <div className="pro-gate" id="pro-gate">
      <div className="pro-gate-head">
        <span className="pro-gate-badge">PRO</span>
        <h2>{daysLeft === 0 ? 'Deine Testphase ist vorbei' : 'Dein Trainingsplan wartet'}</h2>
        <p className="muted">{daysLeft === 0 ? 'Mit einem Abo geht es genau da weiter, wo du aufgehört hast – alle deine Daten bleiben.' : 'Alles, was du für dein Training brauchst, in einer App.'}</p>
      </div>
      <ul className="pro-gate-points">
        {GATE_POINTS.map(([icon, title, text]) => <li key={title}><Icon name={icon} size={30} /><span><strong>{title}</strong><small className="muted">{text}</small></span></li>)}
      </ul>
      <div className="pro-gate-tiers" role="radiogroup" aria-label="Abo wählen">
        <button type="button" role="radio" aria-checked={tier === 'year'} className={`pro-gate-tier${tier === 'year' ? ' on' : ''}`} data-tier="year" onClick={() => setTier('year')}>
          <span className="pro-gate-save">spare {yearSavingPct()} %</span>
          <strong>Jährlich</strong>
          <span className="pro-gate-price">{fmtEuro(PRO_PRICES.year)}</span>
          <small>nur {fmtEuro(PRO_PRICES.year / 12)} im Monat</small>
        </button>
        <button type="button" role="radio" aria-checked={tier === 'month'} className={`pro-gate-tier${tier === 'month' ? ' on' : ''}`} data-tier="month" onClick={() => setTier('month')}>
          <strong>Monatlich</strong>
          <span className="pro-gate-price">{fmtEuro(PRO_PRICES.month)}</span>
          <small>pro Monat</small>
        </button>
      </div>
      <p className="pro-gate-cancel"><Icon name="check" size={18} /> Jederzeit kündbar</p>
      <button type="button" className="btn primary block pro-gate-buy" id="gate-buy" onClick={soon}>Weiter – {price}</button>
      <div className="pro-gate-links">
        <button type="button" className="link-btn small" id="gate-restore" onClick={soon}>Kauf wiederherstellen</button>
        <button type="button" className="link-btn small" id="gate-code" onClick={() => setCode(!code)}>Code eingeben</button>
        {onLogout && <button type="button" className="link-btn small" id="gate-logout" onClick={onLogout}>Abmelden</button>}
      </div>
      {code && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); void notify('Dieser Code ist nicht gültig.', { title: 'Code' }); }}>
          <input id="gate-code-input" className="grow" maxLength={20} placeholder="Code" autoCapitalize="characters" />
          <button className="btn" type="submit">Einlösen</button>
        </form>
      )}
      <p className="muted small paywall-print">
        Das Abo verlängert sich automatisch, wenn du nicht mindestens 24 Stunden vor Ablauf kündigst. Bezahlung und Kündigung laufen über deinen Apple- bzw. Google-Account. Preise inkl. MwSt.
      </p>
    </div>
  );
}

export function AboPage() {
  return <ProGate />;
}
