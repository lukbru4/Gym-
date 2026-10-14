// „Mein Gym“: Steine mit Trainingssätzen zerschlagen, darunter neue Geräte finden und im eigenen Gym aufstellen.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Loading } from '../components/Bits';
import { MachineArt, Stone, StoneWithMachine } from '../components/MachineArt';
import { autoPlace, GYM_ITEMS, gymProgress, hitsFrom, loadLayout, saveLayout, seenCount, setSeenCount, type GymItem } from '../lib/gym';

const BY_ID = new Map(GYM_ITEMS.map((i) => [i.id, i]));
/** 12 Plätze in 3 Reihen: hinten kleiner (Perspektive), vorne größer */
const SLOT_POS = [0, 1, 2].flatMap((row) => {
  const scale = [0.7, 0.85, 1][row];
  const y = [46, 68, 93][row]; // Unterkante (Füße) in % der Raumhöhe
  const w = [22, 25, 27][row];
  const m = [9, 3, -1][row]; // seitlicher Rand: hinten schmaler (Perspektive)
  return [0, 1, 2, 3].map((c) => ({ row, scale, w, y, x: m + ((c + 0.5) * (100 - 2 * m)) / 4 - w / 2 }));
});

/** Raum: Rückwand mit Spiegeln und Fenster, Gummiboden in Perspektive */
function RoomBackdrop() {
  return (
    <svg className="gym-room-bg" viewBox="0 0 400 360" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b3038" /><stop offset="1" stopColor="#3a414b" /></linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#23262b" /><stop offset="1" stopColor="#15171a" /></linearGradient>
        <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fb3c4" stopOpacity="0.55" /><stop offset="0.5" stopColor="#dfe8ef" stopOpacity="0.35" /><stop offset="1" stopColor="#7d8f9e" stopOpacity="0.5" /></linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7cb6e8" /><stop offset="1" stopColor="#cfe6f7" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="130" fill="url(#wall)" />
      <polygon points="0,0 40,0 40,130 0,170" fill="#20242a" />
      <polygon points="400,0 360,0 360,130 400,170" fill="#20242a" />
      <rect x="40" y="18" width="70" height="56" rx="4" fill="url(#sky)" stroke="#1a1d21" strokeWidth="4" />
      <line x1="75" y1="18" x2="75" y2="74" stroke="#1a1d21" strokeWidth="3" />
      <rect x="128" y="28" width="210" height="88" rx="3" fill="url(#mirror)" stroke="#8f9aa5" strokeWidth="2" />
      <line x1="198" y1="28" x2="198" y2="116" stroke="#8f9aa5" strokeWidth="1.5" /><line x1="268" y1="28" x2="268" y2="116" stroke="#8f9aa5" strokeWidth="1.5" />
      <path d="M150 34 L175 34 L140 100 L132 100 Z" fill="#fff" opacity="0.12" />
      <text x="355" y="60" textAnchor="end" fill="#e8222f" fontSize="20" fontWeight="900" fontStyle="italic" fontFamily="sans-serif">LEVEL UP</text>
      <polygon points="40,130 360,130 400,170 400,360 0,360 0,170" fill="url(#floor)" />
      <rect x="40" y="126" width="320" height="6" fill="#111316" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <line key={i} x1={40 + i * 40} y1="132" x2={-160 + i * 90} y2="360" stroke="#2f343b" strokeWidth="1.5" />)}
      {[160, 200, 255, 320].map((y) => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#2f343b" strokeWidth="1.5" />)}
    </svg>
  );
}
const RARITY_LABEL: Record<string, string> = { 'gewöhnlich': 'Gewöhnlich', 'selten': 'Selten', 'episch': 'Episch', 'legendär': 'Legendär' };

export function Gym() {
  const { user } = useApp();
  const game = useGame();
  const uid = user?.id ?? 'local';
  const [layout, setLayout] = useState(() => loadLayout(uid));
  const [reveal, setReveal] = useState<GymItem | null>(null);
  const [breaking, setBreaking] = useState(false);
  const [slot, setSlot] = useState<number | null>(null);
  const prog = game.status === 'ok' ? gymProgress(hitsFrom(game.data.sets)) : null;

  // Neu zerbrochene Steine nacheinander enthüllen (beim allerersten Besuch ohne Animation alles aufstellen)
  useEffect(() => {
    if (!prog || reveal) return;
    const seen = seenCount(uid);
    if (seen === null) {
      const next = autoPlace(layout, prog.unlocked);
      setLayout(next); saveLayout(uid, next); setSeenCount(uid, prog.unlocked.length);
      return;
    }
    if (seen < prog.unlocked.length) {
      setReveal(prog.unlocked[seen]);
      setBreaking(true);
    }
  }, [prog?.unlocked.length, reveal]); // eslint-disable-line react-hooks/exhaustive-deps
  // Stein wackelt kurz und zerbricht, dann wird das Gerät sichtbar
  useEffect(() => {
    if (!reveal) return;
    const t = window.setTimeout(() => setBreaking(false), 1100);
    return () => window.clearTimeout(t);
  }, [reveal]);

  if (!prog) return <><h2>Mein Gym</h2><Loading /></>;
  const update = (next: (string | null)[]) => { setLayout(next); saveLayout(uid, next); };
  const placed = new Set(layout.filter(Boolean) as string[]);
  const storage = prog.unlocked.filter((i) => !placed.has(i.id));
  const finishReveal = (place: boolean) => {
    if (!reveal) return;
    if (place) update(autoPlace(layout, [reveal]));
    setSeenCount(uid, (seenCount(uid) ?? 0) + 1);
    setReveal(null);
  };
  const s = prog.stone;
  return (
    <>
      <h2>Mein Gym</h2>
      <p className="muted small gym-sub" id="gym-count">{prog.unlocked.length} von {GYM_ITEMS.length} Geräten gefunden · {prog.hits} Schläge insgesamt</p>

      <div className="card gym-stone" id="gym-stone">
        {s ? (
          <>
            <StoneWithMachine progress={s.done / s.hp} rarity={s.next.rarity} pattern={s.next.pattern} size={140} />
            <div className="gym-stone-text">
              <strong>Stein {s.index + 1}</strong>
              <span className={`rarity r-${s.next.rarity}`}>{RARITY_LABEL[s.next.rarity]}es Gerät darunter</span>
              <div className="gym-bar"><i style={{ width: `${(s.done / s.hp) * 100}%` }} /></div>
              <span className="muted small" id="gym-left">{s.done} / {s.hp} Schläge · noch {s.hp - s.done} Arbeitssätze</span>
              <a className="btn primary small-btn" href="#/workouts">Trainieren & zuschlagen</a>
            </div>
          </>
        ) : (
          <p><strong>Alle Steine zerschlagen! 🏆</strong> Du hast jedes Gerät gefunden.</p>
        )}
      </div>
      <p className="muted small">Jeder Arbeitssatz ist ein Schlag auf den Stein. Mit jedem Schlag wird er durchsichtiger – siehst du schon, welches Gerät darin steckt?</p>

      <h3>Dein Gym</h3>
      <div className="gym-room" id="gym-room">
        <RoomBackdrop />
        {layout.map((id, i) => {
          const it = id ? BY_ID.get(id) : undefined;
          const pos = SLOT_POS[i];
          return (
            <button key={i} type="button" className={`gym-slot${it ? ` r-${it.rarity}` : ' empty'}`} data-slot={i} onClick={() => setSlot(i)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, zIndex: 10 + pos.row }} aria-label={it ? `${it.name} – umstellen` : 'Freier Platz'}>
              {it ? <><MachineArt pattern={it.pattern} height={Math.round(150 * pos.scale)} /><span className="gym-slot-name">{it.name}</span></> : <span className="gym-plus">{storage.length ? '+' : ''}</span>}
            </button>
          );
        })}
      </div>
      <p className="muted small">Tippe auf einen Platz im Raum, um ein Gerät hinzustellen, umzustellen oder ins Lager zu räumen.</p>

      <h3>Sammlung</h3>
      <div className="gym-collection" id="gym-collection">
        {GYM_ITEMS.map((it, i) => {
          const have = i < prog.unlocked.length;
          return (
            <div key={it.id} className={`gym-card r-${it.rarity}${have ? '' : ' locked'}`} data-item={it.id}>
              {have ? <MachineArt pattern={it.pattern} height={70} /> : <span className="gym-q">?</span>}
              <span>{have ? it.name : RARITY_LABEL[it.rarity]}</span>
            </div>
          );
        })}
      </div>

      {slot !== null && (
        <div className="dialog-backdrop" onClick={() => setSlot(null)}>
          <div className="dialog gym-pick" id="gym-pick" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Platz {slot + 1}</h3>
            {storage.length ? (
              <ul className="gym-pick-list">
                {storage.map((it) => (
                  <li key={it.id}><button type="button" data-pick={it.id} onClick={() => { const n = [...layout]; n[slot] = it.id; update(n); setSlot(null); }}>
                    <MachineArt pattern={it.pattern} height={56} /><span>{it.name}</span></button></li>
                ))}
              </ul>
            ) : <p className="muted small">Im Lager liegt nichts. Zerschlag den nächsten Stein für ein neues Gerät!</p>}
            {layout[slot] && <button type="button" className="btn block" id="gym-store" onClick={() => { const n = [...layout]; n[slot] = null; update(n); setSlot(null); }}>Ins Lager räumen</button>}
            <button type="button" className="btn block" onClick={() => setSlot(null)}>Schließen</button>
          </div>
        </div>
      )}

      {reveal && (
        <div className="dialog-backdrop">
          <div className="dialog gym-reveal" id="gym-reveal" role="dialog" aria-modal="true">
            {breaking ? (
              <div className="gym-breaking"><Stone progress={1} rarity={reveal.rarity} shake /><p><strong>Krrrack!</strong></p></div>
            ) : (
              <>
                <p className={`rarity r-${reveal.rarity}`}>{RARITY_LABEL[reveal.rarity]}</p>
                <h3>Stein zerschlagen! 🎉</h3>
                <div className="gym-reveal-art"><MachineArt pattern={reveal.pattern} height={170} /></div>
                <p>Darunter: <strong id="gym-reveal-name">{reveal.name}</strong></p>
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
