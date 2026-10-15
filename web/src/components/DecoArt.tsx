// Gezeichnete Deko & Schilder für „Mein Gym“ (SVG, ohne fremde Bilder).
import type { ReactElement } from 'react';
import type { DecoItem } from '../lib/gym';

const W = 120;
function Sign({ text, color, neon }: { text: string; color: string; neon?: boolean }) {
  const long = text.length > 10;
  return (
    <svg viewBox={`0 0 ${W} 110`} className="deco-svg" aria-hidden="true">
      {neon ? (
        <>
          <rect x="6" y="18" width="108" height="46" rx="10" fill="#120a18" stroke={color} strokeWidth="3" />
          <text x="60" y="48" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize={long ? 13 : 17} fill="#fff" stroke={color} strokeWidth="1.2" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>{text}</text>
          <line x1="40" y1="64" x2="36" y2="106" stroke="#444" strokeWidth="3" /><line x1="80" y1="64" x2="84" y2="106" stroke="#444" strokeWidth="3" />
        </>
      ) : (
        <>
          <line x1="30" y1="60" x2="30" y2="106" stroke="#5c636d" strokeWidth="5" /><line x1="90" y1="60" x2="90" y2="106" stroke="#5c636d" strokeWidth="5" />
          <rect x="4" y="14" width="112" height="50" rx="6" fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
          <rect x="9" y="19" width="102" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <text x="60" y={long ? 43 : 45} textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize={long ? 11 : 15} fill="#fff" letterSpacing="0.5">{text}</text>
        </>
      )}
    </svg>
  );
}

/** Hängende Deko: Ausschnitt eng um die Zeichnung, damit die Kette oben direkt ansetzt */
const CROP: Record<string, string> = { gym_bag: '34 14 52 82', gym_rings: '28 0 64 88', gym_lamp: '12 18 96 22' };

const ART: Record<string, () => ReactElement> = {
  gym_plant: () => (<g><path d="M48 104 h24 l4 -30 h-32 z" fill="#b5651d" stroke="#7a4210" strokeWidth="2" />{[[-18, -40], [0, -54], [18, -42], [-28, -22], [28, -24]].map(([dx, dy], i) => <path key={i} d={`M60 76 Q${60 + dx / 2} ${76 + dy / 2} ${60 + dx} ${76 + dy}`} stroke="#2f7d32" strokeWidth="9" strokeLinecap="round" fill="none" />)}</g>),
  gym_bag: () => (<g><rect x="40" y="16" width="40" height="78" rx="14" fill="#b71c1c" stroke="#5a0d0d" strokeWidth="3" /><rect x="40" y="30" width="40" height="6" fill="#222" /><rect x="40" y="74" width="40" height="6" fill="#222" /></g>),
  gym_dbrack: () => (<g><path d="M14 104 L22 50 h76 l8 54" fill="none" stroke="#3d434b" strokeWidth="5" /><line x1="18" y1="72" x2="102" y2="72" stroke="#3d434b" strokeWidth="5" />{[0, 1, 2, 3].map((i) => <g key={i}><rect x={22 + i * 20} y="40" width="5" height="12" fill="#222" /><rect x={33 + i * 20 - 6} y="44" width="10" height="4" fill="#aaa" /><rect x={36 + i * 20} y="40" width="5" height="12" fill="#222" /></g>)}{[0, 1, 2, 3].map((i) => <g key={i}><rect x={20 + i * 21} y="60" width="6" height="14" fill="#222" /><rect x={32 + i * 21 - 6} y="65" width="10" height="4" fill="#aaa" /><rect x={34 + i * 21} y="60" width="6" height="14" fill="#222" /></g>)}</g>),
  gym_kettle: () => (<g>{[0, 1, 2].map((i) => <g key={i}><circle cx={26 + i * 34} cy={88} r={12 + i * 2} fill="#2b2f35" /><path d={`M${18 + i * 34} ${80 - i * 2} q${8 + i} -${16 + i * 2} ${16 + i * 2} 0`} fill="none" stroke="#2b2f35" strokeWidth="5" /></g>)}</g>),
  gym_water: () => (<g><rect x="40" y="44" width="40" height="60" rx="4" fill="#e9ecef" stroke="#adb5bd" strokeWidth="2" /><path d="M44 44 q0 -36 16 -36 q16 0 16 36 z" fill="#74c0fc" opacity="0.8" stroke="#4dabf7" strokeWidth="2" /><rect x="52" y="60" width="16" height="10" rx="2" fill="#495057" /></g>),
  gym_mat: () => (<g><path d="M8 96 L30 78 h82 L96 96 z" fill="#5f3dc4" stroke="#3b2582" strokeWidth="2" /><path d="M8 96 h88 v5 h-88 z" fill="#3b2582" /></g>),
  gym_lamp: () => (<g><rect x="18" y="24" width="84" height="10" rx="5" fill="#fff" style={{ filter: 'drop-shadow(0 0 8px #74c0fc)' }} /></g>),
  gym_chalk: () => (<g><rect x="30" y="60" width="60" height="40" rx="4" fill="#f1f3f5" stroke="#868e96" strokeWidth="2" /><ellipse cx="60" cy="60" rx="30" ry="6" fill="#fff" stroke="#868e96" strokeWidth="2" /><text x="60" y="86" textAnchor="middle" fontSize="11" fontWeight="800" fill="#495057" fontFamily="sans-serif">CHALK</text></g>),
  gym_rings: () => (<g><line x1="44" y1="0" x2="44" y2="66" stroke="#c49a5a" strokeWidth="3" /><line x1="76" y1="0" x2="76" y2="66" stroke="#c49a5a" strokeWidth="3" /><circle cx="44" cy="76" r="10" fill="none" stroke="#8b5a2b" strokeWidth="5" /><circle cx="76" cy="76" r="10" fill="none" stroke="#8b5a2b" strokeWidth="5" /></g>),
  // ---- Vintage (Holz-Gym) ----
  gym_v_clubs: () => (<g>{[0, 1, 2].map((i) => <path key={i} d={`M${34 + i * 26} 104 q-9 -2 -9 -18 q0 -22 6 -40 q2 -8 3 -26 h2 q1 18 3 26 q6 18 6 40 q0 16 -9 18 z`} fill={['#c08a52', '#a8703c', '#d29b62'][i]} stroke="#6b4423" strokeWidth="2" />)}{[0, 1, 2].map((i) => <ellipse key={i} cx={35 + i * 26} cy={18} rx="4" ry="3" fill="#6b4423" />)}</g>),
  gym_v_medball: () => (<g><ellipse cx="60" cy="106" rx="30" ry="4" fill="rgba(0,0,0,0.3)" /><circle cx="60" cy="74" r="30" fill="#8a4b22" stroke="#4e2a12" strokeWidth="3" /><path d="M30 74 h60 M60 44 v60" stroke="#4e2a12" strokeWidth="2" strokeDasharray="3 3" /><path d="M40 52 q10 -8 22 -6" stroke="#c98a55" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" /></g>),
  gym_v_ladder: () => (<g><rect x="22" y="2" width="8" height="104" fill="#b07a45" stroke="#6b4423" /><rect x="90" y="2" width="8" height="104" fill="#b07a45" stroke="#6b4423" />{Array.from({ length: 12 }, (_, i) => <rect key={i} x="30" y={8 + i * 8.4} width="60" height="4" rx="2" fill="#d6a26a" stroke="#8b5a2b" strokeWidth="0.8" />)}</g>),
  gym_v_scale: () => (<g><rect x="34" y="94" width="52" height="12" rx="3" fill="#2b2b2b" /><rect x="44" y="84" width="32" height="10" fill="#3a3a3a" /><rect x="57" y="22" width="6" height="64" fill="#3a3a3a" /><circle cx="60" cy="22" r="18" fill="#efe3c4" stroke="#b08d3c" strokeWidth="4" /><line x1="60" y1="22" x2="70" y2="14" stroke="#7a1f1f" strokeWidth="2" />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={60 + 13 * Math.cos(i * 0.785)} y1={22 + 13 * Math.sin(i * 0.785)} x2={60 + 16 * Math.cos(i * 0.785)} y2={22 + 16 * Math.sin(i * 0.785)} stroke="#555" strokeWidth="1.5" />)}</g>),
  gym_v_rope: () => (<g><rect x="30" y="0" width="60" height="7" fill="#8b5a2b" /><path d="M60 7 q-4 12 0 24 q4 12 0 24 q-4 12 0 24 q4 12 0 22" stroke="#c9a66b" strokeWidth="7" fill="none" strokeLinecap="round" /><path d="M60 7 q-4 12 0 24 q4 12 0 24 q-4 12 0 24 q4 12 0 22" stroke="#8b6b3a" strokeWidth="2" strokeDasharray="2 4" fill="none" /><circle cx="60" cy="102" r="5" fill="#a07a42" /></g>),
  gym_v_poster: () => (<g><line x1="40" y1="104" x2="48" y2="60" stroke="#6b4423" strokeWidth="4" /><line x1="80" y1="104" x2="72" y2="60" stroke="#6b4423" strokeWidth="4" /><rect x="26" y="4" width="68" height="78" fill="#efe0bd" stroke="#6b4423" strokeWidth="3" /><text x="60" y="18" textAnchor="middle" fontSize="9" fontWeight="900" fill="#7a1f1f" fontFamily="serif">STRONGMAN</text><circle cx="60" cy="34" r="6" fill="#3b2a1a" /><path d="M48 46 h24 l-4 22 h-16 z" fill="#3b2a1a" /><path d="M40 40 h40" stroke="#3b2a1a" strokeWidth="3" /><circle cx="38" cy="40" r="5" fill="#3b2a1a" /><circle cx="82" cy="40" r="5" fill="#3b2a1a" /><text x="60" y="78" textAnchor="middle" fontSize="8" fontWeight="800" fill="#7a1f1f" fontFamily="serif">1920</text></g>),
  gym_v_dbrack: () => (<g><path d="M12 104 L18 54 h84 l6 50" fill="none" stroke="#8b5a2b" strokeWidth="6" /><rect x="14" y="70" width="92" height="6" fill="#b07a45" />{[0, 1, 2, 3].map((i) => <g key={i}><circle cx={24 + i * 24} cy="46" r="7" fill="#2b2b2b" /><circle cx={38 + i * 24} cy="46" r="7" fill="#2b2b2b" /><rect x={24 + i * 24} y="44" width="14" height="4" fill="#c9a24a" /></g>)}{[0, 1, 2].map((i) => <g key={i}><circle cx={28 + i * 30} cy="64" r="6" fill="#2b2b2b" /><circle cx={44 + i * 30} cy="64" r="6" fill="#2b2b2b" /><rect x={28 + i * 30} y="62" width="16" height="4" fill="#c9a24a" /></g>)}</g>),
  gym_v_ring: () => (<g><rect x="8" y="94" width="104" height="12" fill="#5c3b1e" /><rect x="10" y="10" width="8" height="86" fill="#c9a24a" stroke="#7a5b1a" />{[30, 50, 70].map((y, i) => <path key={i} d={`M18 ${y} L112 ${y + 8}`} stroke={['#c92a2a', '#f1f3f5', '#1c7ed6'][i]} strokeWidth="4" />)}<rect x="6" y="6" width="16" height="8" rx="2" fill="#7a1f1f" /></g>),
  chest_trophy: () => (<g><path d="M40 20 h40 v20 q0 22 -20 26 q-20 -4 -20 -26 z" fill="#f2c94c" stroke="#b7891a" strokeWidth="2" /><path d="M40 26 q-14 0 -12 12 q2 10 14 10 M80 26 q14 0 12 12 q-2 10 -14 10" fill="none" stroke="#b7891a" strokeWidth="3" /><rect x="54" y="66" width="12" height="16" fill="#d4a52a" /><rect x="40" y="82" width="40" height="10" rx="2" fill="#3b2f1a" /><rect x="32" y="92" width="56" height="12" rx="2" fill="#2b2210" /></g>),
  chest_golddb: () => (<g><rect x="18" y="58" width="84" height="44" rx="4" fill="#3b2f1a" /><rect x="26" y="40" width="10" height="28" rx="2" fill="#f2c94c" /><rect x="36" y="48" width="48" height="10" fill="#e0b84a" /><rect x="84" y="40" width="10" height="28" rx="2" fill="#f2c94c" /><path d="M30 42 l3 -6 l3 6" fill="#fff" opacity="0.7" /></g>),
  chest_belt: () => (<g><rect x="14" y="20" width="92" height="76" rx="4" fill="rgba(200,230,255,0.25)" stroke="#adb5bd" strokeWidth="2" /><rect x="24" y="48" width="72" height="18" rx="6" fill="#212529" /><ellipse cx="60" cy="57" rx="16" ry="12" fill="#f2c94c" stroke="#b7891a" strokeWidth="2" /><rect x="10" y="96" width="100" height="8" fill="#343a40" /></g>),
  chest_statue: () => (<g><rect x="34" y="88" width="52" height="16" fill="#adb5bd" /><circle cx="60" cy="22" r="9" fill="#d8dde3" /><path d="M48 34 h24 l6 26 l-10 2 l-2 26 h-12 l-2 -26 l-10 -2 z" fill="#d8dde3" stroke="#868e96" /><path d="M48 36 l-18 -14 M72 36 l18 -14" stroke="#d8dde3" strokeWidth="8" strokeLinecap="round" /></g>),
  chest_crown: () => (<g><rect x="36" y="76" width="48" height="28" fill="#3b2f1a" /><path d="M30 70 L36 34 L50 54 L60 26 L70 54 L84 34 L90 70 Z" fill="#f2c94c" stroke="#b7891a" strokeWidth="2" /><circle cx="60" cy="58" r="5" fill="#e03131" /><circle cx="44" cy="62" r="4" fill="#1c7ed6" /><circle cx="76" cy="62" r="4" fill="#2f9e44" /></g>),
};

export function DecoArt({ item, height = 70 }: { item: DecoItem; height?: number }) {
  if (item.kind === 'sign') return <div style={{ height }} className="deco-art"><Sign text={item.text ?? item.name} color={item.color ?? '#333'} neon={item.id.includes('neon')} /></div>;
  const art = ART[item.id];
  return (
    <div style={{ height }} className="deco-art">
      <svg viewBox={CROP[item.id] ?? `0 0 ${W} 110`} className="deco-svg" aria-hidden="true">{art ? art() : <circle cx="60" cy="60" r="30" fill="#888" />}</svg>
    </div>
  );
}
