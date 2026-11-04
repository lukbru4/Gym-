// „Mein Gym“: Start mit einem leeren Boden – mit Trainings-Credits baust du Wände, Fenster, Licht, mehr Fläche und eine
// 2. Etage, kaufst realistische Geräte und Deko und holst dich und deine Freunde als Figuren ins Gym, die dort herumlaufen.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Loading } from '../components/Bits';
import { ask, askText, notify } from '../components/Dialog';
import { DecoArt } from '../components/DecoArt';
import { GymRoom, lookOf, nameOf } from '../components/GymRoom';
import { BlockFigure } from '../components/GymPeople';
import { MyCheers } from '../components/GymSocial';
import { MachineArt, machineHeight } from '../components/MachineArt';
import { ZoomPan } from '../components/ZoomPan';
import { setCosmetics, useCosmetics } from '../lib/cosmetics';
import { fmt } from '../lib/format';
import { addGymLog } from '../lib/activity';
import { todayISO } from '../lib/stats';
import {
  addLocalBuy, BUILD_ITEMS, canBuild, cleanGym, DECO_BY_ID, DECO_SHOP, firstNameOf, GYM_ITEMS, gymNameIdeas, hitsFrom, loadGymLocal,
  localBuys, localSpent, MACHINE_PRICE, machineShopId, MAX_NAME, migrateGym, ownedFrom, placeNew, resetGym, roomFor, SIZE_MAX, SIZE_MIN, unbuild, unbuildList,
  saveGymLocal, seenCount, VIEW_NAMES, type BuildItem, type FloorStyle, type GymPerson, type GymRot, type GymState, type WallStyle,
} from '../lib/gym';
import { isOffensive } from '../lib/moderation';
import { exerciseCategories } from '../lib/muscles';
import { displayName } from '../app/profile';
import type { Exercise } from '../lib/types';
import type { Friend } from '../data/social';

const RARITY_LABEL: Record<string, string> = { 'gewöhnlich': 'Gewöhnlich', 'selten': 'Selten', 'episch': 'Episch', 'legendär': 'Legendär' };
type Tab = 'bauen' | 'geraete' | 'leute' | 'deko';
const WALL_OF: Record<string, WallStyle> = { b_style_brick: 'brick', b_style_wood: 'wood', b_style_dark: 'dark' };
const FLOOR_OF: Record<string, FloorStyle> = { b_floor_rubber: 'rubber', b_floor_wood: 'wood' };

export function Gym() {
  const { api, user, showError, dataChanged, exerciseMap } = useApp();
  const game = useGame();
  const cosmetics = useCosmetics();
  const uid = user?.id ?? 'local';
  const [gym, setGym] = useState<GymState | null>(null);
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [look, setLook] = useState<{ id: string; rot: GymRot; straight?: boolean } | null>(null);
  const [floorSel, setFloor] = useState<0 | 1>(0);
  const [busy, setBusy] = useState('');
  const [tab, setTab] = useState<Tab>('bauen');
  const [tick, setTick] = useState(0); // lokale Käufe neu lesen
  const [friends, setFriends] = useState<Friend[]>([]);
  const [help, setHelp] = useState(false);
  const [ideaSeed, setIdeaSeed] = useState(() => Math.floor(Math.random() * 1000));
  const hits = game.status === 'ok' ? hitsFrom(game.data.sets) : 0;
  // Namensideen: persönlich aus Vorname und meist trainierter Muskelgruppe
  const focus = useMemo(() => {
    if (game.status !== 'ok') return undefined;
    const map = exerciseMap(), count = new Map<string, number>();
    for (const st of game.data.sets) {
      if (st.is_warmup) continue;
      const ex = map.get(st.exercise_id);
      if (ex) for (const c of exerciseCategories({ id: st.exercise_id, ...ex } as Exercise)) if (c !== 'eigene') count.set(c, (count.get(c) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [game.status === 'ok' ? game.data.sets.length : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const bought = useMemo(() => (api.social ? cosmetics.owned : localBuys(uid).map((b) => b.id)), [api, cosmetics.owned, uid, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const owned = useMemo(() => ownedFrom(bought, gym?.legacy ?? []), [bought, gym?.legacy]);

  const save = async (next: GymState) => {
    setGym(next);
    saveGymLocal(uid, next);
    if (api.social) await api.social.setMyGym(next).catch((err) => showError(err));
  };

  // Gym laden: Konto (falls vorhanden), sonst Gerät; altes Gym einmalig umstellen
  useEffect(() => {
    if (game.status !== 'ok') return;
    let alive = true;
    const local = loadGymLocal(uid);
    const finish = (raw: unknown) => {
      if (!alive) return;
      const had = Boolean(raw) || seenCount(uid) !== null;
      const migrated = migrateGym(raw, had, hits);
      const next = cleanGym(migrated, ownedFrom(bought, migrated.legacy ?? []));
      setGym(next);
      if ((raw as { v?: number } | null)?.v !== 2) void save(next); // umgestellt → gleich speichern
    };
    if (!api.social) { finish(local); return; }
    api.social.myGym().then((remote) => finish(remote ?? local), () => finish(local));
    return () => { alive = false; };
  }, [game.status === 'ok', api]); // eslint-disable-line react-hooks/exhaustive-deps

  // Freunde, die man ins Gym holen kann
  useEffect(() => {
    if (!api.social) return;
    let alive = true;
    api.social.friends().then((f) => alive && setFriends(f.filter((x) => x.status === 'friend')), () => {});
    return () => { alive = false; };
  }, [api]);

  if (game.status !== 'ok' || !gym) return <><h2>Mein Gym</h2><Loading /></>;
  const room = roomFor(gym.build);
  const balance = game.data.balance - (api.social ? 0 : localSpent(uid));
  const placed = new Set(gym.objects.map((o) => o.id));
  const ownedMachines = GYM_ITEMS.filter((m) => owned.has(m.id));
  const ownedDeco = [...DECO_BY_ID.values()].filter((d) => owned.has(d.id) && !['gym_bag', 'gym_lamp', 'gym_rings'].includes(d.id));
  const storage = [...ownedMachines.map((m) => m.id), ...ownedDeco.map((d) => d.id)].filter((id) => !placed.has(id));
  const floor: 0 | 1 = room.empore ? floorSel : 0;
  const ideas = gymNameIdeas(ideaSeed, { firstName: firstNameOf(displayName(api, user)), focus, tier: room.id }, isOffensive);

  const put = (id: string, base: GymState = gym) => {
    if (base.objects.length >= roomFor(base.build).max) { void notify(`In dein Gym passen gerade höchstens ${roomFor(base.build).max} Dinge. Räum etwas ins Lager oder bau mehr Fläche.`, { title: 'Kein Platz mehr' }); return base; }
    return placeNew(base, id, floor);
  };
  /** Kaufen (Konto: Server prüft das Guthaben; ohne Konto: Kaufbuch auf dem Gerät) – danach optional gleich verwenden */
  const buy = async (id: string, name: string, price: number, use?: (g: GymState) => GymState) => {
    if (!owned.has(id)) {
      if (balance < price) return void notify(`Dir fehlen noch ${fmt(price - balance, 0)} Credits. Credits bekommst du fürs Trainieren, für Rekorde und Aufgaben.`, { title: 'Nicht genug Credits' });
      if (!(await ask(`„${name}“ für ${fmt(price, 0)} Credits kaufen?`, { title: 'Kaufen?', ok: 'Kaufen' }))) return;
      setBusy(id);
      try {
        if (api.social) {
          await api.social.buy(id);
          setCosmetics(await api.social.myShop());
          dataChanged();
        } else {
          addLocalBuy(uid, id, price);
          setTick((x) => x + 1);
        }
        addGymLog(uid, todayISO(), `${name} gekauft`);
      } catch (err) {
        showError(err);
        setBusy('');
        return;
      }
      setBusy('');
    }
    if (use) {
      const next = use(gym);
      const verb = next.build.length > gym.build.length ? 'gebaut' : next.objects.length > gym.objects.length ? 'aufgestellt' : next.people.length > gym.people.length ? 'ins Gym geholt' : '';
      if (verb) addGymLog(uid, todayISO(), `${name} ${verb}`);
      void save(next);
    }
  };
  // Stile (Wand/Boden) gelten für die gerade offene Etage
  const build = (b: BuildItem) => buy(b.id, b.name, b.price, (g) => ({
    ...g, build: g.build.includes(b.id) ? g.build : [...g.build, b.id],
    ...(floor === 1
      ? { wall2: WALL_OF[b.id] ?? g.wall2, floor2: FLOOR_OF[b.id] ?? g.floor2 }
      : { wall: WALL_OF[b.id] ?? g.wall, floor: FLOOR_OF[b.id] ?? g.floor }),
  }));
  const nameB = (id: string) => BUILD_ITEMS.find((x) => x.id === id)?.name ?? id;
  /** Teil abbauen – mit Sicherheitsabfrage; Abhängiges fällt mit weg, Besitz bleibt */
  const tearDown = async (b: BuildItem) => {
    const also = unbuildList(gym.build, b.id).filter((x) => x !== b.id);
    const up = gym.build.includes('b_floor2') && (b.id === 'b_floor2' || also.includes('b_floor2')) && gym.objects.some((o) => o.level === 1);
    const msg = `„${b.name}“ abbauen?${also.length ? ` Dabei fällt auch weg: ${also.map(nameB).join(', ')}.` : ''}${up ? ' Alles aus der 2. Etage kommt ins Lager.' : ''} Du behältst alles Gekaufte – wieder aufbauen kostet nichts.`;
    if (!(await ask(msg, { title: 'Wirklich abbauen?', ok: 'Abbauen', danger: true }))) return;
    if (also.includes('b_floor2') || b.id === 'b_floor2') setFloor(0);
    addGymLog(uid, todayISO(), `${b.name} abgebaut`);
    void save(unbuild(gym, b.id));
  };
  const resetAll = async () => {
    const t = await askText('Damit baust du alles ab: Wände, Fenster, Böden, Fläche und 2. Etage. Alle Geräte und Deko kommen ins Lager, alle Leute gehen heim. Gekauftes bleibt dir – Credits gibt es aber nicht zurück. Tippe ABBAUEN zum Bestätigen.', { title: 'Gym komplett zurücksetzen?', ok: 'Zurücksetzen', danger: true, requireText: 'ABBAUEN', placeholder: 'ABBAUEN' });
    if (t === null) return;
    setFloor(0); setSel(null);
    addGymLog(uid, todayISO(), 'Gym komplett zurückgesetzt');
    void save(resetGym(gym));
  };
  const moveFloor = (id: string) => void save({ ...gym, objects: gym.objects.map((o) => (o.id === id ? { ...o, level: o.level ? 0 : 1 } : o)) });
  /** Person ins Gym holen (auf eine Etage) oder heimschicken (level null) */
  const setPerson = (who: GymPerson['who'], id: string, name: string | undefined, level: 0 | 1 | null) => {
    const rest = gym.people.filter((p) => !(p.who === who && p.id === id));
    if (level !== null && !gym.people.some((p) => p.who === who && p.id === id)) addGymLog(uid, todayISO(), `${who === 'me' ? 'Du bist' : `${name ?? 'Freund'} ist`} ins Gym gekommen`);
    void save({ ...gym, people: level === null ? rest : [...rest, { who, id, ...(name ? { name } : {}), ...(level ? { level } : {}) }] });
  };
  const updSel = (patch: Partial<GymState['objects'][number]>) => setGym({ ...gym, objects: gym.objects.map((o) => (o.id === sel ? { ...o, ...patch } : o)) });
  const selObj = sel ? gym.objects.find((o) => o.id === sel) : undefined;
  const nextBuild = BUILD_ITEMS.find((b) => !gym.build.includes(b.id) && canBuild(b, gym.build) && !WALL_OF[b.id] && !FLOOR_OF[b.id]);
  const people: { who: GymPerson['who']; id: string; name: string; text: string }[] = [
    { who: 'me', id: 'me', name: 'Du', text: 'Du selbst – läufst durch dein Gym und machst ein paar Sätze.' },
    ...friends.map((f) => ({ who: 'friend' as const, id: f.user_id, name: f.display_name, text: 'Freund – kommt gratis vorbei.' })),
  ];

  const PlacedInfo = ({ id }: { id: string }) => {
    const o = gym.objects.find((x) => x.id === id)!;
    if (!room.empore) return <span className="muted small">✓ Steht im Gym</span>;
    return (
      <span className="gym-placed">
        <span className="muted small">✓ {o.level ? '2. Etage' : 'Erdgeschoss'}</span>
        <button type="button" className="btn small-btn" data-move-floor={id} onClick={() => moveFloor(id)}>{o.level ? '⬇️ Nach unten' : '⬆️ Nach oben'}</button>
      </span>
    );
  };
  const room2 = (
    <GymRoom gym={gym} tier={room} floor={floor} edit={edit} selected={sel} onSelect={setSel} onOpen={(id, rot) => setLook({ id, rot: rot as GymRot })}
      onMove={(id, pos) => setGym({ ...gym, objects: gym.objects.map((o) => (o.id === id ? { ...o, ...pos } : o)) })} />
  );
  return (
    <>
      <div className="gym-head"><h2>{gym.name || 'Mein Gym'}</h2><button type="button" className="btn small-btn" id="gym-help" onClick={() => setHelp(true)}>ℹ️ So geht's</button></div>
      <p className="muted small gym-sub" id="gym-count">{room.name} · {gym.objects.length} / {room.max} Plätze · <strong id="gym-balance">{fmt(balance, 0)} Credits</strong></p>

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
          <button type="button" className="btn" id="gym-edit" onClick={() => setEdit(true)}>✏️ Einrichten</button>
        )}
      </div>

      {(edit || !gym.name) && (
        <div className="gym-ideas" id="gym-ideas">
          <span className="muted small">{edit ? 'Ideen:' : 'Gib deinem Gym einen Namen:'}</span>
          {ideas.map((i) => (
            <button key={i.name} type="button" className={`chip${i.personal ? ' personal' : ''}${gym.name === i.name ? ' active' : ''}`} data-name-idea={i.name}
              onClick={() => (edit ? setGym({ ...gym, name: i.name }) : void save({ ...gym, name: i.name }))}>
              {i.personal ? '⭐ ' : ''}{i.name}
            </button>
          ))}
          <button type="button" className="chip shuffle" id="gym-name-shuffle" onClick={() => setIdeaSeed((x) => x + 1)}>🎲 Neue Ideen</button>
        </div>
      )}

      {room.empore && (
        <div className="seg seg-small gym-floors" role="tablist" aria-label="Etage">
          {(['Erdgeschoss', '2. Etage'] as const).map((l, i) => (
            <button key={l} type="button" role="tab" aria-selected={floor === i} className={`seg-tab${floor === i ? ' active' : ''}`} id={`gym-floor-${i}`} onClick={() => { setFloor(i as 0 | 1); setSel(null); }}>
              {i ? '⬆️ ' : '⬇️ '}{l} <small>({gym.objects.filter((o) => o.level === i).length})</small>
            </button>
          ))}
        </div>
      )}
      {floor === 1 && !gym.objects.some((o) => o.level === 1) && <p className="notice small" id="gym-floor-empty">Die 2. Etage ist noch leer – stell Geräte über „Geräte“ hierher (Aufstellen) oder hol sie mit „⬆️ Nach oben“ aus dem Erdgeschoss.</p>}
      {edit ? room2 : <ZoomPan id="gym-zoom" label="Gym">{room2}</ZoomPan>}
      {!edit && <MyCheers />}
      {!edit && nextBuild && <p className="small gym-next" id="gym-next">Nächster Bau-Schritt: <strong>{nextBuild.name}</strong> für {fmt(nextBuild.price, 0)} Credits</p>}

      {edit && (
        <>
          <p className="muted small">Zieh Geräte und Deko mit dem Finger an ihren Platz – nach hinten an die Wand oder nach vorne. Antippen wählt aus, dann drehen, gerade/3D und größer oder kleiner machen.{room.empore ? ' Neue Dinge landen auf der Etage, die gerade offen ist.' : ''}</p>
          {selObj && (
            <div className="card gym-selbar" id="gym-selbar">
              <strong>{nameOf(selObj.id)}</strong>
              <span className="muted small" id="gym-view">Ansicht: {VIEW_NAMES[selObj.rot ?? 0]}{selObj.straight ? ' · gerade' : ' · 3D'} · Größe {Math.round((selObj.size ?? 1) * 100)} %</span>
              <div className="gym-selbtns">
                <button type="button" className="btn small-btn" id="gym-rotate" onClick={() => updSel({ rot: (((selObj.rot ?? 0) + 1) % 4) as GymRot })}>⟳ Drehen</button>
                <button type="button" className={`btn small-btn${selObj.straight ? ' primary' : ''}`} id="gym-straight" aria-pressed={!!selObj.straight} onClick={() => updSel({ straight: !selObj.straight || undefined })}>{selObj.straight ? '▭ Gerade' : '🧊 3D'}</button>
                <button type="button" className="btn small-btn" id="gym-smaller" aria-label="Kleiner" disabled={(selObj.size ?? 1) <= SIZE_MIN} onClick={() => updSel({ size: Math.max(SIZE_MIN, Math.round(((selObj.size ?? 1) - 0.1) * 10) / 10) })}>−</button>
                <input type="range" id="gym-size" aria-label="Größe" min={SIZE_MIN * 100} max={SIZE_MAX * 100} step={10} value={Math.round((selObj.size ?? 1) * 100)} onChange={(e) => updSel({ size: Number(e.target.value) / 100 })} />
                <button type="button" className="btn small-btn" id="gym-bigger" aria-label="Größer" disabled={(selObj.size ?? 1) >= SIZE_MAX} onClick={() => updSel({ size: Math.min(SIZE_MAX, Math.round(((selObj.size ?? 1) + 0.1) * 10) / 10) })}>+</button>
                {room.empore && <button type="button" className="btn small-btn" id="gym-move-floor" onClick={() => { updSel({ level: selObj.level ? 0 : 1 }); setSel(null); }}>{selObj.level ? '⬇️ Ins Erdgeschoss' : '⬆️ In die 2. Etage'}</button>}
                <button type="button" className="btn small-btn" id="gym-store" onClick={() => { setGym({ ...gym, objects: gym.objects.filter((o) => o.id !== sel) }); setSel(null); }}>Ins Lager</button>
                <button type="button" className="btn small-btn danger" id="gym-store-floor" onClick={async () => {
                  if (!(await ask(`Alles ${floor ? 'aus der 2. Etage' : 'aus dem Erdgeschoss'} ins Lager räumen?`, { title: 'Alles wegräumen?', ok: 'Ins Lager', danger: true }))) return;
                  setGym({ ...gym, objects: gym.objects.filter((o) => o.level !== floor) }); setSel(null);
                }}>Alles hier ins Lager</button>
              </div>
            </div>
          )}
          <h3>Lager <span className="muted small">({gym.objects.length} / {room.max} aufgestellt)</span></h3>
          {storage.length ? (
            <div className="gym-storage" id="gym-storage">
              {storage.map((id) => {
                const m = GYM_ITEMS.find((i) => i.id === id), d = DECO_BY_ID.get(id);
                return (
                  <button key={id} type="button" className="gym-card" data-put={id} onClick={() => setGym(put(id))}>
                    {m ? <MachineArt pattern={m.pattern} height={60} /> : d ? <DecoArt item={d} height={60} /> : null}
                    <span>{nameOf(id)}</span>
                  </button>
                );
              })}
            </div>
          ) : <p className="muted small">Das Lager ist leer.</p>}
        </>
      )}

      <div className="seg gym-tabs" role="tablist" aria-label="Laden">
        {([['bauen', '🧱 Bauen'], ['geraete', '🏋️ Geräte'], ['leute', '🧑‍🤝‍🧑 Leute'], ['deko', '🪴 Deko']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`seg-tab${tab === id ? ' active' : ''}`} data-tab={id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'bauen' && (
        <div className="gym-shop" id="gym-build">
          {BUILD_ITEMS.map((b) => {
            const built = gym.build.includes(b.id), can = canBuild(b, gym.build), have = owned.has(b.id);
            const style = WALL_OF[b.id] ?? FLOOR_OF[b.id];
            const curWall = floor ? gym.wall2 : gym.wall, curFloor = floor ? gym.floor2 : gym.floor;
            const active = WALL_OF[b.id] ? curWall === WALL_OF[b.id] : FLOOR_OF[b.id] ? curFloor === FLOOR_OF[b.id] : built;
            return (
              <div key={b.id} className={`gym-card build-card${built ? ' built' : ''}${can ? '' : ' locked'}`} data-build={b.id}>
                <span className="build-icon" aria-hidden="true">{{ wand: '🧱', fenster: '🪟', licht: '💡', boden: '⬛', flaeche: '📐', stock: '🏗️' }[b.group]}</span>
                <strong>{b.name}</strong>
                <small>{b.text}</small>
                {!can ? <span className="muted small">🔒 erst {b.needs!.filter((n) => !gym.build.includes(n)).map((n) => BUILD_ITEMS.find((x) => x.id === n)?.name).join(', ')}</span>
                  : style && have ? <button type="button" className="btn small-btn" data-use={b.id} disabled={active} onClick={() => void build(b)}>{active ? `✓ Aktiv${room.empore ? (floor ? ' oben' : ' unten') : ''}` : room.empore ? (floor ? 'Oben anwenden' : 'Unten anwenden') : 'Anwenden'}</button>
                    : built ? <span className="muted small">✓ Gebaut</span>
                      : <button type="button" className="btn small-btn primary" data-buy={b.id} disabled={busy !== ''} onClick={() => void build(b)}>{have ? 'Bauen (gratis)' : `${fmt(b.price, 0)} 🪙`}</button>}
                {built && <button type="button" className="btn small-btn link-danger" data-unbuild={b.id} onClick={() => void tearDown(b)}>Abbauen</button>}
              </div>
            );
          })}
          {((floor ? gym.wall2 : gym.wall) !== 'beton' || (floor ? gym.floor2 : gym.floor) !== 'fliesen') && (
            <div className="gym-card build-card">
              <span className="build-icon" aria-hidden="true">↩️</span><strong>Standard{room.empore ? (floor ? ' (oben)' : ' (unten)') : ''}</strong><small>Beton-Wände und Fliesenboden</small>
              <button type="button" className="btn small-btn" data-reset-style onClick={() => void save(floor ? { ...gym, wall2: 'beton', floor2: 'fliesen' } : { ...gym, wall: 'beton', floor: 'fliesen' })}>Anwenden</button>
            </div>
          )}
          {gym.build.length > 0 && (
            <div className="gym-card build-card danger-card">
              <span className="build-icon" aria-hidden="true">🧨</span><strong>Gym zurücksetzen</strong><small>Alles abbauen, Geräte ins Lager – Gekauftes bleibt dir.</small>
              <button type="button" className="btn small-btn danger" id="gym-reset" onClick={() => void resetAll()}>Zurücksetzen</button>
            </div>
          )}
        </div>
      )}

      {tab === 'geraete' && (
        <div className="gym-shop" id="gym-machines">
          {GYM_ITEMS.map((m) => {
            const have = owned.has(m.id), price = MACHINE_PRICE[m.rarity];
            return (
              <div key={m.id} className={`gym-card r-${m.rarity}`} data-machine={m.id}>
                <button type="button" className="gym-card-art" aria-label={`${m.name} ansehen`} onClick={() => setLook({ id: m.id, rot: 0 })}><MachineArt pattern={m.pattern} height={64} /></button>
                <span>{m.name}</span>
                <span className={`rarity r-${m.rarity} small`}>{RARITY_LABEL[m.rarity]}</span>
                {have ? (placed.has(m.id) ? <PlacedInfo id={m.id} />
                  : <button type="button" className="btn small-btn" data-place={m.id} onClick={() => void save(put(m.id))}>{room.empore && floor ? 'Aufstellen (2. Etage)' : 'Aufstellen'}</button>)
                  : <button type="button" className="btn small-btn primary" data-buy={machineShopId(m.id)} disabled={busy !== ''} onClick={() => void buy(machineShopId(m.id), m.name, price, (g) => put(m.id, g))}>{fmt(price, 0)} 🪙</button>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'leute' && (
        <div id="gym-people">
          <p className="muted small">Hol dich und deine Freunde ins Gym – als Figuren laufen sie herum, machen ein paar Sätze mit Kurzhanteln und reden.{!api.social && ' Freunde gibt es mit Konto.'}</p>
          <ul className="gym-people">
            {people.map((p) => {
              const key = `${p.who}:${p.id}`;
              const cur = gym.people.find((x) => x.who === p.who && x.id === p.id);
              const look = lookOf({ who: p.who, id: p.id });
              return (
                <li key={key} className="card gym-person" data-person-row={key}>
                  <BlockFigure look={look} height={46} />
                  <div><strong>{p.name}</strong><small className="muted">{p.text}</small></div>
                  {room.empore ? (
                    <select aria-label={`${p.name}: wo?`} data-assign={key} value={cur ? String(cur.level ?? 0) : ''}
                      onChange={(e) => setPerson(p.who, p.id, p.who === 'friend' ? p.name : undefined, e.target.value === '' ? null : (Number(e.target.value) as 0 | 1))}>
                      <option value="">– nicht im Gym –</option><option value="0">Erdgeschoss</option><option value="1">2. Etage</option>
                    </select>
                  ) : (
                    <button type="button" className={`btn small-btn${cur ? '' : ' primary'}`} data-assign={key} onClick={() => setPerson(p.who, p.id, p.who === 'friend' ? p.name : undefined, cur ? null : 0)}>{cur ? 'Heimschicken' : 'Ins Gym holen'}</button>
                  )}
                </li>
              );
            })}
          </ul>
          {friends.length === 0 && api.social && <p className="muted small">Noch keine Freunde? Lade sie unter „Freunde“ ein – dann kannst du sie hier ins Gym holen.</p>}
        </div>
      )}

      {tab === 'deko' && (
        <div className="gym-shop" id="gym-shop">
          {DECO_SHOP.map((d) => {
            const have = owned.has(d.id);
            return (
              <div key={d.id} className="gym-card" data-deco={d.id}>
                <DecoArt item={d} height={64} />
                <span>{d.name}</span>
                {have ? (placed.has(d.id) ? <PlacedInfo id={d.id} />
                  : <button type="button" className="btn small-btn" data-place={d.id} onClick={() => void save(put(d.id))}>{room.empore && floor ? 'Aufstellen (2. Etage)' : 'Aufstellen'}</button>)
                  : <button type="button" className="btn small-btn primary" data-buy={d.id} disabled={busy !== ''} onClick={() => void buy(d.id, d.name, d.price, (g) => put(d.id, g))}>{fmt(d.price, 0)} 🪙</button>}
              </div>
            );
          })}
        </div>
      )}

      {look && <LookDialog id={look.id} rot={look.rot} straight={!!look.straight} onRot={(rot) => setLook({ ...look, rot })} onStraight={(v) => setLook({ ...look, straight: v })} onClose={() => setLook(null)} />}
      {help && (
        <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setHelp(false); }}>
          <div className="dialog gym-help" id="gym-help-dialog" role="dialog" aria-modal="true" aria-label="So geht dein Gym">
            <h3>So geht dein Gym</h3>
            <ol className="small">
              <li><strong>Credits verdienen:</strong> fürs Trainieren, für Rekorde und Aufgaben.</li>
              <li><strong>Bauen:</strong> Du startest mit einem leeren Boden. Kauf zuerst die Rückwand, dann Seitenwände, Fenster, Spiegel, Licht, einen schöneren Boden, mehr Fläche und am Ende eine 2. Etage (eigener Raum, oben über „2. Etage“ umschalten).</li>
              <li><strong>Geräte:</strong> Alle Geräte kaufst du mit Credits – je seltener, desto teurer ({fmt(MACHINE_PRICE['gewöhnlich'], 0)} bis {fmt(MACHINE_PRICE['legendär'], 0)} Credits).</li>
              <li><strong>Leute:</strong> Hol dich selbst und deine Freunde ins Gym – sie laufen herum, machen Sätze und reden.</li>
              <li><strong>Einrichten:</strong> Verschieben (auch ganz nach hinten), drehen, gerade oder 3D, größer/kleiner, ins Lager räumen und deinem Gym einen Namen geben.</li>
              <li><strong>2. Etage:</strong> Oben umschalten, dann „Aufstellen“ – oder bei Geräten „⬆️ Nach oben“. Wände und Boden wählst du oben selbst.</li>
              <li><strong>Abbauen:</strong> Jedes gebaute Teil lässt sich wieder abbauen (mit Sicherheitsfrage) und gratis neu bauen. Ganz unten bei „Bauen“ kannst du alles zurücksetzen.</li>
            </ol>
            <p className="muted small">Deine Freunde sehen dein Gym in deinem Profil.</p>
            <button type="button" className="btn primary block" id="gym-help-close" onClick={() => setHelp(false)}>Verstanden</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Großansicht eines Geräts (oder Deko) – von allen vier Seiten anschauen */
function LookDialog({ id, rot, straight, onRot, onStraight, onClose }: { id: string; rot: GymRot; straight: boolean; onRot: (r: GymRot) => void; onStraight: (v: boolean) => void; onClose: () => void }) {
  const m = GYM_ITEMS.find((i) => i.id === id), d = DECO_BY_ID.get(id);
  const h = m ? machineHeight(m.pattern) : d?.h ?? 1;
  const rarity = m?.rarity ?? (d?.chest ? 'legendär' : 'gewöhnlich');
  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog gym-look" id="gym-look" role="dialog" aria-modal="true" aria-label={nameOf(id)}>
        <p className={`rarity r-${rarity}`}>{m ? `${RARITY_LABEL[rarity]} · ${fmt(MACHINE_PRICE[m.rarity], 0)} Credits` : d?.chest ? 'Exklusiv aus der Kiste' : 'Deko'}</p>
        <h3>{nameOf(id)}</h3>
        <div className="gym-look-art">
          {m ? <MachineArt pattern={m.pattern} view={rot} height={220} straight={straight} />
            : d ? <div style={{ transform: ['', 'scaleX(0.6)', 'scaleX(-1)', 'scaleX(-0.6)'][rot] }}><DecoArt item={d} height={200} /></div> : null}
        </div>
        <p className="muted small" id="gym-look-info">Ansicht {VIEW_NAMES[rot]} · ca. {fmt(h, 1)} m hoch</p>
        <div className="seg gym-look-views" role="group" aria-label="Ansicht">
          {(['Vorne', 'Links', 'Hinten', 'Rechts'] as const).map((l, i) => (
            <button key={l} type="button" className={`seg-tab${rot === i ? ' active' : ''}`} aria-pressed={rot === i} data-view={i} onClick={() => onRot(i as GymRot)}>{l}</button>
          ))}
        </div>
        {m && <div className="seg seg-small" role="group" aria-label="Darstellung">
          <button type="button" className={`seg-tab${!straight ? ' active' : ''}`} aria-pressed={!straight} id="gym-look-3d" onClick={() => onStraight(false)}>🧊 3D</button>
          <button type="button" className={`seg-tab${straight ? ' active' : ''}`} aria-pressed={straight} id="gym-look-straight" onClick={() => onStraight(true)}>▭ Gerade</button>
        </div>}
        <button type="button" className="btn block" id="gym-look-close" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}

/** Kleine Karte für die Startseite: Guthaben und nächster Bau-Schritt */
export function GymCard({ balance }: { balance: number }) {
  const { api, user } = useApp();
  const uid = user?.id ?? 'local';
  const raw = loadGymLocal(uid) as Partial<GymState> | null;
  const built = Array.isArray(raw?.build) ? raw.build : [];
  const next = BUILD_ITEMS.find((b) => !built.includes(b.id) && canBuild(b, built) && !WALL_OF[b.id] && !FLOOR_OF[b.id]);
  const bal = balance - (api.social ? 0 : localSpent(uid));
  const npcCount = Array.isArray(raw?.people) ? raw.people.length : 0;
  return (
    <a className="card gym-mini" id="gym-mini" href="#/gym">
      <div className="block-head"><h3>{raw?.name || 'Mein Gym'}</h3><span className="muted small">{fmt(bal, 0)} Credits</span></div>
      <span className="muted small">{next ? `Nächster Bau-Schritt: ${next.name} (${fmt(next.price, 0)} Credits)` : 'Fertig gebaut – jetzt Geräte und Leute dazu!'}{npcCount ? ` · ${npcCount} ${npcCount === 1 ? 'Person ist' : 'Leute sind'} gerade im Gym` : ''}</span>
    </a>
  );
}
