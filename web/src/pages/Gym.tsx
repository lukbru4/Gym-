// „Mein Gym“: Start mit einem leeren Boden – mit Trainings-Credits baust du Wände, Fenster, Licht, mehr Fläche und einen
// 2. Stock, kaufst realistische Geräte und Deko und stellst Leute hinein (du, Freunde, weitere Figuren), die dort trainieren.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Loading } from '../components/Bits';
import { ask, notify } from '../components/Dialog';
import { DecoArt } from '../components/DecoArt';
import { GymRoom, lookOf, nameOf } from '../components/GymRoom';
import { MachineArt, machineHeight } from '../components/MachineArt';
import { ZoomPan } from '../components/ZoomPan';
import { setCosmetics, useCosmetics } from '../lib/cosmetics';
import { fmt } from '../lib/format';
import {
  addLocalBuy, BUILD_ITEMS, canBuild, cleanGym, DECO_BY_ID, DECO_SHOP, firstNameOf, GYM_ITEMS, gymNameIdeas, hitsFrom, loadGymLocal,
  localBuys, localSpent, MACHINE_PRICE, machineShopId, MAX_NAME, migrateGym, NPCS, ownedFrom, placeNew, roomFor,
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
  const [look, setLook] = useState<{ id: string; rot: GymRot } | null>(null);
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
  const full = gym.objects.length >= room.max;
  const ideas = gymNameIdeas(ideaSeed, { firstName: firstNameOf(displayName(api, user)), focus, tier: room.id }, isOffensive);

  const put = (id: string, base: GymState = gym) => {
    if (base.objects.length >= roomFor(base.build).max) { void notify(`In dein Gym passen gerade höchstens ${roomFor(base.build).max} Dinge. Räum etwas ins Lager oder bau mehr Fläche.`, { title: 'Kein Platz mehr' }); return base; }
    return placeNew(base, id);
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
      } catch (err) {
        showError(err);
        setBusy('');
        return;
      }
      setBusy('');
    }
    if (use) void save(use(gym));
  };
  const build = (b: BuildItem) => buy(b.id, b.name, b.price, (g) => ({
    ...g, build: g.build.includes(b.id) ? g.build : [...g.build, b.id],
    wall: WALL_OF[b.id] ?? g.wall, floor: FLOOR_OF[b.id] ?? g.floor,
  }));
  const setPerson = (who: GymPerson['who'], id: string, name: string | undefined, on: string) => {
    const rest = gym.people.filter((p) => !(p.who === who && p.id === id) && p.on !== on);
    void save({ ...gym, people: on ? [...rest, { who, id, on, ...(name ? { name } : {}) }] : rest });
  };
  const selObj = sel ? gym.objects.find((o) => o.id === sel) : undefined;
  const nextBuild = BUILD_ITEMS.find((b) => !gym.build.includes(b.id) && canBuild(b, gym.build) && !WALL_OF[b.id] && !FLOOR_OF[b.id]);
  const placedMachines = gym.objects.filter((o) => GYM_ITEMS.some((m) => m.id === o.id));
  const people: { who: GymPerson['who']; id: string; name: string; text: string; price?: number }[] = [
    { who: 'me', id: 'me', name: 'Du', text: 'Du selbst – trainierst in deinem eigenen Gym.' },
    ...friends.map((f) => ({ who: 'friend' as const, id: f.user_id, name: f.display_name, text: 'Freund – kommt gratis vorbei.' })),
    ...NPCS.map((n) => ({ who: 'npc' as const, id: n.id, name: n.name, text: n.text, price: n.price })),
  ];

  const room2 = (
    <GymRoom gym={gym} tier={room} edit={edit} selected={sel} onSelect={setSel} onOpen={(id, rot) => setLook({ id, rot: rot as GymRot })}
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

      {edit ? room2 : <ZoomPan id="gym-zoom" label="Gym">{room2}</ZoomPan>}
      {!edit && nextBuild && <p className="small gym-next" id="gym-next">Nächster Bau-Schritt: <strong>{nextBuild.name}</strong> für {fmt(nextBuild.price, 0)} Credits</p>}

      {edit && (
        <>
          <p className="muted small">Zieh Geräte und Deko mit dem Finger an ihren Platz{room.empore ? ' – auch hoch in den 2. Stock' : ''}. Antippen wählt aus.</p>
          {selObj && (
            <div className="card gym-selbar" id="gym-selbar">
              <strong>{nameOf(selObj.id)}</strong>
              <span className="muted small" id="gym-view">Ansicht: {VIEW_NAMES[selObj.rot ?? 0]}</span>
              <button type="button" className="btn small-btn" id="gym-rotate" onClick={() => setGym({ ...gym, objects: gym.objects.map((o) => (o.id === sel ? { ...o, rot: (((o.rot ?? 0) + 1) % 4) as GymRot } : o)) })}>⟳ Drehen</button>
              <button type="button" className="btn small-btn" id="gym-store" onClick={() => { setGym({ ...gym, objects: gym.objects.filter((o) => o.id !== sel), people: gym.people.filter((p) => p.on !== sel) }); setSel(null); }}>Ins Lager</button>
            </div>
          )}
          <h3>Lager <span className="muted small">({gym.objects.length} / {room.max} aufgestellt)</span></h3>
          {storage.length ? (
            <div className="gym-storage" id="gym-storage">
              {storage.map((id) => {
                const m = GYM_ITEMS.find((i) => i.id === id), d = DECO_BY_ID.get(id);
                return (
                  <button key={id} type="button" className="gym-card" data-put={id} onClick={() => { if (full) return void put(id); setGym(placeNew(gym, id)); }}>
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
            const active = WALL_OF[b.id] ? gym.wall === WALL_OF[b.id] : FLOOR_OF[b.id] ? gym.floor === FLOOR_OF[b.id] : built;
            return (
              <div key={b.id} className={`gym-card build-card${built ? ' built' : ''}${can ? '' : ' locked'}`} data-build={b.id}>
                <span className="build-icon" aria-hidden="true">{{ wand: '🧱', fenster: '🪟', licht: '💡', boden: '⬛', flaeche: '📐', stock: '🏗️' }[b.group]}</span>
                <strong>{b.name}</strong>
                <small>{b.text}</small>
                {!can ? <span className="muted small">🔒 erst {b.needs!.filter((n) => !gym.build.includes(n)).map((n) => BUILD_ITEMS.find((x) => x.id === n)?.name).join(', ')}</span>
                  : style && have ? <button type="button" className="btn small-btn" data-use={b.id} disabled={active} onClick={() => void build(b)}>{active ? '✓ Aktiv' : 'Anwenden'}</button>
                    : built ? <span className="muted small">✓ Gebaut</span>
                      : <button type="button" className="btn small-btn primary" data-buy={b.id} disabled={busy !== ''} onClick={() => void build(b)}>{have ? 'Bauen' : `${fmt(b.price, 0)} 🪙`}</button>}
              </div>
            );
          })}
          {(gym.wall !== 'beton' || gym.floor !== 'fliesen') && (
            <div className="gym-card build-card">
              <span className="build-icon" aria-hidden="true">↩️</span><strong>Standard</strong><small>Beton-Wände und Fliesenboden</small>
              <button type="button" className="btn small-btn" data-reset-style onClick={() => void save({ ...gym, wall: 'beton', floor: 'fliesen' })}>Anwenden</button>
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
                {have ? (placed.has(m.id) ? <span className="muted small">✓ Steht im Gym</span>
                  : <button type="button" className="btn small-btn" data-place={m.id} onClick={() => void save(put(m.id))}>Aufstellen</button>)
                  : <button type="button" className="btn small-btn primary" data-buy={machineShopId(m.id)} disabled={busy !== ''} onClick={() => void buy(machineShopId(m.id), m.name, price, (g) => put(m.id, g))}>{fmt(price, 0)} 🪙</button>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'leute' && (
        <div id="gym-people">
          <p className="muted small">Stell Leute an ein aufgestelltes Gerät – dort trainieren sie die passende Übung.{!api.social && ' Freunde gibt es mit Konto.'}</p>
          {placedMachines.length === 0 && <p className="notice small">Stell zuerst ein Gerät in dein Gym (Reiter „Geräte“).</p>}
          <ul className="gym-people">
            {people.map((p) => {
              const key = `${p.who}:${p.id}`;
              const cur = gym.people.find((x) => x.who === p.who && x.id === p.id);
              const need = p.who === 'npc' && !owned.has(p.id);
              const look = lookOf({ who: p.who, id: p.id, on: '' });
              return (
                <li key={key} className="card gym-person" data-person-row={key}>
                  <span className="gym-person-dot" style={{ background: look.shirt, borderColor: look.skin }} aria-hidden="true" />
                  <div><strong>{p.name}</strong><small className="muted">{p.text}</small></div>
                  {need ? (
                    <button type="button" className="btn small-btn primary" data-buy={p.id} disabled={busy !== ''} onClick={() => void buy(p.id, p.name, p.price!)}>{fmt(p.price!, 0)} 🪙</button>
                  ) : (
                    <select aria-label={`${p.name}: an welchem Gerät?`} data-assign={key} value={cur?.on ?? ''} disabled={!placedMachines.length}
                      onChange={(e) => setPerson(p.who, p.id, p.who === 'friend' ? p.name : undefined, e.target.value)}>
                      <option value="">– nicht im Gym –</option>
                      {placedMachines.map((o) => <option key={o.id} value={o.id}>{nameOf(o.id)}{gym.people.some((x) => x.on === o.id && !(x.who === p.who && x.id === p.id)) ? ' (belegt)' : ''}</option>)}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
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
                {have ? (placed.has(d.id) ? <span className="muted small">✓ Steht im Gym</span>
                  : <button type="button" className="btn small-btn" data-place={d.id} onClick={() => void save(put(d.id))}>Aufstellen</button>)
                  : <button type="button" className="btn small-btn primary" data-buy={d.id} disabled={busy !== ''} onClick={() => void buy(d.id, d.name, d.price, (g) => put(d.id, g))}>{fmt(d.price, 0)} 🪙</button>}
              </div>
            );
          })}
        </div>
      )}

      {look && <LookDialog id={look.id} rot={look.rot} onRot={(rot) => setLook({ ...look, rot })} onClose={() => setLook(null)} />}
      {help && (
        <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setHelp(false); }}>
          <div className="dialog gym-help" id="gym-help-dialog" role="dialog" aria-modal="true" aria-label="So geht dein Gym">
            <h3>So geht dein Gym</h3>
            <ol className="small">
              <li><strong>Credits verdienen:</strong> fürs Trainieren, für Rekorde und Aufgaben.</li>
              <li><strong>Bauen:</strong> Du startest mit einem leeren Boden. Kauf zuerst die Rückwand, dann Seitenwände, Fenster, Spiegel, Licht, einen schöneren Boden, mehr Fläche und am Ende einen 2. Stock.</li>
              <li><strong>Geräte:</strong> Alle Geräte kaufst du mit Credits – je seltener, desto teurer ({fmt(MACHINE_PRICE['gewöhnlich'], 0)} bis {fmt(MACHINE_PRICE['legendär'], 0)} Credits).</li>
              <li><strong>Leute:</strong> Stell dich selbst, Freunde oder weitere Trainierende an ein Gerät – sie trainieren dort.</li>
              <li><strong>Einrichten:</strong> Verschieben, drehen, ins Lager räumen und deinem Gym einen Namen geben.</li>
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
function LookDialog({ id, rot, onRot, onClose }: { id: string; rot: GymRot; onRot: (r: GymRot) => void; onClose: () => void }) {
  const m = GYM_ITEMS.find((i) => i.id === id), d = DECO_BY_ID.get(id);
  const h = m ? machineHeight(m.pattern) : d?.h ?? 1;
  const rarity = m?.rarity ?? (d?.chest ? 'legendär' : 'gewöhnlich');
  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog gym-look" id="gym-look" role="dialog" aria-modal="true" aria-label={nameOf(id)}>
        <p className={`rarity r-${rarity}`}>{m ? `${RARITY_LABEL[rarity]} · ${fmt(MACHINE_PRICE[m.rarity], 0)} Credits` : d?.chest ? 'Exklusiv aus der Kiste' : 'Deko'}</p>
        <h3>{nameOf(id)}</h3>
        <div className="gym-look-art">
          {m ? <MachineArt pattern={m.pattern} view={rot} height={220} />
            : d ? <div style={{ transform: ['', 'scaleX(0.6)', 'scaleX(-1)', 'scaleX(-0.6)'][rot] }}><DecoArt item={d} height={200} /></div> : null}
        </div>
        <p className="muted small" id="gym-look-info">Ansicht {VIEW_NAMES[rot]} · ca. {fmt(h, 1)} m hoch</p>
        <div className="seg gym-look-views" role="group" aria-label="Ansicht">
          {(['Vorne', 'Links', 'Hinten', 'Rechts'] as const).map((l, i) => (
            <button key={l} type="button" className={`seg-tab${rot === i ? ' active' : ''}`} aria-pressed={rot === i} data-view={i} onClick={() => onRot(i as GymRot)}>{l}</button>
          ))}
        </div>
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
      <span className="muted small">{next ? `Nächster Bau-Schritt: ${next.name} (${fmt(next.price, 0)} Credits)` : 'Fertig gebaut – jetzt Geräte und Leute dazu!'}{npcCount ? ` · ${npcCount} ${npcCount === 1 ? 'Person trainiert' : 'Leute trainieren'} gerade` : ''}</span>
    </a>
  );
}
