// Mitteilungen: Anfeuern, Kommentare, Freundschaften und Challenges der letzten 30 Tage.
import { useEffect } from 'react';
import { useApp } from '../app/context';
import { ago, describe, markAllSeen, refreshNotifications, useNotifications } from '../lib/notifications';

export function Notifications() {
  const { api } = useApp();
  const list = useNotifications(api.social ?? null);
  // Beim Öffnen: neu laden, kurz danach als gelesen markieren (neue bleiben hervorgehoben, bis man die Seite verlässt)
  useEffect(() => {
    void refreshNotifications();
    const t = window.setTimeout(() => void markAllSeen(), 1500);
    return () => window.clearTimeout(t);
  }, []);
  if (!api.social) return (<><h2>Mitteilungen</h2><div className="card"><p className="muted">Mitteilungen gibt es mit Konto und Freunden.</p></div></>);
  return (
    <>
      <h2>Mitteilungen</h2>
      {list === null ? (
        <div className="card"><p className="muted">Lädt …</p></div>
      ) : !list.length ? (
        <div className="card" id="notif-empty"><p className="muted">Noch nichts Neues. Hier siehst du, wenn Freunde dich anfeuern, kommentieren, anfragen oder herausfordern.</p><a className="btn block" href="#/freunde">Zu Freunde</a></div>
      ) : (
        <ul className="notif-list" id="notif-list">
          {list.map((n, i) => {
            const d = describe(n);
            return (
              <li key={`${n.kind}-${n.at}-${i}`} className={n.unread ? 'unread' : ''} data-kind={n.kind}>
                <a href={d.href}>
                  <span className="notif-icon" aria-hidden="true">{d.icon}</span>
                  <span className="notif-text">{d.text}<small>{ago(n.at)}</small></span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">Benachrichtigungen aufs Handy, wenn die App zu ist, kommen mit dem App-Store-Start. Erinnerungen ans Training stellst du unter <a href="#/konto/erinnerungen">Einstellungen → Erinnerungen</a> ein.</p>
    </>
  );
}
