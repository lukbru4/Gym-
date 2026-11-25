// Trainingszyklus: „Woche 3 von 6 · Aufbau“, in der letzten Woche „Entlastung“. Nur mit Trainingsplan.
import { useSyncExternalStore } from 'react';
import { getCycle, hasPlanWithoutCycle, startCycle } from '../lib/cycle';
import { loadQuiz, subscribeQuiz } from '../lib/plan';
import { todayISO } from '../lib/stats';
import { ask } from './Dialog';

export function CycleCard({ compact = false }: { compact?: boolean }) {
  useSyncExternalStore(subscribeQuiz, () => `${loadQuiz()?.savedAt ?? ''}|${todayISO()}`);
  const c = getCycle();
  if (!c) {
    if (!hasPlanWithoutCycle()) return null;
    return (
      <div className="card cycle" id="cycle-card">
        <h3>Trainingszyklus</h3>
        <p className="muted small">Mehrere Aufbauwochen, dann eine lockere Entlastungswoche – so kommst du langfristig weiter.</p>
        <button type="button" className="btn primary block" id="cycle-start" onClick={() => startCycle()}>Zyklus starten</button>
      </div>
    );
  }
  const restart = async () => {
    if (await ask('Der Zyklus beginnt wieder mit Woche 1.', { title: 'Zyklus neu starten?', ok: 'Neu starten' })) startCycle();
  };
  return (
    <div className={`card cycle${c.deload ? ' deload' : ''}`} id="cycle-card">
      <div className="block-head">
        <h3 id="cycle-title">Woche {c.week} von {c.total}</h3>
        <span className={`cycle-phase${c.deload ? ' deload' : ''}`} id="cycle-phase">{c.deload ? 'Entlastung' : 'Aufbau'}</span>
      </div>
      <div className="cycle-dots" aria-hidden="true">
        {Array.from({ length: c.total }, (_, i) => <i key={i} className={`${i + 1 < c.week ? 'past' : ''}${i + 1 === c.week ? ' now' : ''}${i + 1 === c.total ? ' last' : ''}`} />)}
      </div>
      {!compact && (
        <p className="muted small">
          {c.deload ? 'Diese Woche trainierst du bewusst leichter: etwa 10 % weniger Gewicht und ein Satz weniger je Übung. Danach startet Zyklus ' + (c.cycleNo + 1) + '.' : `Zyklus ${c.cycleNo} · noch ${c.total - c.week} ${c.total - c.week === 1 ? 'Woche' : 'Wochen'} bis zur Entlastungswoche.`}
        </p>
      )}
      {!compact && <button type="button" className="btn small-btn" id="cycle-restart" onClick={restart}>Zyklus neu starten</button>}
    </div>
  );
}
