// „Mein Gym“: Steine mit Trainingssätzen zerschlagen, Geräte finden und das eigene Gym frei gestalten –
// mit Deko & Schildern aus dem Laden, Belohnungs-Kisten, Ausbaustufen (bis zur Empore) und eigenem Namen.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Loading } from '../components/Bits';
import { ask, notify } from '../components/Dialog';
import { DecoArt } from '../components/DecoArt';
import { GymRoom, nameOf } from '../components/GymRoom';
import { MachineArt, Stone, StoneWithMachine } from '../components/MachineArt';
import { setCosmetics, useCosmetics } from '../lib/cosmetics';
import { fmt } from '../lib/format';
import {
  chestsEarned, chestsOpened, cleanGym, DECO_BY_ID, DECO_SHOP, GYM_ITEMS, gymProgress, hitsFrom, loadGymLocal, MAX_NAME, nextTier,
  placeNew, saveGymLocal, seenCount, setChestsOpened, setSeenCount, tierFor, type DecoItem, type GymItem, type GymState,
} from '../lib/gym';
import { isOffensive } from '../lib/moderation';

const RARITY_LABEL: Record<string, string> = { 'gewöhnlich': 'Gewöhnlich', 'selten': 'Selten', 'episch': 'Episch', 'legendär': 'Legendär' };

export function Gym() {
  const { api, user, showError, dataChanged } = useApp();
  const game = useGame();
  const cosmetics = useCosmetics();
  const uid = user?.id ?? 'local';
  const prog = game.status === 'ok' ? gymProgress(hitsFrom(game.data.sets)) : null;
  const broken = prog?.unlocked.length ?? 0;
  const tier = tierFor(broken);
  const owned = useMemo(() => new Set([
    ...(prog?.unlocked.map((i) => i.id) ?? []),
    ...cosmetics.owned.filter((id) => DECO_BY_ID.has(id)),
    ...chestsEarned(broken).map((c) => c.id),
  ]), [prog?.unlocked.length, cosmetics.owned, broken]); // eslint-disable-line react-hooks/exhaustive-deps
  const [gym, setGym] = useState<GymState | null>(null);
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ kind: 'machine'; item: GymItem } | { kind: 'chest'; item: DecoItem } | null>(null);
  const [breaking, setBreaking] = useState(false);
  const [busy, setBusy] = useState('');

  // Aufstellung laden: Konto (falls vorhanden), sonst Gerät
  useEffect(() => {
    if (!prog) return;
    let alive = true;
    const local = loadGymLocal(uid);
    if (!api.social) { setGym(cleanGym(local, owned, tier)); return; }
    api.social.myGym().then((remote) => { if (alive) setGym(cleanGym(remote ?? local, owned, tier)); }, () => { if (alive) setGym(cleanGym(local, owned, tier)); });
    return () => { alive = false; };
  }, [Boolean(prog), api]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (next: GymState) => {
    setGym(next);
    saveGymLocal(uid, next);
    if (api.social) await api.social.setMyGym(next).catch((err) => showError(err));
  };

  // Neu zerbrochene Steine und neue Kisten nacheinander enthüllen
  useEffect(() => {
    if (!prog || !gym || reveal) return;
    const seen = seenCount(uid);
    if (seen === null) {
      // erster Besuch: alles Gefundene ohne Animation aufstellen
      let next = gym;
      for (const it of prog.unlocked) if (!next.objects.some((o) => o.id === it.id) && next.objects.length < tier.max) next = placeNew(next, it.id);
      if (next !== gym) void save(next);
      setSeenCount(uid, broken);
      return;
    }
    if (seen < broken) { setReveal({ kind: 'machine', item: prog.unlocked[seen] }); setBreaking(true); return; }
    const chests = chestsEarned(broken), opened = chestsOpened(uid);
    if (opened === null) { setChestsOpened(uid, chests.length); return; }
    if (opened < chests.length) { setReveal({ kind: 'chest', item: chests[opened] }); setBreaking(true); }
  }, [broken, Boolean(gym), reveal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!reveal) return;
    const t = window.setTimeout(() => setBreaking(false), 1100);
    return () => window.clearTimeout(t);
  }, [reveal]);

  if (!prog || !gym) return <><h2>Mein Gym</h2><Loading /></>;
  const placed = new Set(gym.objects.map((o) => o.id));
  const storage = [...owned].filter((id) => !placed.has(id));
  const full = gym.objects.length >= tier.max;
  const put = (id: string) => {
    if (full) return void notify(`In deine ${tier.name} passen höchstens ${tier.max} Dinge. Räum etwas ins Lager oder bau dein Gym aus.`, { title: 'Kein Platz mehr' });
    const next = placeNew(gym, id);
    if (edit) setGym(next); else void save(next);
  };
  const finishReveal = (place: boolean) => {
    if (!reveal) return;
    if (reveal.kind === 'machine') setSeenCount(uid, (seenCount(uid) ?? 0) + 1);
    else setChestsOpened(uid, (chestsOpened(uid) ?? 0) + 1);
    if (place && !full) void save(placeNew(gym, reveal.item.id));
    setReveal(null);
  };
  const buy = async (d: DecoItem) => {
    if (!api.social) return;
    if (!(await ask(`„${d.name}“ für ${fmt(d.price, 0)} Credits kaufen?`, { title: 'Kaufen?', ok: 'Kaufen' }))) return;
    setBusy(d.id);
    try {
      await api.social.buy(d.id);
      setCosmetics(await api.social.myShop());
      dataChanged();
    } catch (err) {
      showError(err);
    } finally {
      setBusy('');
    }
  };
  const nt = nextTier(broken);
  const s = prog.stone;
  const selObj = sel ? gym.objects.find((o) => o.id === sel) : undefined;
  const balance = game.status === 'ok' ? game.data.balance : 0;
  return (
    <>
      <h2>{gym.name || 'Mein Gym'}</h2>
      <p className="muted small gym-sub" id="gym-count">{tier.name} · {prog.unlocked.length} von {GYM_ITEMS.length} Geräten · {prog.hits} Schläge</p>

      {!edit && (
        <div className="card gym-stone" id="gym-stone">
          {s ? (
            <>
              <StoneWithMachine progress={s.done / s.hp} rarity={s.next.rarity} pattern={s.next.pattern} size={140} />
              <div className="gym-stone-text">
                <strong>Stein {s.index + 1}</strong>
                <span className={`rarity r-${s.next.rarity}`}>{RARITY_LABEL[s.next.rarity]}es Gerät darin</span>
                <div className="gym-bar"><i style={{ width: `${(s.done / s.hp) * 100}%` }} /></div>
                <span className="muted small" id="gym-left">{s.done} / {s.hp} Schläge · noch {s.hp - s.done} Arbeitssätze</span>
                <a className="btn primary small-btn" href="#/workouts">Trainieren & zuschlagen</a>
              </div>
            </>
          ) : <p><strong>Alle Steine zerschlagen! 🏆</strong> Du hast jedes Gerät gefunden.</p>}
        </div>
      )}

      <div className="gym-toolbar">
        {edit ? (
          <>
            <label className="gym-name-edit">Name deines Gyms<input id="gym-name" value={gym.name} maxLength={MAX_NAME} placeholder="z. B. Elevations" onChange={(e) => setGym({ ...gym, name: e.target.value })} /></label>
            <button type="button" className="btn primary" id="gym-done" onClick={() => {
              if (isOffensive(gym.name)) return showError(new Error('Bitte wähle einen freundlichen Namen.'));
              setEdit(false); setSel(null); void save({ ...gym, name: gym.name.trim() });
            }}>Fertig</button>
          </>
        ) : (
          <button type="button" className="btn" id="gym-edit" onClick={() => setEdit(true)}>✏️ Gym gestalten</button>
        )}
      </div>

      <GymRoom gym={gym} tier={tier} edit={edit} selected={sel} onSelect={setSel}
        onMove={(id, pos) => setGym({ ...gym, objects: gym.objects.map((o) => (o.id === id ? { ...o, ...pos } : o)) })} />

      {edit ? (
        <>
          <p className="muted small">Zieh Geräte und Deko mit dem Finger an ihren Platz{tier.empore ? ' – auch hoch auf die Empore' : ''}. Antippen wählt aus.</p>
          {selObj && (
            <div className="card gym-selbar" id="gym-selbar">
              <strong>{nameOf(selObj.id)}</strong>
              <button type="button" className="btn small-btn" id="gym-flip" onClick={() => setGym({ ...gym, objects: gym.objects.map((o) => (o.id === sel ? { ...o, flip: !o.flip } : o)) })}>↔ Spiegeln</button>
              <button type="button" className="btn small-btn" id="gym-store" onClick={() => { setGym({ ...gym, objects: gym.objects.filter((o) => o.id !== sel) }); setSel(null); }}>Ins Lager</button>
            </div>
          )}
          <h3>Lager <span className="muted small">({gym.objects.length} / {tier.max} aufgestellt)</span></h3>
          {storage.length ? (
            <div className="gym-storage" id="gym-storage">
              {storage.map((id) => {
                const m = GYM_ITEMS.find((i) => i.id === id), d = DECO_BY_ID.get(id);
                return (
                  <button key={id} type="button" className="gym-card" data-put={id} onClick={() => put(id)}>
                    {m ? <MachineArt pattern={m.pattern} height={60} /> : d ? <DecoArt item={d} height={60} /> : null}
                    <span>{nameOf(id)}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="muted small">Das Lager ist leer.</p>}
        </>
      ) : (
        <p className="muted small">{nt ? `Noch ${nt.min - broken} Geräte bis zum Ausbau: ${nt.name}${nt.empore ? ' mit Empore' : ''} (Platz für ${nt.max} Dinge).` : 'Höchste Ausbaustufe erreicht – mit Empore!'}</p>
      )}

      <h3>Deko-Laden <span className="muted small" id="gym-balance">· {fmt(balance, 0)} Credits</span></h3>
      {!api.social && <p className="muted small">Deko kaufen geht mit Konto.</p>}
      <div className="gym-shop" id="gym-shop">
        {DECO_SHOP.map((d) => {
          const have = owned.has(d.id);
          return (
            <div key={d.id} className="gym-card" data-deco={d.id}>
              <DecoArt item={d} height={64} />
              <span>{d.name}</span>
              {have ? <span className="muted small">✓ Im Besitz</span> : (
                <button type="button" className="btn small-btn" data-buy={d.id} disabled={!api.social || busy !== '' || balance < d.price} onClick={() => buy(d)}>{fmt(d.price, 0)} 🪙</button>
              )}
            </div>
          );
        })}
      </div>

      <h3>Sammlung</h3>
      <div className="gym-collection" id="gym-collection">
        {GYM_ITEMS.map((it, i) => {
          const have = i < prog.unlocked.length;
          return (
            <div key={it.id} className={`gym-card r-${it.rarity}${have ? '' : ' locked'}`} data-item={it.id}>
              {have ? <MachineArt pattern={it.pattern} height={60} /> : <span className="gym-q">?</span>}
              <span>{have ? it.name : RARITY_LABEL[it.rarity]}</span>
            </div>
          );
        })}
      </div>
      <p className="muted small">🎁 Nach Stein 5, 10, 15, 20, 25 und dem letzten Stein gibt es eine Belohnungs-Kiste mit exklusiver Deko.</p>

      {reveal && (
        <div className="dialog-backdrop">
          <div className="dialog gym-reveal" id="gym-reveal" role="dialog" aria-modal="true">
            {breaking ? (
              reveal.kind === 'machine'
                ? <div className="gym-breaking"><Stone progress={1} rarity={reveal.item.rarity} shake /><p><strong>Krrrack!</strong></p></div>
                : <div className="gym-breaking"><div className="chest shake" aria-hidden="true">🎁</div><p><strong>Die Kiste öffnet sich …</strong></p></div>
            ) : (
              <>
                <p className={`rarity r-${reveal.kind === 'machine' ? reveal.item.rarity : 'legendär'}`}>{reveal.kind === 'machine' ? RARITY_LABEL[reveal.item.rarity] : 'Exklusiv aus der Kiste'}</p>
                <h3>{reveal.kind === 'machine' ? 'Stein zerschlagen! 🎉' : 'Belohnungs-Kiste! 🎁'}</h3>
                <div className="gym-reveal-art">{reveal.kind === 'machine' ? <MachineArt pattern={reveal.item.pattern} height={170} /> : <DecoArt item={reveal.item} height={150} />}</div>
                <p>{reveal.kind === 'machine' ? 'Darunter: ' : 'Darin: '}<strong id="gym-reveal-name">{reveal.item.name}</strong></p>
                <button type="button" className="btn primary block" id="gym-place" onClick={() => finishReveal(true)}>In mein Gym stellen</button>
                <button type="button" className="btn block" onClick={() => finishReveal(false)}>Ins Lager</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Kleine Karte für die Startseite */
export function GymCard({ hits }: { hits: number }) {
  const { user } = useApp();
  const p = gymProgress(hits);
  const s = p.stone;
  const seen = seenCount(user?.id ?? 'local');
  const fresh = seen !== null && seen < p.unlocked.length;
  return (
    <a className={`card gym-mini${fresh ? ' fresh' : ''}`} id="gym-mini" href="#/gym">
      <div className="block-head"><h3>Mein Gym</h3><span className="muted small">{p.unlocked.length} / {GYM_ITEMS.length} Geräte</span></div>
      {fresh && <p className="gym-fresh" id="gym-fresh">🎁 Stein zerschlagen – neues Gerät wartet! Antippen zum Aufdecken.</p>}
      {s ? (
        <div className="gym-mini-row">
          <StoneWithMachine progress={s.done / s.hp} rarity={s.next.rarity} pattern={s.next.pattern} size={78} />
          <div><div className="gym-bar"><i style={{ width: `${(s.done / s.hp) * 100}%` }} /></div><span className="muted small">Noch {s.hp - s.done} Sätze bis zum nächsten Gerät</span></div>
        </div>
      ) : <span className="muted small">Alle Geräte gefunden 🏆</span>}
    </a>
  );
}
