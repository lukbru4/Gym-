// Leiste unten mit dem Pause-Timer (−15 / +15 / Weiter).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useHash } from '../app/router';
import { fmtDuration } from '../lib/format';
import { adjustRest, checkRestFinished, getRest, stopRest, subscribeRest } from '../lib/timer';

/** Nur im Training selbst; außerhalb zeigt die Trainings-Zeile die Pause an. */
export function RestTimer() {
  const onEditor = useHash().startsWith('#/neu');
  const rest = useSyncExternalStore(subscribeRest, getRest);
  const [, tick] = useState(0);
  useEffect(() => {
    document.body.classList.toggle('has-timer', Boolean(rest) && onEditor);
    if (!rest || !onEditor) return;
    const t = setInterval(() => {
      checkRestFinished();
      tick((n) => n + 1);
    }, 250);
    return () => clearInterval(t);
  }, [rest, onEditor]);
  if (!rest || !onEditor) return null;
  const left = Math.max(0, (rest.endAt - Date.now()) / 1000);
  return (
    <div id="rest-timer" className="rest-timer" role="timer" aria-live="off">
      <div className="rest-bar">
        <span style={{ width: `${Math.min(100, (left / rest.total) * 100)}%` }} />
      </div>
      <div className="rest-controls">
        <button className="btn small-btn" data-rest="minus" aria-label="15 Sekunden weniger" onClick={() => adjustRest(-15)}>−15</button>
        <div className="rest-center">
          <span className="small muted">Pause</span>
          <strong className="rest-time">{fmtDuration(Math.ceil(left))}</strong>
        </div>
        <button className="btn small-btn" data-rest="plus" aria-label="15 Sekunden mehr" onClick={() => adjustRest(15)}>+15</button>
        <button className="btn small-btn primary" data-rest="skip" onClick={stopRest}>Weiter</button>
      </div>
    </div>
  );
}
