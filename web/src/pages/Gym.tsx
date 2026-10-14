// „Mein Gym“: Steine mit Trainingssätzen zerschlagen, darunter neue Geräte finden und im eigenen Gym aufstellen.
import { useEffect, useState } from 'react';
import { useApp } from '../app/context';
import { useGame } from '../app/gameContext';
import { Loading } from '../components/Bits';
import { MachineArt, Stone } from '../components/MachineArt';
import { autoPlace, GYM_ITEMS, gymProgress, hitsFrom, loadLayout, saveLayout, seenCount, setSeenCount, type GymItem } from '../lib/gym';

const BY_ID = new Map(GYM_ITEMS.map((i) => [i.id, i]));
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
            <Stone progress={s.done / s.hp} rarity={s.next.rarity} />
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
      <p className="muted small">Jeder Arbeitssatz ist ein Schlag auf den Stein. Ist er kaputt, liegt darunter ein neues Gerät für dein Gym.</p>

      <h3>Dein Gym</h3>
      <div className="gym-room" id="gym-room">
        {layout.map((id, i) => {
          const it = id ? BY_ID.get(id) : undefined;
          return (
            <button key={i} type="button" className={`gym-slot${it ? ` r-${it.rarity}` : ' empty'}`} data-slot={i} onClick={() => setSlot(i)} aria-label={it ? `${it.name} – umstellen` : 'Freier Platz'}>
              {it ? <><MachineArt pattern={it.pattern} height={92} /><span>{it.name}</span></> : <span className="gym-plus">{storage.length ? '+' : ''}</span>}
            </button>
          );
        })}
      </div>

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
          <Stone progress={s.done / s.hp} rarity={s.next.rarity} />
          <div><div className="gym-bar"><i style={{ width: `${(s.done / s.hp) * 100}%` }} /></div><span className="muted small">Noch {s.hp - s.done} Sätze bis zum nächsten Gerät</span></div>
        </div>
      ) : <span className="muted small">Alle Geräte gefunden 🏆</span>}
    </a>
  );
}
