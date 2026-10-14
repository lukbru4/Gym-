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

const ART: Record<string, () => ReactElement> = {
  gym_plant: () => (<g><path d="M48 104 h24 l4 -30 h-32 z" fill="#b5651d" stroke="#7a4210" strokeWidth="2" />{[[-18, -40], [0, -54], [18, -42], [-28, -22], [28, -24]].map(([dx, dy], i) => <path key={i} d={`M60 76 Q${60 + dx / 2} ${76 + dy / 2} ${60 + dx} ${76 + dy}`} stroke="#2f7d32" strokeWidth="9" strokeLinecap="round" fill="none" />)}</g>),
  gym_bag: () => (<g><line x1="60" y1="2" x2="60" y2="16" stroke="#777" strokeWidth="3" /><rect x="40" y="16" width="40" height="78" rx="14" fill="#b71c1c" stroke="#5a0d0d" strokeWidth="3" /><rect x="40" y="30" width="40" height="6" fill="#222" /><rect x="40" y="74" width="40" height="6" fill="#222" /><ellipse cx="60" cy="106" rx="24" ry="4" fill="rgba(0,0,0,0.35)" /></g>),
  gym_dbrack: () => (<g><path d="M14 104 L22 50 h76 l8 54" fill="none" stroke="#3d434b" strokeWidth="5" /><line x1="18" y1="72" x2="102" y2="72" stroke="#3d434b" strokeWidth="5" />{[0, 1, 2, 3].map((i) => <g key={i}><rect x={22 + i * 20} y="40" width="5" height="12" fill="#222" /><rect x={33 + i * 20 - 6} y="44" width="10" height="4" fill="#aaa" /><rect x={36 + i * 20} y="40" width="5" height="12" fill="#222" /></g>)}{[0, 1, 2, 3].map((i) => <g key={i}><rect x={20 + i * 21} y="60" width="6" height="14" fill="#222" /><rect x={32 + i * 21 - 6} y="65" width="10" height="4" fill="#aaa" /><rect x={34 + i * 21} y="60" width="6" height="14" fill="#222" /></g>)}</g>),
  gym_kettle: () => (<g>{[0, 1, 2].map((i) => <g key={i}><circle cx={26 + i * 34} cy={88} r={12 + i * 2} fill="#2b2f35" /><path d={`M${18 + i * 34} ${80 - i * 2} q${8 + i} -${16 + i * 2} ${16 + i * 2} 0`} fill="none" stroke="#2b2f35" strokeWidth="5" /></g>)}</g>),
  gym_water: () => (<g><rect x="40" y="44" width="40" height="60" rx="4" fill="#e9ecef" stroke="#adb5bd" strokeWidth="2" /><path d="M44 44 q0 -36 16 -36 q16 0 16 36 z" fill="#74c0fc" opacity="0.8" stroke="#4dabf7" strokeWidth="2" /><rect x="52" y="60" width="16" height="10" rx="2" fill="#495057" /></g>),
  gym_mat: () => (<g><path d="M8 96 L30 78 h82 L96 96 z" fill="#5f3dc4" stroke="#3b2582" strokeWidth="2" /><path d="M8 96 h88 v5 h-88 z" fill="#3b2582" /></g>),
  gym_lamp: () => (<g><line x1="60" y1="2" x2="60" y2="24" stroke="#666" strokeWidth="3" /><rect x="18" y="24" width="84" height="10" rx="5" fill="#fff" style={{ filter: 'drop-shadow(0 0 8px #74c0fc)' }} /><path d="M18 34 L4 100 h112 L102 34 z" fill="#74c0fc" opacity="0.12" /></g>),
  gym_chalk: () => (<g><rect x="30" y="60" width="60" height="40" rx="4" fill="#f1f3f5" stroke="#868e96" strokeWidth="2" /><ellipse cx="60" cy="60" rx="30" ry="6" fill="#fff" stroke="#868e96" strokeWidth="2" /><text x="60" y="86" textAnchor="middle" fontSize="11" fontWeight="800" fill="#495057" fontFamily="sans-serif">CHALK</text></g>),
  gym_rings: () => (<g><line x1="44" y1="0" x2="44" y2="66" stroke="#c49a5a" strokeWidth="3" /><line x1="76" y1="0" x2="76" y2="66" stroke="#c49a5a" strokeWidth="3" /><circle cx="44" cy="76" r="10" fill="none" stroke="#8b5a2b" strokeWidth="5" /><circle cx="76" cy="76" r="10" fill="none" stroke="#8b5a2b" strokeWidth="5" /></g>),
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
      <svg viewBox={`0 0 ${W} 110`} className="deco-svg" aria-hidden="true">{art ? art() : <circle cx="60" cy="60" r="30" fill="#888" />}</svg>
    </div>
  );
}
