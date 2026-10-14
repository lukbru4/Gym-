// Einmaliger Tipp beim ersten Öffnen einer Seite („So geht's“), mit „Verstanden“ wegklickbar.
import type { ReactNode } from 'react';
import { dismissTip, tipSeen, useOnboardingTick } from '../lib/onboarding';

export function FirstTip({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  useOnboardingTick();
  if (tipSeen(id)) return null;
  return (
    <div className="card first-tip" data-tip={id}>
      <div className="first-tip-head"><span aria-hidden="true">💡</span><strong>{title}</strong></div>
      <div className="small">{children}</div>
      <button type="button" className="btn small-btn" data-tip-ok={id} onClick={() => dismissTip(id)}>Verstanden</button>
    </div>
  );
}
