// Pro-Abo: Bezahlseite (Monat/Jahr) und Sperr-Hinweis. Echte Käufe folgen, sobald Apple- und Google-Konto eingerichtet sind.
import { useState } from 'react';
import { useApp } from '../app/context';
import { fmtEuro, FOOD_PLUS_PRICE, PRO_PRICES, usePro, yearSavingPct } from '../lib/pro';
import { notify } from './Dialog';

const BENEFITS = [
  'Persönlicher Trainingsplan aus deinen Antworten (Vorlagen + Wochenplan)',
  'Muskel-Auswertung: Körpergraph und Radar zeigen, wie stark du jede Muskelgruppe trainierst',
  'Kalorien tracken – per Foto (KI-Schätzung) oder manuell mit Suche und Barcode',
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
        <p className="small">{pro.admin ? 'Als Admin hast du Pro immer.' : pro.until ? `Dein Pro-Abo läuft bis ${new Date(pro.until).toLocaleDateString('de-DE')}.` : 'Dein Pro-Abo ist aktiv.'}</p>
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

/** Zusatz-Abo „Essen+“: Rezepte mit Anleitung. Gibt es nur zusätzlich zu Pro. */
export function FoodPlusPaywall() {
  const { api } = useApp();
  const pro = usePro();
  if (pro.food)
    return (
      <div className="card" id="foodplus-active">
        <h3>Essen+ aktiv ✓</h3>
        <p className="small">{pro.admin ? 'Als Admin hast du Essen+ immer.' : 'Dein Zusatz-Abo Essen+ ist aktiv.'}</p>
      </div>
    );
  if (!pro.pro) return <Paywall reason="Essen+ ist ein Zusatz zu Pro. Hol dir zuerst Pro." />;
  return (
    <div className="card paywall" id="foodplus">
      <h3>Essen+</h3>
      <ul className="paywall-benefits">
        <li>Rezepte mit Schritt-für-Schritt-Anleitung</li>
        <li>Vorschläge passend zu deinen Kalorien und deinem Eiweiß für heute</li>
        <li>Mit einem Tipp ins Essens-Tagebuch eintragen</li>
      </ul>
      <button className="btn primary block" id="foodplus-buy" disabled={api.mode !== 'cloud'} onClick={() => notify('Der Kauf ist noch nicht freigeschaltet: Dafür müssen zuerst Apple- und Google-Konto eingerichtet werden.', { title: 'Bald verfügbar' })}>
        Essen+ dazubuchen – {fmtEuro(FOOD_PLUS_PRICE)} / Monat
      </button>
      <p className="muted small paywall-print">
        Zusätzlich zu Pro. Das Abo verlängert sich monatlich automatisch, wenn du nicht mindestens 24 Stunden vor Ablauf kündigst; Bezahlung und Kündigung laufen über deinen
        Apple- bzw. Google-Account. Preis inkl. MwSt. (Entwurf).
      </p>
    </div>
  );
}
