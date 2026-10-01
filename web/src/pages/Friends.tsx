// Freunde: eigener Code/Einladungslink, Freund hinzufügen, Anfragen, Freundesliste, Rangliste,
// Profil eines Freundes, Feed der Freunde (auf Home) und Einladungslinks (#/freunde/add/CODE).
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { computeGame } from '../app/game';
import { navigate, redirect } from '../app/router';
import { useAsync } from '../app/useAsync';
import { Avatar } from '../components/Avatar';
import { BodyGraph } from '../components/BodyGraph';
import { LoadError, Loading } from '../components/Bits';
import { Flame } from '../components/Icons';
import { Leaderboards } from '../components/Leaderboards';
import { RankBadge } from '../components/RankBadge';
import { inviteLink, requestMessage, type FeedItem, type Friend, type Social } from '../data/social';
import { datedSets } from '../lib/editor';
import { fmt, fmtDate, plural } from '../lib/format';
import { strengthLevels } from '../lib/muscles';
import { personalRecords, todayISO } from '../lib/stats';
import type { ExerciseMap } from '../lib/types';
import { HomeTabs } from './Home';

/** Hinweis im lokalen Modus: Freunde brauchen ein Konto */
function NeedsAccount() {
  return (
    <div className="card">
      <h3>Freunde brauchen ein Konto</h3>
      <p className="muted">Du nutzt gerade den lokalen Modus ohne Konto. Freunde, Feed und Rangliste gibt es nur mit Anmeldung.</p>
    </div>
  );
}

/** Fehler der Freunde-Funktionen: fehlt das SQL in Supabase, erklären statt Fachchinesisch */
function SocialError({ error }: { error: Error }) {
  const code = (error as Error & { code?: string }).code ?? '';
  const missing = code === 'PGRST202' || code === '42883' || /could not find the function|does not exist|schema cache/i.test(error.message);
  if (!missing) return <LoadError error={error} />;
  return (
    <div className="card" id="social-setup-needed">
      <h3>Freunde sind noch nicht eingerichtet</h3>
      <p>Für Freunde, Feed und Rangliste braucht deine Supabase-Datenbank noch ein Update.</p>
      <ol className="small">
        <li>Öffne <a href="./supabase/einrichten.html">die Einrichtungsseite</a> und tippe auf „SQL kopieren“.</li>
        <li>Supabase → SQL Editor → neue Abfrage → einfügen → Run (bei der Warnung „Run query“).</li>
        <li>Danach diese Seite neu öffnen.</li>
      </ol>
    </div>
  );
}

function useSocial(): Social | null {
  return useApp().api.social ?? null;
}

async function share(code: string, showError: (e: unknown) => void, setNote: (s: string) => void) {
  const url = inviteLink(code);
  const text = `Trainiere mit mir in Level Up! Mein Freundescode: ${code}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Level Up', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setNote('Link kopiert – schick ihn deinen Freunden.');
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return; // Teilen abgebrochen
    showError(err);
  }
}

export function Friends() {
  const social = useSocial();
  const { showError, dataVersion, dataChanged } = useApp();
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const data = useAsync(
    async () => (social ? Promise.all([social.myProfile(), social.friends(), social.leaderboard()]) : null),
    [social, dataVersion],
  );
  if (!social) return (<><h2>Freunde</h2><NeedsAccount /></>);
  if (data.status === 'loading') return <Loading />;
  if (data.status === 'error') return (<><h2>Freunde</h2><SocialError error={data.error} /></>);
  const [profile, friends, board] = data.data!;
  const incoming = friends.filter((f) => f.status === 'incoming');
  const outgoing = friends.filter((f) => f.status === 'outgoing');
  const accepted = friends.filter((f) => f.status === 'friend');

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      dataChanged();
    } catch (err) {
      showError(err);
    }
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      setNote(requestMessage(await social.sendRequest(code)));
      setCode('');
      dataChanged();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2>Freunde</h2>
      <div className="card invite-card">
        <h3>Dein Freundescode</h3>
        <p className="friend-code" aria-label="Freundescode">{profile.friend_code}</p>
        <button className="btn primary block" id="share-invite" onClick={() => share(profile.friend_code, showError, setNote)}>
          Einladungslink teilen
        </button>
        <form className="add-friend" onSubmit={add}>
          <label htmlFor="friend-code-input">Code eines Freundes</label>
          <div className="row pair">
            <input
              id="friend-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="z. B. K7M2Q9XA"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <button className="btn" type="submit" disabled={busy}>Hinzufügen</button>
          </div>
        </form>
        {note && <p className="notice small" id="friend-note">{note}</p>}
      </div>

      {incoming.length > 0 && (
        <div className="card">
          <h3>Anfragen</h3>
          <ul className="friend-list">
            {incoming.map((f) => (
              <li key={f.user_id}>
                <strong>{f.display_name}</strong>
                <span className="friend-actions">
                  <button className="btn small-btn primary" onClick={() => act(() => social.respond(f.user_id, true))}>Annehmen</button>
                  <button className="btn small-btn" onClick={() => act(() => social.respond(f.user_id, false))}>Ablehnen</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Leaderboards social={social} total={board} />

      <div className="card">
        <h3>Deine Freunde</h3>
        {accepted.length ? (
          <ul className="friend-list">
            {accepted.map((f) => (
              <li key={f.user_id}>
                <a href={`#/freunde/profil/${f.user_id}`}><strong>{f.display_name}</strong></a>
                <span className="muted small">seit {fmtDate(f.since.slice(0, 10), false)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Noch keine Freunde. Teile deinen Code oder gib den Code eines Freundes ein.</p>
        )}
        {outgoing.length > 0 && (
          <>
            <h4 className="muted small">Gesendete Anfragen</h4>
            <ul className="friend-list">
              {outgoing.map((f) => (
                <li key={f.user_id}>
                  <span>{f.display_name}</span>
                  <button className="link small" onClick={() => act(() => social.removeFriend(f.user_id))}>Zurückziehen</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

/** #/freunde/add/CODE – Einladungslink: Anfrage automatisch senden */
export function AcceptInvite({ code }: { code: string }) {
  const social = useSocial();
  const { showError } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (!social || sent.current) return;
    sent.current = true;
    social.sendRequest(code).then((r) => setMessage(requestMessage(r)), (err) => {
      showError(err);
      setMessage('Die Anfrage konnte nicht gesendet werden.');
    });
  }, [social, code, showError]);
  if (!social) return (<><h2>Einladung</h2><NeedsAccount /></>);
  return (
    <>
      <h2>Einladung</h2>
      <div className="card">
        <p id="invite-result">{message ?? 'Anfrage wird gesendet …'}</p>
        <a className="btn primary block" href="#/freunde">Zu Freunde</a>
      </div>
    </>
  );
}

function FeedCard({ item, social, onChange }: { item: FeedItem; social: Social; onChange: (i: FeedItem) => void }) {
  const { showError } = useApp();
  const like = async () => {
    try {
      const liked = await social.toggleLike(item.workout_id);
      onChange({ ...item, liked, likes: item.likes + (liked ? 1 : -1) });
    } catch (err) {
      showError(err);
    }
  };
  return (
    <div className="card feed-item">
      <div className="block-head">
        <a href={`#/freunde/profil/${item.user_id}`}><strong>{item.display_name}</strong></a>
        <span className="muted small">{fmtDate(item.date)}</span>
      </div>
      <p className="small">
        hat trainiert: {plural(item.sets, 'Arbeitssatz', 'Arbeitssätze')}
        {Number(item.volume) > 0 ? ` · ${fmt(item.volume, 0)} kg Volumen` : ''}
      </p>
      {item.exercises?.length ? <p className="muted small">{item.exercises.join(' · ')}</p> : null}
      <button className={`btn small-btn cheer ${item.liked ? 'on' : ''}`} aria-pressed={item.liked} onClick={like}>
        <Flame /> {item.liked ? 'Angefeuert' : 'Anfeuern'}{item.likes ? ` · ${item.likes}` : ''}
      </button>
    </div>
  );
}

export function FriendsFeed() {
  const social = useSocial();
  const { dataVersion } = useApp();
  const feed = useAsync(async () => (social ? social.feed() : []), [social, dataVersion]);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  useEffect(() => {
    if (feed.status === 'ok') setItems(feed.data);
  }, [feed]);
  let body;
  if (!social) body = <NeedsAccount />;
  else if (feed.status === 'error') body = <SocialError error={feed.error} />;
  else if (!items) body = <Loading />;
  else if (!items.length)
    body = (
      <div className="card empty-feed">
        <div className="empty-icon" aria-hidden="true">👥</div>
        <h3>Noch nichts von deinen Freunden</h3>
        <p className="muted">Sobald deine Freunde trainieren, erscheinen ihre Trainings hier – und du kannst sie anfeuern.</p>
        <a className="btn block" href="#/freunde">Freunde einladen</a>
      </div>
    );
  else
    body = items.map((it) => (
      <FeedCard key={it.workout_id} item={it} social={social} onChange={(n) => setItems((list) => list!.map((x) => (x.workout_id === n.workout_id ? n : x)))} />
    ));
  return (
    <>
      <HomeTabs active="friends" />
      {body}
    </>
  );
}

/** #/freunde/profil/:id – Profil eines Freundes */
export function FriendProfile({ userId }: { userId: string }) {
  const social = useSocial();
  const { showError, dataChanged } = useApp();
  const data = useAsync(async () => (social ? social.friendProfile(userId) : null), [social, userId]);
  const [friendship, setFriendship] = useState<Friend | null>(null);
  useEffect(() => {
    social?.friends().then((list) => setFriendship(list.find((f) => f.user_id === userId) ?? null), () => {});
  }, [social, userId]);
  if (!social) return <NeedsAccount />;
  if (data.status === 'loading') return <Loading />;
  if (data.status === 'error') return <LoadError error={new Error('Dieses Profil ist nicht sichtbar.')} />;
  const d = data.data!;
  const exMap: ExerciseMap = new Map(d.exercises.map((e) => [e.id, e]));
  const g = computeGame(d.workouts, d.sets, exMap);
  const dated = datedSets(d.workouts, d.sets);
  const levels = strengthLevels(dated, exMap, todayISO());
  const records = personalRecords(dated, exMap).filter((r) => r.type === 'strength' && r.bestE1RM);
  const name = d.profile.display_name;

  const remove = async () => {
    if (!confirm(`${name} als Freund entfernen?`)) return;
    try {
      await social.removeFriend(userId);
      dataChanged();
      navigate('#/freunde');
    } catch (err) {
      showError(err);
    }
  };
  const block = async () => {
    if (!confirm(`${name} blockieren? Ihr seid dann keine Freunde mehr und ${name} kann dir keine Anfragen mehr schicken.`)) return;
    try {
      await social.block(userId);
      dataChanged();
      redirect('#/freunde');
    } catch (err) {
      showError(err);
    }
  };
  const report = async () => {
    const reason = prompt(`Warum möchtest du ${name} melden? (z. B. beleidigender Name)`);
    if (!reason?.trim()) return;
    try {
      await social.report(userId, reason);
      alert('Danke! Die Meldung wurde gespeichert und wird geprüft.');
    } catch (err) {
      showError(err);
    }
  };

  return (
    <>
      <p><a href="#/freunde" className="link">← Freunde</a></p>
      <div className="profile-hero">
        <div className="profile-top">
          <h2>{name}</h2>
          <RankBadge rank={g.overall} size={72} />
        </div>
        <Avatar level={g.player.level} />
        <p className="muted small center">
          Level {g.player.level} · {g.overall.label} · Serie {g.streak} {g.streak === 1 ? 'Woche' : 'Wochen'} · {plural(g.workouts.length, 'Training', 'Trainings')}
        </p>
      </div>
      <div className="card">
        <BodyGraph levels={levels} />
      </div>
      {records.length > 0 && (
        <div className="card scroll-x">
          <h3>Bestwerte</h3>
          <table className="table">
            <thead><tr><th>Übung</th><th>Gesch. 1RM</th><th>Schwerster Satz</th></tr></thead>
            <tbody>
              {records.map((r) => r.type === 'strength' && (
                <tr key={r.exercise}>
                  <td>{r.exercise}</td>
                  <td>{fmt(r.bestE1RM!.value)} kg</td>
                  <td>{r.heaviest ? `${fmt(r.heaviest.weight, 2)} kg × ${r.heaviest.reps}` : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        {friendship?.status === 'friend' && <button className="btn block" onClick={remove}>Als Freund entfernen</button>}
        <div className="row">
          <button className="btn danger grow" id="block-user" onClick={block}>Blockieren</button>
          <button className="btn grow" id="report-user" onClick={report}>Melden</button>
        </div>
      </div>
    </>
  );
}
