// Der Gym-Raum: Wand, Boden, Ausbaustufe, Gym-Name, Empore – Objekte frei verschiebbar (Bearbeiten-Modus).
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { DECO_BY_ID, GYM_ITEMS, type GymObject, type GymState, type GymTier } from '../lib/gym';
import { DecoArt } from './DecoArt';
import { MachineArt, machineWidth } from './MachineArt';

const MACHINE = new Map(GYM_ITEMS.map((i) => [i.id, i]));
const FLOOR_TOP = 36; // Wand endet bei 36 % der Raumhöhe
const EMPORE = { top: 12, floor: 31 }; // Empore: Geländer oben, Boden der Empore

export const nameOf = (id: string) => MACHINE.get(id)?.name ?? DECO_BY_ID.get(id)?.name ?? id;
export const rarityOf = (id: string) => MACHINE.get(id)?.rarity ?? (DECO_BY_ID.get(id)?.chest ? 'legendär' : 'gewöhnlich');

/** Bildschirmposition (in % des Raums) eines Objekts; scale = Tiefe (hinten kleiner) */
function place(o: GymObject) {
  if (o.level === 1) return { left: 6 + o.x * 0.88, bottom: 100 - EMPORE.floor, scale: 0.5, z: 4 };
  const ground = FLOOR_TOP + (o.y / 100) * (97 - FLOOR_TOP);
  return { left: 4 + o.x * 0.92, bottom: 100 - ground, scale: 0.6 + 0.4 * (o.y / 100), z: 10 + Math.round(o.y) };
}
/** Deko von der Seite: schmaler, rechts gespiegelt; von hinten gespiegelt */
const decoTransform = (rot: number) => ['', ' scaleX(0.6)', ' scaleX(-1)', ' scaleX(-0.6)'][rot] ?? '';
/** Breite eines Objekts in Metern (für den Rand des Raums) */
function widthOf(o: GymObject) {
  const m = MACHINE.get(o.id), d = DECO_BY_ID.get(o.id);
  if (m) return machineWidth(m.pattern, o.rot ?? 0);
  return d ? d.h * 1.1 * (o.rot === 1 || o.rot === 3 ? 0.6 : 1) : 1;
}

/** Pfeil: aus welcher Richtung man das Gerät gerade sieht */
const VIEW_ARROWS = ['👁 vorne', '👁 links', '👁 hinten', '👁 rechts'];

export function GymRoom({ gym, tier, edit = false, selected, onSelect, onMove, onOpen }: {
  gym: GymState; tier: GymTier; edit?: boolean; selected?: string | null; onOpen?: (id: string, rot: number) => void;
  onSelect?: (id: string | null) => void; onMove?: (id: string, pos: Pick<GymObject, 'x' | 'y' | 'level'>) => void;
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
    if (tier.empore && py < EMPORE.floor + 3 && py > EMPORE.top - 6) return { x: Math.max(0, Math.min(100, (px - 6) / 0.88)), y: 0, level: 1 as const };
    return { x, y: Math.max(0, Math.min(100, ((py - FLOOR_TOP) / (97 - FLOOR_TOP)) * 100)), level: 0 as const };
  };
  return (
    <div ref={ref} className={`gym-room tier-${tier.id}${edit ? ' editing' : ''}`} id="gym-room"
      onPointerMove={(e) => { if (drag.current && onMove) onMove(drag.current, toPos(e)); }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onClick={(e) => { if (edit && e.target === e.currentTarget) onSelect?.(null); }}>
      <RoomBackdrop tier={tier} name={gym.name} />
      {gym.objects.map((o) => {
        const p = place(o);
        const machine = MACHINE.get(o.id), deco = DECO_BY_ID.get(o.id);
        const rot = o.rot ?? 0;
        // gemeinsamer Maßstab: echte Raumbreite in Metern → alle Geräte in echten Größenverhältnissen
        const pxPerM = (w / tier.meters) * p.scale;
        const half = Math.min(45, ((widthOf(o) * pxPerM) / 2 / w) * 100);
        const left = Math.max(half, Math.min(100 - half, p.left));
        return (
          <div key={o.id} className={`gym-obj r-${rarityOf(o.id)}${selected === o.id ? ' selected' : ''}`} data-obj={o.id} data-rot={rot} data-scale={p.scale}
            style={{ left: `${left}%`, bottom: `${p.bottom}%`, zIndex: p.z, transform: 'translateX(-50%)' }}
            onClick={() => { if (!edit) onOpen?.(o.id, rot); }}
            onPointerDown={(e) => { if (!edit) return; e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = o.id; onSelect?.(o.id); }}>
            {machine ? <MachineArt pattern={machine.pattern} view={rot} pxPerM={pxPerM} />
              : deco ? <div style={{ transform: decoTransform(rot) }}><DecoArt item={deco} height={Math.round(deco.h * pxPerM)} /></div> : null}
            {edit && selected === o.id && <span className="gym-obj-view" aria-hidden="true">{VIEW_ARROWS[rot]}</span>}
            {edit && <span className="gym-obj-name">{nameOf(o.id)}</span>}
          </div>
        );
      })}
      {tier.empore && <EmporeRailing />}
    </div>
  );
}

function EmporeRailing() {
  return (
    <svg className="gym-railing" viewBox="0 0 400 360" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y={EMPORE.floor * 3.6} width="400" height="7" fill="#3b4048" />
      <line x1="0" y1={EMPORE.floor * 3.6 - 22} x2="400" y2={EMPORE.floor * 3.6 - 22} stroke="#9aa3ad" strokeWidth="3" />
      {Array.from({ length: 21 }, (_, i) => <line key={i} x1={i * 20} y1={EMPORE.floor * 3.6 - 22} x2={i * 20} y2={EMPORE.floor * 3.6} stroke="#9aa3ad" strokeWidth="1.5" />)}
      <path d="M330 112 l20 0 l-26 60 l-20 0 z" fill="#2b3038" stroke="#555" />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={334 - i * 6} y1={122 + i * 11} x2={352 - i * 6} y2={122 + i * 11} stroke="#666" strokeWidth="2" />)}
    </svg>
  );
}

/** Raum je nach Ausbaustufe: Garage (Beton, Rolltor) → Studio (Spiegel) → Halle (Fenster, Licht) → Elevation Center (Empore) */
function RoomBackdrop({ tier, name }: { tier: GymTier; name: string }) {
  const t = tier.id;
  const wall = t === 'garage' ? ['#4a4d52', '#5a5d62'] : t === 'studio' ? ['#2b3038', '#3a414b'] : t === 'halle' ? ['#283240', '#3a4658'] : ['#1f2a36', '#33445a'];
  const label = (name || 'MEIN GYM').toUpperCase();
  return (
    <svg className="gym-room-bg" viewBox="0 0 400 360" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={wall[0]} /><stop offset="1" stopColor={wall[1]} /></linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t === 'garage' ? '#6b6e73' : '#23262b'} /><stop offset="1" stopColor={t === 'garage' ? '#55585c' : '#15171a'} /></linearGradient>
        <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fb3c4" stopOpacity="0.55" /><stop offset="0.5" stopColor="#dfe8ef" stopOpacity="0.35" /><stop offset="1" stopColor="#7d8f9e" stopOpacity="0.5" /></linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7cb6e8" /><stop offset="1" stopColor="#cfe6f7" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="130" fill="url(#wall)" />
      <polygon points="0,0 40,0 40,130 0,170" fill="rgba(0,0,0,0.25)" />
      <polygon points="400,0 360,0 360,130 400,170" fill="rgba(0,0,0,0.25)" />
      {t === 'garage' ? (
        <>
          <rect x="230" y="22" width="120" height="108" fill="#7d8287" stroke="#3a3d41" strokeWidth="3" />
          {Array.from({ length: 9 }, (_, i) => <line key={i} x1="230" y1={34 + i * 11} x2="350" y2={34 + i * 11} stroke="#5a5e63" strokeWidth="2" />)}
          <rect x="60" y="30" width="60" height="40" rx="3" fill="url(#sky)" stroke="#3a3d41" strokeWidth="4" />
        </>
      ) : (
        <>
          <rect x="44" y="18" width="62" height="54" rx="4" fill="url(#sky)" stroke="#1a1d21" strokeWidth="4" />
          <line x1="75" y1="18" x2="75" y2="72" stroke="#1a1d21" strokeWidth="3" />
          {t !== 'studio' && <><rect x="294" y="18" width="62" height="54" rx="4" fill="url(#sky)" stroke="#1a1d21" strokeWidth="4" /><line x1="325" y1="18" x2="325" y2="72" stroke="#1a1d21" strokeWidth="3" /></>}
          <rect x="120" y="44" width={t === 'studio' ? 236 : 162} height="80" rx="3" fill="url(#mirror)" stroke="#8f9aa5" strokeWidth="2" />
          <path d="M140 50 L165 50 L130 116 L122 116 Z" fill="#fff" opacity="0.12" />
          {t !== 'studio' && Array.from({ length: 5 }, (_, i) => <rect key={i} x={60 + i * 70} y="2" width="40" height="5" rx="2" fill="#fff" opacity="0.85" />)}
        </>
      )}
      <text x="200" y={t === 'garage' ? 18 : 36} textAnchor="middle" fill="#fff" stroke="#e8222f" strokeWidth="1.2" fontSize={label.length > 16 ? 15 : 19} fontWeight="900" fontStyle="italic" fontFamily="sans-serif" style={{ filter: 'drop-shadow(0 0 4px #e8222f)' }}>{label}</text>
      <polygon points="40,130 360,130 400,170 400,360 0,360 0,170" fill="url(#floor)" />
      <rect x="40" y="126" width="320" height="6" fill="#111316" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => <line key={i} x1={40 + i * 40} y1="132" x2={-160 + i * 90} y2="360" stroke={t === 'garage' ? '#5e6166' : '#2f343b'} strokeWidth="1.5" />)}
      {[160, 200, 255, 320].map((y) => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke={t === 'garage' ? '#5e6166' : '#2f343b'} strokeWidth="1.5" />)}
      {tier.empore && <rect x="0" y="0" width="400" height={EMPORE.floor * 3.6} fill="rgba(10,14,20,0.35)" />}
    </svg>
  );
}
