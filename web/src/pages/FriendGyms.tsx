// Übersicht „Gyms der Freunde“: Name, Größe, Geräte, wie oft angefeuert – antippen öffnet das Gym im Freundesprofil.
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { LoadError, Loading } from '../components/Bits';
import { cleanGym, GYM_ITEMS, migrateGym, roomFor } from '../lib/gym';

export function FriendGyms() {
  const { api, dataVersion } = useApp();
  const list = useAsync(() => (api.social ? api.social.friendGyms() : Promise.resolve([])), [api, dataVersion]);
  return (
    <>
      <h2>Gyms der Freunde</h2>
      {!api.social && <p className="notice small" id="gyms-no-account">Gyms von Freunden gibt es mit Konto.</p>}
      {list.status === 'loading' && <Loading />}
      {list.status === 'error' && <LoadError error={list.error} />}
      {list.status === 'ok' && api.social && (list.data.length ? (
        <ul className="friend-gyms" id="friend-gyms">
          {list.data.map((f) => {
            const g = f.gym ? cleanGym(migrateGym(f.gym, true, 0), new Set()) : null;
            const tier = roomFor(g?.build ?? []);
            const machines = g ? g.objects.filter((o) => GYM_ITEMS.some((m) => m.id === o.id)).length : 0;
            return (
              <li key={f.user_id}>
                <a className="card friend-gym-row" href={`#/freunde/profil/${f.user_id}`} data-friend-gym={f.user_id}>
                  <span className="friend-gym-icon" aria-hidden="true">🏋️</span>
                  <span className="friend-gym-text"><strong>{g?.name || `Gym von ${f.display_name}`}</strong>
                    <small className="muted">{f.display_name} · {g ? `${tier.name} · ${machines} ${machines === 1 ? 'Gerät' : 'Geräte'}` : 'noch nicht eingerichtet'}</small></span>
                  <span className="friend-gym-cheers small">🔥 {f.cheers}{f.cheered_today ? ' ✓' : ''}</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : <p className="muted small" id="gyms-empty">Noch keine Freunde. Lade sie unter <a href="#/freunde">Freunde</a> ein – dann kannst du ihre Gyms besuchen.</p>)}
    </>
  );
}
