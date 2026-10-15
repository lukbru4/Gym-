// „Abenteuer“: Begleiter aus dem Ei, der durch dein Training wächst, mit dir um die Welt reist und Gipfel erklimmt.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Loading } from '../components/Bits';
import { PetArt } from '../components/PetArt';
import { ClimbArt, Postcard, WorldMap } from '../components/WorldArt';
import {
  cleanAdventure, companionFrom, GROUPS, HM_PER_KG, HM_PER_SET, KM_PER_CARDIO_KM, KM_PER_SET, loadAdventureLocal, loadSeen, MAX_PET_NAME,
  MOOD_TEXT, nextStopIndex, PET_NAMES, postcards, ROUTE, saveAdventureLocal, saveSeen, SPECIES, STAGES,
  type AdventureState, type Companion, type Journey, type Species, type Stop,
} from '../lib/adventure';
import { fmt } from '../lib/format';
import { isOffensive } from '../lib/moderation';
import { todayISO } from '../lib/stats';
import type { Exercise, ExerciseMap } from '../lib/types';

const GROUP_LABEL: Record<string, string> = { arme: 'Arme', brust: 'Brust', ruecken: 'Rücken', schultern: 'Schultern', bauch: 'Bauch', beine: 'Beine' };

export function Adventure() {
  const { api, user, showError, exerciseMap } = useApp();
  const game = useGame();
  const uid = user?.id ?? 'local';
  const [adv, setAdv] = useState<AdventureState | null | undefined>(undefined);
  const [reveal, setReveal] = useState<{ kind: 'stage'; stage: number } | { kind: 'card'; stop: Stop } | null>(null);
  const [friends, setFriends] = useState<{ name: string; journey: Journey }[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [world, setWorld] = useState(false);

  const comp: Companion | null = useMemo(
    () => (game.status === 'ok' ? companionFrom(game.data.workouts, game.data.sets, exerciseMap(), todayISO()) : null),
    [game.status === 'ok' ? game.data.sets.length : -1, game.status === 'ok' ? game.data.workouts.length : -1], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const cards = comp ? postcards(comp.journey) : [];

  // Begleiter laden: Konto (falls vorhanden), sonst Gerät
  useEffect(() => {
    let alive = true;
    const local = cleanAdventure(loadAdventureLocal(uid));
    if (!api.social) { setAdv(local); return; }
    api.social.myAdventure().then((r) => {
      const remote = cleanAdventure(r);
      if (remote) saveAdventureLocal(uid, remote); // für die Karte auf der Startseite
      if (alive) setAdv(remote ?? local);
    }, () => alive && setAdv(local));
    return () => { alive = false; };
  }, [api, uid]);

  // Freunde auf der Weltkarte (nur Freunde, die ihre Trainings zeigen)
  useEffect(() => {
    if (!api.social) return;
    let alive = true;
    void (async () => {
      try {
        const list = (await api.social!.friends()).filter((f) => f.status === 'friend').slice(0, 8);
        const out: { name: string; journey: Journey }[] = [];
        for (const f of list) {
          try {
            const d = await api.social!.friendProfile(f.user_id);
            const map: ExerciseMap = new Map(d.exercises.map((e: Exercise) => [e.id, e]));
            out.push({ name: f.display_name, journey: companionFrom(d.workouts, d.sets, map, todayISO()).journey });
          } catch {
            /* nicht sichtbar – überspringen */
          }
        }
        if (alive) setFriends(out);
      } catch {
        /* ohne Freunde */
      }
    })();
    return () => { alive = false; };
  }, [api]);

  // Neue Entwicklungsstufe oder neue Postkarte enthüllen
  useEffect(() => {
    if (!comp || !adv || reveal) return;
    const seen = loadSeen(uid);
    if (!seen) { saveSeen(uid, { stage: comp.stageIdx, cards: cards.length }); return; }
    if (seen.stage < comp.stageIdx) return setReveal({ kind: 'stage', stage: seen.stage + 1 });
    if (seen.cards < cards.length) return setReveal({ kind: 'card', stop: cards[seen.cards] });
  }, [comp, Boolean(adv), reveal]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (a: AdventureState) => {
    setAdv(a);
    saveAdventureLocal(uid, a);
    if (api.social) await api.social.setMyAdventure(a).catch((err) => showError(err));
  };
  const closeReveal = () => {
    const seen = loadSeen(uid) ?? { stage: 0, cards: 0 };
    if (reveal?.kind === 'stage') saveSeen(uid, { ...seen, stage: reveal.stage });
    if (reveal?.kind === 'card') saveSeen(uid, { ...seen, cards: seen.cards + 1 });
    setReveal(null);
  };

  if (!comp || adv === undefined) return <><h2>Abenteuer</h2><Loading /></>;
  if (!adv) return <Hatch onDone={(a) => { saveSeen(uid, { stage: comp.stageIdx, cards: cards.length }); void save(a); }} />;

  const j = comp.journey;
  const next = ROUTE[nextStopIndex(j)];
  const here = ROUTE[j.at];
  const species = SPECIES.find((s) => s.id === adv.species)!;
  const toNext = comp.next ? comp.next.min - comp.workouts : 0;
  const prevMin = comp.stage.min;
  const stageProgress = comp.next ? (comp.workouts - prevMin) / (comp.next.min - prevMin) : 1;
  return (
    <>
      <div className="adv-head"><h2>Abenteuer</h2><AdventureHelp /></div>
      <div className="card adv-pet" id="adv-pet">
        <PetArt species={adv.species} stageIdx={comp.stageIdx} shares={comp.shares} mood={comp.mood} progress={stageProgress} size={190} />
        <div className="adv-pet-info">
          {renaming ? (
            <form className="adv-rename" onSubmit={(e) => {
              e.preventDefault();
              const n = String(new FormData(e.currentTarget).get('name') ?? '').trim().slice(0, MAX_PET_NAME);
              if (!n) return;
              if (isOffensive(n)) return showError(new Error('Bitte wähle einen freundlichen Namen.'));
              setRenaming(false); void save({ ...adv, name: n });
            }}>
              <input name="name" id="adv-name-input" defaultValue={adv.name} maxLength={MAX_PET_NAME} autoFocus />
              <button type="submit" className="btn small-btn primary">OK</button>
            </form>
          ) : (
            <h3 id="adv-name">{adv.name} <button type="button" className="icon-btn" id="adv-rename" aria-label="Umbenennen" onClick={() => setRenaming(true)}>✏️</button></h3>
          )}
          <p className="muted small" id="adv-stage">{species.name} · {comp.stage.name} · {comp.workouts} Trainings</p>
          <p className="small" id="adv-mood">{comp.stageIdx === 0 ? 'Das Ei wackelt … trainiere, damit es schlüpft!' : `${adv.name} ${MOOD_TEXT[comp.mood]}`}</p>
          {comp.next && (
            <>
              <div className="gym-bar"><i style={{ width: `${Math.round(stageProgress * 100)}%` }} /></div>
              <p className="muted small" id="adv-next">Noch {toNext} {toNext === 1 ? 'Training' : 'Trainings'} bis {comp.stageIdx === 0 ? 'zum Schlüpfen' : `„${comp.next.name}“`}</p>
            </>
          )}
        </div>
        {comp.stageIdx > 0 && (
          <div className="adv-muscles" id="adv-muscles">
            {GROUPS.map((g) => (
              <div key={g} className="adv-muscle"><span>{GROUP_LABEL[g]}</span><div className="gym-bar"><i style={{ width: `${Math.round(comp.shares[g] * 100)}%` }} /></div></div>
            ))}
            <p className="muted small">Muskeln wachsen dort, wo du in den letzten 30 Tagen trainiert hast.</p>
          </div>
        )}
      </div>

      <h3>Weltreise {j.round > 1 && <span className="muted small">· Runde {j.round}</span>}</h3>
      {j.climb ? (
        <div className="card adv-climb" id="adv-climb">
          <ClimbArt stop={here} done={j.climb.done} need={j.climb.need} />
          <p><strong>Aufstieg {here.name}</strong> · {fmt(Math.round(j.climb.done), 0)} von {fmt(j.climb.need, 0)} Höhenmetern</p>
          <div className="gym-bar"><i style={{ width: `${Math.round((j.climb.done / j.climb.need) * 100)}%` }} /></div>
          <p className="muted small">Am Berg zählen bewegte Kilos: 100 kg = {Math.round(100 * HM_PER_KG)} Höhenmeter, jeder Satz +{HM_PER_SET} m. Erst am Gipfel geht die Reise weiter.</p>
        </div>
      ) : (
        <div className="card adv-trip" id="adv-trip">
          <WorldMap journey={j} friends={friends} zoom={!world} />
          <button type="button" className="btn small-btn adv-zoom" id="adv-zoom" onClick={() => setWorld((x) => !x)}>{world ? '🔍 Näher ran' : '🌍 Ganze Welt'}</button>
          <p id="adv-leg"><strong>{here.name.replace(' (Heimkehr)', '')} → {next.name}</strong> · {fmt(Math.round(j.legDone), 0)} von {fmt(j.legKm, 0)} km {next.peak && '⛰️'}</p>
          <div className="gym-bar"><i style={{ width: `${Math.round((j.legDone / j.legKm) * 100)}%` }} /></div>
          <p className="muted small">1 Satz = {KM_PER_SET} km, 1 km Cardio = {KM_PER_CARDIO_KM} km Reise. Insgesamt {fmt(Math.round(j.totalKm), 0)} km unterwegs.{friends.length > 0 && ' Blaue Punkte: deine Freunde.'}</p>
        </div>
      )}

      <h3>Postkarten-Album <span className="muted small">({cards.length} / {ROUTE.length - 1})</span></h3>
      <div className="adv-album" id="adv-album">
        {ROUTE.slice(1).map((s) => cards.some((c) => c.id === s.id)
          ? <Postcard key={s.id} stop={s} small />
          : <div key={s.id} className="postcard-locked"><span>{s.peak ? '⛰️' : '✉️'}</span><small>{s.name.replace(' (Heimkehr)', '')}</small></div>)}
      </div>

      {reveal && (
        <div className="dialog-backdrop">
          <div className="dialog adv-reveal" id="adv-reveal" role="dialog" aria-modal="true">
            {reveal.kind === 'stage' ? (
              <>
                <h3>{reveal.stage === 1 ? 'Geschlüpft! 🐣' : 'Entwicklung! ✨'}</h3>
                <div className="adv-reveal-art"><PetArt species={adv.species} stageIdx={reveal.stage} shares={comp.shares} mood="froh" size={200} /></div>
                <p>{adv.name} ist jetzt <strong id="adv-reveal-name">{STAGES[reveal.stage].name}</strong>.</p>
              </>
            ) : (
              <>
                <h3>{reveal.stop.peak ? 'Gipfel erreicht! 🚩' : 'Neue Postkarte! ✉️'}</h3>
                <Postcard stop={reveal.stop} />
                <p><strong id="adv-reveal-name">{reveal.stop.name}</strong>{reveal.stop.peak ? ` · ${fmt(reveal.stop.peak.to, 0)} m` : ` · ${reveal.stop.country}`}</p>
              </>
            )}
            <button type="button" className="btn primary block" id="adv-reveal-ok" onClick={closeReveal}>Weiter</button>
          </div>
        </div>
      )}
    </>
  );
}

/** „So funktioniert's“: die Regeln in einfachen Worten (Zahlen direkt aus lib/adventure) */
export function AdventureHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn small-btn adv-help-btn" id="adv-help" onClick={() => setOpen(true)}>ℹ️ So funktioniert's</button>
      {open && (
        <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="dialog adv-help" id="adv-help-dialog" role="dialog" aria-modal="true" aria-label="So funktioniert das Abenteuer">
            <h3>So funktioniert's</h3>
            <h4>🥚 Dein Begleiter wächst mit deinen Trainings</h4>
            <p className="small">Jedes Training mit mindestens einem echten Satz zählt als <strong>1 Schritt</strong> (Aufwärmsätze zählen nicht). Wie schwer, ist egal. Er wird nie wieder kleiner.</p>
            <table className="table adv-help-table">
              <thead><tr><th>Trainings</th><th>Stufe</th></tr></thead>
              <tbody>{STAGES.map((st, i) => <tr key={st.id}><td>{i + 1 < STAGES.length ? (i === 0 ? `0–${STAGES[1].min - 1}` : `ab ${st.min}`) : `ab ${st.min}`}</td><td>{st.name}{i === 1 ? ' – schlüpft 🐣' : i === 4 ? ' 👑' : ''}</td></tr>)}</tbody>
            </table>
            <h4>💪 Muskeln</h4>
            <p className="small">Die App zählt deine Sätze der letzten 30 Tage pro Muskelgruppe. Wo du am meisten trainierst, bekommt er die dicksten Muskeln – je höher die Stufe, desto deutlicher.</p>
            <h4>😊 Stimmung</h4>
            <p className="small">0–2 Tage seit dem letzten Training: fröhlich · 3–6 Tage: müde · ab 7 Tagen: traurig. Nur das Aussehen – keine Strafe, nichts geht verloren.</p>
            <h4>🌍 Weltreise</h4>
            <p className="small">1 Satz = {KM_PER_SET} km, 1 km Cardio = {KM_PER_CARDIO_KM} km. Die Reise läuft schon, solange er noch im Ei ist. In jeder Stadt gibt es eine Postkarte fürs Album.</p>
            <h4>⛰️ Gipfel</h4>
            <p className="small">Am Berg zählen Höhenmeter statt Kilometer: jeder Satz {HM_PER_SET} m, dazu {Math.round(100 * HM_PER_KG)} m je 100 bewegte kg. Erst auf dem Gipfel gibt es die Postkarte – dann geht die Reise weiter.</p>
            <p className="muted small">Alles wird aus deinen echten Trainings berechnet. Gespeichert werden nur Art und Name deines Begleiters.</p>
            <button type="button" className="btn primary block" id="adv-help-close" onClick={() => setOpen(false)}>Verstanden</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Erster Besuch: Ei aussuchen und Namen geben */
function Hatch({ onDone }: { onDone: (a: AdventureState) => void }) {
  const { showError } = useApp();
  const [species, setSpecies] = useState<Species>('drache');
  const [name, setName] = useState('');
  return (
    <>
      <div className="adv-head"><h2>Abenteuer</h2><AdventureHelp /></div>
      <p>Such dir ein Ei aus! Daraus schlüpft dein <strong>Begleiter</strong>: Er wird mit jedem Training stärker, bekommt Muskeln dort, wo du trainierst, und reist mit dir um die Welt – bis auf die höchsten Gipfel.</p>
      <div className="adv-eggs" id="adv-eggs" role="radiogroup" aria-label="Ei auswählen">
        {SPECIES.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={species === s.id} className={`adv-egg${species === s.id ? ' active' : ''}`} data-species={s.id} onClick={() => { setSpecies(s.id); }}>
            <PetArt species={s.id} stageIdx={0} shares={{ arme: 0, brust: 0, ruecken: 0, schultern: 0, bauch: 0, beine: 0 }} size={90} />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
      <label className="adv-name-edit">Name<input id="adv-name-new" value={name} maxLength={MAX_PET_NAME} placeholder={`z. B. ${PET_NAMES[species][0]}`} onChange={(e) => setName(e.target.value)} /></label>
      <div className="gym-ideas">
        <span className="muted small">Ideen:</span>
        {PET_NAMES[species].slice(0, 6).map((n) => <button key={n} type="button" className={`chip${name === n ? ' active' : ''}`} data-pet-name={n} onClick={() => setName(n)}>{n}</button>)}
      </div>
      <button type="button" className="btn primary block" id="adv-start" onClick={() => {
        const n = name.trim() || PET_NAMES[species][0];
        if (isOffensive(n)) return showError(new Error('Bitte wähle einen freundlichen Namen.'));
        onDone({ species, name: n });
      }}>Dieses Ei nehmen</button>
    </>
  );
}

/** Kleine Karte für die Startseite */
export function AdventureCard() {
  const { user, exerciseMap } = useApp();
  const game = useGame();
  const adv = cleanAdventure(loadAdventureLocal(user?.id ?? 'local'));
  if (game.status !== 'ok') return null;
  const comp = companionFrom(game.data.workouts, game.data.sets, exerciseMap(), todayISO());
  const j = comp.journey, next = ROUTE[nextStopIndex(j)];
  return (
    <a className="card adv-mini" id="adv-mini" href="#/abenteuer">
      <div className="block-head"><h3>{adv ? adv.name : 'Abenteuer'}</h3><span className="muted small">{adv ? comp.stage.name : 'Neu'}</span></div>
      <div className="adv-mini-row">
        {adv ? <PetArt species={adv.species} stageIdx={comp.stageIdx} shares={comp.shares} mood={comp.mood} size={72} /> : <span className="adv-mini-egg" aria-hidden="true">🥚</span>}
        <span className="muted small">{!adv ? 'Such dir ein Ei aus – dein Begleiter wächst mit deinem Training und reist um die Welt.'
          : j.climb ? `Aufstieg ${ROUTE[j.at].name}: ${fmt(Math.round(j.climb.done), 0)} / ${fmt(j.climb.need, 0)} Hm`
            : `Unterwegs nach ${next.name}: ${fmt(Math.round(j.legDone), 0)} / ${fmt(j.legKm, 0)} km`}</span>
      </div>
    </a>
  );
}
