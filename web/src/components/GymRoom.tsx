// Der Gym-Raum: zuerst nur ein Boden unter freiem Himmel – Wände, Fenster, Spiegel, Licht und Bodenbelag erscheinen,
// sobald sie gebaut sind. Mit der 2. Etage gibt es einen zweiten Raum. Geräte und Deko sind frei verschiebbar, drehbar
// und in der Größe änderbar; du und deine Freunde laufen als Klötzchen-Figuren herum.
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { DECO_BY_ID, FRIEND_LOOK, GYM_ITEMS, ME_LOOK, type GymObject, type GymPerson, type GymState, type GymTier, type Look } from '../lib/gym';
import { GymPeople } from './GymPeople';
import { DecoArt } from './DecoArt';
import { MachineArt, machineWidth } from './MachineArt';

const MACHINE = new Map(GYM_ITEMS.map((i) => [i.id, i]));
const FLOOR_TOP = 36; // Rückwand endet bei 36 % der Raumhöhe

export const nameOf = (id: string) => MACHINE.get(id)?.name ?? DECO_BY_ID.get(id)?.name ?? id;
export const rarityOf = (id: string) => MACHINE.get(id)?.rarity ?? (DECO_BY_ID.get(id)?.chest ? 'legendär' : 'gewöhnlich');

/** Besucher-Figur (du im Gym eines Freundes, nur in deiner Ansicht) */
export const VISITOR = '__visitor';
/** Aussehen einer Person im Gym (Freunde bekommen je nach Name eine eigene Shirt-Farbe) */
const FRIEND_SHIRTS = ['#0ca678', '#f76707', '#ae3ec9', '#1098ad', '#f03e3e', '#74b816'];
export function lookOf(p: GymPerson): Look {
  if (p.who === 'me' || p.id === VISITOR) return ME_LOOK;
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const HAIR = ['#2b2b2b', '#6b4423', '#d9a441', '#8b5a2b', '#1b1b1b'], SKIN = ['#e8b996', '#f1c7a5', '#c68642', '#8d5524', '#f6d5b8'];
  return { ...FRIEND_LOOK, shirt: FRIEND_SHIRTS[h % FRIEND_SHIRTS.length], hair: HAIR[(h >>> 4) % HAIR.length], skin: SKIN[(h >>> 8) % SKIN.length] };
}
export const personName = (p: GymPerson) => (p.who === 'me' ? 'Du' : p.name ?? 'Freund');

/** Bildschirmposition (in % des Raums) eines Punkts auf dem Boden; scale = Tiefe (hinten kleiner) */
function placeXY(x: number, y: number) {
  const ground = FLOOR_TOP + (y / 100) * (97 - FLOOR_TOP);
  return { left: 4 + x * 0.92, bottom: 100 - ground, scale: 0.6 + 0.4 * (y / 100), z: 10 + Math.round(y) };
}
const place = (o: GymObject) => placeXY(o.x, o.y);
/** Deko von der Seite: schmaler, rechts gespiegelt; von hinten gespiegelt */
const decoTransform = (rot: number) => ['', ' scaleX(0.6)', ' scaleX(-1)', ' scaleX(-0.6)'][rot] ?? '';
/** Breite eines Objekts in Metern (für den Rand des Raums) */
function widthOf(o: GymObject) {
  const m = MACHINE.get(o.id), d = DECO_BY_ID.get(o.id);
  const k = o.size ?? 1;
  if (m) return machineWidth(m.pattern, o.rot ?? 0, o.straight) * k;
  return (d ? d.h * 1.1 * (o.rot === 1 || o.rot === 3 ? 0.6 : 1) : 1) * k;
}

/** Pfeil: aus welcher Richtung man das Gerät gerade sieht */
const VIEW_ARROWS = ['👁 vorne', '👁 links', '👁 hinten', '👁 rechts'];

export function GymRoom({ gym, tier, floor = 0, edit = false, selected, onSelect, onMove, onOpen, meName, visitorName, id = 'gym-room' }: {
  /** du läufst als Besucher mit (Gym eines Freundes) */ visitorName?: string;
  id?: string;
  gym: GymState; tier: GymTier; /** Name für „me“ (im Gym eines Freundes dessen Name) */ meName?: string; /** 0 Erdgeschoss, 1 zweite Etage */ floor?: 0 | 1; edit?: boolean; selected?: string | null; onOpen?: (id: string, rot: number) => void;
  onSelect?: (id: string | null) => void; onMove?: (id: string, pos: Pick<GymObject, 'x' | 'y'>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(360);
  const drag = useRef<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 360));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const toPos = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 100, py = ((e.clientY - r.top) / r.height) * 100;
    const x = Math.max(0, Math.min(100, (px - 4) / 0.92));
    return { x, y: Math.max(0, Math.min(100, ((py - FLOOR_TOP) / (97 - FLOOR_TOP)) * 100)) };
  };
  const lv = tier.empore ? floor : 0;
  const objects = gym.objects.filter((o) => o.level === lv);
  const people = [...gym.people.filter((p) => (p.level ?? 0) === lv), ...(visitorName && lv === 0 ? [{ who: 'friend' as const, id: VISITOR, name: visitorName }] : [])];
  return (
    <div ref={ref} className={`gym-room size-${tier.id}${edit ? ' editing' : ''}`} id={id} data-built={gym.build.join(' ')} data-floor={lv} data-wall={lv ? gym.wall2 : gym.wall} data-floorstyle={lv ? gym.floor2 : gym.floor}
      onPointerMove={(e) => { if (drag.current && onMove) onMove(drag.current, toPos(e)); }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onClick={(e) => { if (edit && e.target === e.currentTarget) onSelect?.(null); }}>
      <RoomBackdrop gym={gym} upper={lv === 1} />
      {objects.map((o) => {
        const p = place(o);
        const machine = MACHINE.get(o.id), deco = DECO_BY_ID.get(o.id);
        const rot = o.rot ?? 0;
        // gemeinsamer Maßstab: echte Raumbreite in Metern → alle Geräte in echten Größenverhältnissen (× eigene Größe)
        const pxPerM = (w / tier.meters) * p.scale * (o.size ?? 1);
        const half = Math.min(45, ((widthOf(o) * pxPerM) / 2 / w) * 100);
        const left = Math.max(half, Math.min(100 - half, p.left));
        return (
          <div key={o.id} className={`gym-obj r-${rarityOf(o.id)}${selected === o.id ? ' selected' : ''}`} data-obj={o.id} data-rot={rot} data-scale={p.scale} data-size={o.size ?? 1} data-straight={o.straight ? '1' : undefined}
            style={{ left: `${left}%`, bottom: `${p.bottom}%`, zIndex: p.z, transform: 'translateX(-50%)' }}
            onClick={() => { if (!edit) onOpen?.(o.id, rot); }}
            onPointerDown={(e) => { if (!edit) return; e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = o.id; onSelect?.(o.id); }}>
            {machine ? <MachineArt pattern={machine.pattern} view={rot} pxPerM={pxPerM} straight={o.straight} />
              : deco ? <div style={{ transform: decoTransform(rot) }}><DecoArt item={deco} height={Math.round(deco.h * pxPerM)} /></div> : null}
            {edit && selected === o.id && <span className="gym-obj-view" aria-hidden="true">{o.straight ? '👁 gerade' : VIEW_ARROWS[rot]}</span>}
            {edit && <span className="gym-obj-name">{nameOf(o.id)}</span>}
          </div>
        );
      })}
      <GymPeople people={people} place={placeXY} figH={(w / tier.meters) * 1.75} lookOf={lookOf} nameOf={(p) => (p.who === 'me' && meName ? meName : personName(p))} still={edit} />
    </div>
  );
}

const WALL: Record<string, [string, string]> = { beton: ['#5a5e64', '#6b6f75'], brick: ['#8e3b2a', '#a14c36'], wood: ['#8a5a32', '#a87444'], dark: ['#1b1e23', '#262a31'] };
const WINDOW_X = [52, 106, 248, 302];

/** Hintergrund aus den gebauten Teilen: Himmel → Rückwand → Seitenwände, Fenster, Spiegel, Licht, Bodenbelag */
function RoomBackdrop({ gym, upper }: { gym: GymState; upper: boolean }) {
  const has = (b: string) => gym.build.includes(b);
  const back = has('b_wall_back'), sides = has('b_wall_sides');
  const windows = [1, 2, 3, 4].filter((i) => has(`b_window_${i}`)).length;
  const label = (gym.name || 'MEIN GYM').toUpperCase();
  // 2. Etage: eigener Look (wall2/floor2)
  const wall = upper ? gym.wall2 : gym.wall, floorSt = upper ? gym.floor2 : gym.floor;
  const [w0, w1] = WALL[wall] ?? WALL.beton;
  const floorFill = floorSt === 'wood' ? ['#c99a62', '#a87444'] : floorSt === 'rubber' ? ['#2b2e33', '#1c1e22'] : ['#c9ccd1', '#a9adb3'];
  const lineCol = floorSt === 'wood' ? '#8a5a32' : floorSt === 'rubber' ? '#3a3e44' : '#9399a1';
  return (
    <svg className="gym-room-bg" viewBox="0 0 400 360" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="gsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7cc0ee" /><stop offset="1" stopColor="#d4ecfa" /></linearGradient>
        <linearGradient id="gwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={w0} /><stop offset="1" stopColor={w1} /></linearGradient>
        <linearGradient id="gfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={floorFill[0]} /><stop offset="1" stopColor={floorFill[1]} /></linearGradient>
        <linearGradient id="gmirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fb3c4" stopOpacity="0.6" /><stop offset="0.5" stopColor="#e6eef4" stopOpacity="0.4" /><stop offset="1" stopColor="#7d8f9e" stopOpacity="0.55" /></linearGradient>
      </defs>
      {/* draußen: Himmel, Wiese und Bäume – bis Wände gebaut sind */}
      <rect width="400" height="200" fill="url(#gsky)" />
      {!upper && <rect y="112" width="400" height="80" fill="#7fbf5a" />}
      {!upper && [[30, 112], [90, 108], [330, 110], [380, 114]].map(([x, y], i) => <g key={i}><rect x={x - 2} y={y - 8} width="4" height="10" fill="#6b4a2b" /><circle cx={x} cy={y - 14} r="10" fill="#3f8f3a" /></g>)}
      <circle cx="350" cy="30" r="14" fill="#fff3bf" />
      {back && (
        <g className="gym-wall-back">
          <rect x={sides ? 0 : 40} y="0" width={sides ? 400 : 320} height="130" fill="url(#gwall)" />
          {wall === 'brick' && Array.from({ length: 13 }, (_, row) => Array.from({ length: 21 }, (_, i) => <rect key={`${row}-${i}`} x={(sides ? 0 : 40) + i * 20 + (row % 2) * 10 - 10} y={row * 10} width="19" height="9" fill={['#8e3b2a', '#9c4431', '#82352a', '#a14c36'][(row * 7 + i * 3) & 3]} />))}
          {wall === 'wood' && Array.from({ length: 21 }, (_, i) => <line key={i} x1={(sides ? 0 : 40) + i * 19} y1="0" x2={(sides ? 0 : 40) + i * 19} y2="130" stroke="#6b4423" strokeWidth="1.5" />)}
          {wall === 'dark' && <rect x={sides ? 0 : 40} y="118" width={sides ? 400 : 320} height="3" fill="#e8222f" opacity="0.8" />}
          {WINDOW_X.slice(0, windows).map((x) => <g key={x} className="gym-window"><rect x={x} y="22" width="46" height="50" rx="3" fill="url(#gsky)" stroke="#1a1d21" strokeWidth="4" /><line x1={x + 23} y1="22" x2={x + 23} y2="72" stroke="#1a1d21" strokeWidth="3" /></g>)}
          {has('b_mirror') && <g className="gym-mirror"><rect x="160" y="44" width="80" height="80" rx="3" fill="url(#gmirror)" stroke="#8f9aa5" strokeWidth="2" /><path d="M172 50 L190 50 L166 118 L160 118 Z" fill="#fff" opacity="0.14" /></g>}
          <text x="200" y="32" textAnchor="middle" fill="#fff" stroke="#e8222f" strokeWidth="1.2" fontSize={label.length > 16 ? 14 : 18} fontWeight="900" fontStyle="italic" fontFamily="sans-serif" style={{ filter: 'drop-shadow(0 0 4px #e8222f)' }}>{label}</text>
        </g>
      )}
      {sides && <><polygon points="0,0 40,0 40,130 0,170" fill="rgba(0,0,0,0.28)" /><polygon points="400,0 360,0 360,130 400,170" fill="rgba(0,0,0,0.28)" /></>}
      {sides && <rect x="0" y="0" width="400" height="4" fill="#2b2f35" />}
      {has('b_lights') && [80, 160, 240, 320].map((x) => <g key={x} className="gym-light"><rect x={x - 12} y="2" width="24" height="5" rx="2" fill="#fff" /><path d={`M${x - 12} 7 L${x - 34} 128 L${x + 34} 128 L${x + 12} 7 Z`} fill="#fff8d6" opacity="0.12" /></g>)}
      {/* Boden (immer da) */}
      <polygon points="40,130 360,130 400,170 400,360 0,360 0,170" fill="url(#gfloor)" />
      {back && <rect x="40" y="126" width="320" height="6" fill="#111316" opacity="0.8" />}
      {floorSt === 'wood'
        ? Array.from({ length: 13 }, (_, i) => <line key={i} x1={40 + i * 26.7} y1="132" x2={-200 + i * 66.7} y2="360" stroke={lineCol} strokeWidth="1.2" />)
        : [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <line key={i} x1={40 + i * 40} y1="132" x2={-160 + i * 90} y2="360" stroke={lineCol} strokeWidth="1.2" />)}
      {[160, 200, 255, 320].map((y) => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={lineCol} strokeWidth="1.2" />)}
      {/* ohne Rückwand: Name auf einem Aufsteller vorne */}
      {!back && <g className="gym-sign"><rect x="18" y="296" width={Math.min(170, label.length * 9 + 26)} height="26" rx="4" fill="#1b1d21" stroke="#e8222f" strokeWidth="2" /><text x={18 + Math.min(170, label.length * 9 + 26) / 2} y="314" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900" fontFamily="sans-serif">{label}</text><rect x="40" y="322" width="4" height="18" fill="#555" /><rect x={Math.min(170, label.length * 9 + 26)} y="322" width="4" height="18" fill="#555" /></g>}
      {/* 2. Etage: Treppe nach unten in der Ecke, Etagen-Schild */}
      {upper && <g className="gym-stairs"><polygon points="300,250 392,250 400,262 400,330 300,330" fill="#2b3038" stroke="#555" strokeWidth="2" />{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={306 + i * 3} y={256 + i * 12} width={84 - i * 3} height="6" fill="#4a515b" />)}<rect x="296" y="236" width="4" height="96" fill="#9aa3ad" /><line x1="298" y1="238" x2="398" y2="238" stroke="#9aa3ad" strokeWidth="3" /><text x="345" y="248" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800" fontFamily="sans-serif">↓ Erdgeschoss</text></g>}
      {upper && back && <g><rect x="44" y="104" width="58" height="16" rx="3" fill="#e8222f" /><text x="73" y="116" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900" fontFamily="sans-serif">2. ETAGE</text></g>}
    </svg>
  );
}
