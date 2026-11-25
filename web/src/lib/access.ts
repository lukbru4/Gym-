// Zugang zur App: gratis (Bestandskonto, Pro, Schranke aus), Testphase (7 Tage ab Ende der Fragerunde) oder gesperrt (Abo nötig).
export type Access = { state: 'free' } | { state: 'trial'; daysLeft: number } | { state: 'locked' };

export interface AccessInput {
  paywallOn: boolean;
  pro: boolean;
  /** Konto angelegt (ISO-Zeitpunkt), unbekannt = als Bestandskonto behandeln */
  accountCreated: string | null | undefined;
  /** Konten davor bleiben gratis (YYYY-MM-DD) */
  since: string;
  /** Beginn der Testphase (YYYY-MM-DD), null = Fragerunde noch nicht fertig */
  trialStart: string | null | undefined;
  trialDays: number;
  today: string;
}

const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export function accessState(i: AccessInput): Access {
  if (!i.paywallOn || i.pro) return { state: 'free' };
  if (!i.accountCreated || i.accountCreated.slice(0, 10) < i.since) return { state: 'free' };
  // Fragerunde noch nicht fertig: Testphase hat noch nicht begonnen
  if (!i.trialStart) return { state: 'trial', daysLeft: i.trialDays };
  const used = Math.floor((day(i.today) - day(i.trialStart)) / 864e5);
  const left = i.trialDays - Math.max(0, used);
  return left > 0 ? { state: 'trial', daysLeft: left } : { state: 'locked' };
}
