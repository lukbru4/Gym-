// Der Begleiter als Zeichnung: Ei → Baby → Junior → Kraftpaket → Legende. Muskeln wachsen dort, wo man trainiert;
// Gesicht zeigt die Stimmung. Drei Arten: Drache, Wolf, Gorilla.
import type { Group, Mood, Species } from '../lib/adventure';
import { SPECIES } from '../lib/adventure';

const COLORS: Record<Species, { body: string; dark: string; belly: string; accent: string }> = {
  drache: { body: '#4caf6a', dark: '#2b7a43', belly: '#f2d675', accent: '#e8590c' },
  wolf: { body: '#9aa5b1', dark: '#5f6b77', belly: '#e9edf1', accent: '#4dabf7' },
  gorilla: { body: '#4a3b33', dark: '#2a201b', belly: '#b08968', accent: '#e8222f' },
};
const SCALE = [0.5, 0.72, 0.84, 0.94, 1];

export function PetArt({ species, stageIdx, shares, mood = 'froh', progress = 0, size = 180, className = '' }: {
  species: Species; stageIdx: number; shares: Record<Group, number>; mood?: Mood; progress?: number; size?: number; className?: string;
}) {
  const label = `${SPECIES.find((s) => s.id === species)?.name ?? ''}, ${['Ei', 'Baby', 'Junior', 'Kraftpaket', 'Legende'][stageIdx]}`;
  return (
    <svg className={`pet-art ${className}`} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label}>
      <ellipse cx="100" cy="192" rx="56" ry="7" fill="rgba(0,0,0,0.22)" />
      {stageIdx === 0 ? <Egg species={species} progress={progress} /> : <Creature species={species} stageIdx={stageIdx} shares={shares} mood={mood} />}
    </svg>
  );
}

function Egg({ species, progress }: { species: Species; progress: number }) {
  const [l, d] = SPECIES.find((s) => s.id === species)!.egg;
  const cracks = Math.min(3, Math.floor(progress * 4));
  return (
    <g className="pet-egg">
      <path d="M100 60 C 132 60 150 120 150 148 C 150 176 128 192 100 192 C 72 192 50 176 50 148 C 50 120 68 60 100 60 Z" fill={l} stroke={d} strokeWidth="3" />
      {[[80, 110, 9], [118, 132, 12], [92, 162, 8], [124, 98, 6]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={d} opacity="0.55" />)}
      <path d="M78 84 q8 -14 22 -18" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5" />
      {['M100 62 L94 80 L104 92 L98 106', 'M60 130 L74 136 L70 148 L82 154', 'M140 128 L128 136 L134 148 L122 156'].slice(0, cracks).map((c) => <path key={c} d={c} stroke="#222" strokeWidth="2.5" fill="none" strokeLinejoin="round" />)}
    </g>
  );
}

function Creature({ species, stageIdx, shares, mood }: { species: Species; stageIdx: number; shares: Record<Group, number>; mood: Mood }) {
  const c = COLORS[species];
  // Muskelwachstum: bei Babys kaum, bei Legenden voll
  const grow = [0, 0.25, 0.6, 0.85, 1][stageIdx];
  const g = (k: Group) => shares[k] * grow;
  const chest = 30 + 10 * g('brust') + 8 * g('ruecken'), waist = 22 + 2 * g('bauch');
  const sh = 6 + 7 * g('schultern'), arm = 7 + 8 * g('arme') + (species === 'gorilla' ? 4 : 0), leg = 11 + 9 * g('beine');
  const k = SCALE[stageIdx];
  const headR = 26 + (stageIdx === 1 ? 4 : 0);
  return (
    <g transform={`translate(100 190) scale(${k}) translate(-100 -190)`}>
      {/* Schwanz / Flügel hinter dem Körper */}
      {species === 'drache' && <>
        <path d="M70 100 Q30 70 26 110 Q44 100 52 120 Z" fill={c.dark} opacity="0.9" />
        <path d="M130 100 Q170 70 174 110 Q156 100 148 120 Z" fill={c.dark} opacity="0.9" />
        <path d="M118 170 Q160 178 168 150 L176 156 L170 140 Q164 166 120 160 Z" fill={c.body} stroke={c.dark} strokeWidth="2" />
      </>}
      {species === 'wolf' && <path d="M118 166 Q166 170 160 128 Q176 160 150 178 Q130 184 116 176 Z" fill={c.body} stroke={c.dark} strokeWidth="2" />}
      {/* Beine */}
      {[-1, 1].map((s) => <rect key={s} x={100 + s * 15 - leg / 2} y="140" width={leg} height="48" rx={leg / 2} fill={c.body} stroke={c.dark} strokeWidth="2" />)}
      {[-1, 1].map((s) => <ellipse key={s} cx={100 + s * 16} cy="188" rx={leg / 2 + 5} ry="5" fill={c.dark} />)}
      {/* Rumpf: breiter Brustkorb (Brust/Rücken) zur Taille */}
      <path d={`M${100 - chest} 96 Q${100 - chest - 4} 120 ${100 - waist} 146 L${100 + waist} 146 Q${100 + chest + 4} 120 ${100 + chest} 96 Q100 86 ${100 - chest} 96 Z`} fill={c.body} stroke={c.dark} strokeWidth="2" />
      <ellipse cx="100" cy="126" rx={waist - 4} ry="20" fill={c.belly} opacity="0.9" />
      {/* Brustmuskeln und Bauchmuskeln */}
      {g('brust') > 0.3 && <path d={`M${100 - chest + 8} 104 Q${100 - chest / 2} 116 98 108 M${100 + chest - 8} 104 Q${100 + chest / 2} 116 102 108`} stroke={c.dark} strokeWidth="2" fill="none" opacity="0.6" />}
      {g('bauch') > 0.3 && [0, 1, 2].map((i) => <g key={i} opacity="0.5"><line x1="100" y1={114 + i * 9} x2="100" y2={121 + i * 9} stroke={c.dark} strokeWidth="1.5" /><line x1="92" y1={118 + i * 9} x2="108" y2={118 + i * 9} stroke={c.dark} strokeWidth="1.5" /></g>)}
      {/* Arme mit Schultern */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${100 + s * (chest - 2)} 100 Q${100 + s * (chest + 14)} 122 ${100 + s * (chest + 8)} 150`} stroke={c.dark} strokeWidth={arm + 3} fill="none" strokeLinecap="round" />
          <path d={`M${100 + s * (chest - 2)} 100 Q${100 + s * (chest + 14)} 122 ${100 + s * (chest + 8)} 150`} stroke={c.body} strokeWidth={arm} fill="none" strokeLinecap="round" />
          {g('arme') > 0.35 && <ellipse cx={100 + s * (chest + 9)} cy="116" rx={arm / 2.2} ry={arm / 1.6} fill={c.body} stroke={c.dark} strokeWidth="1.5" />}
          <circle cx={100 + s * (chest - 1)} cy="98" r={sh} fill={c.body} stroke={c.dark} strokeWidth="2" />
          <circle cx={100 + s * (chest + 8)} cy="153" r={arm / 2 + 3} fill={species === 'gorilla' ? c.belly : c.body} stroke={c.dark} strokeWidth="2" />
        </g>
      ))}
      {/* Kopf */}
      {species === 'wolf' && [-1, 1].map((s) => <path key={s} d={`M${100 + s * 10} 52 L${100 + s * 24} 30 L${100 + s * 26} 58 Z`} fill={c.body} stroke={c.dark} strokeWidth="2" />)}
      {species === 'drache' && [-1, 1].map((s) => <path key={s} d={`M${100 + s * 12} 50 Q${100 + s * 20} 34 ${100 + s * 30} 30 Q${100 + s * 22} 42 ${100 + s * 20} 54 Z`} fill="#f2d675" stroke={c.dark} strokeWidth="1.5" />)}
      {species === 'gorilla' && [-1, 1].map((s) => <circle key={s} cx={100 + s * headR} cy="72" r="7" fill={c.body} stroke={c.dark} strokeWidth="2" />)}
      <circle cx="100" cy="70" r={headR} fill={c.body} stroke={c.dark} strokeWidth="2" />
      {species === 'gorilla' && <ellipse cx="100" cy="78" rx="18" ry="15" fill={c.belly} />}
      {species === 'wolf' && <ellipse cx="100" cy="82" rx="12" ry="9" fill={c.belly} stroke={c.dark} strokeWidth="1.5" />}
      {species === 'drache' && <ellipse cx="100" cy="82" rx="14" ry="9" fill={c.body} stroke={c.dark} strokeWidth="1.5" />}
      <Face mood={mood} />
      {stageIdx === 4 && <path d="M84 44 L88 30 L95 40 L100 26 L105 40 L112 30 L116 44 Z" fill="#f2c94c" stroke="#b7891a" strokeWidth="1.5" />}
      {stageIdx >= 3 && <rect x={100 - waist - 2} y="142" width={(waist + 2) * 2} height="7" rx="2" fill={stageIdx === 4 ? '#f2c94c' : c.accent} />}
    </g>
  );
}

function Face({ mood }: { mood: Mood }) {
  return (
    <g className={`pet-face mood-${mood}`}>
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={100 + s * 10} cy="66" rx="5" ry={mood === 'muede' ? 2 : 6} fill="#fff" />
          <circle cx={100 + s * 10} cy={mood === 'muede' ? 66 : 67} r={mood === 'muede' ? 1.8 : 3} fill="#111" />
        </g>
      ))}
      {mood === 'froh' && <path d="M92 84 Q100 92 108 84" stroke="#111" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
      {mood === 'muede' && <><line x1="94" y1="86" x2="106" y2="86" stroke="#111" strokeWidth="2.5" strokeLinecap="round" /><text x="128" y="50" fontSize="14" fontWeight="800" fill="#4dabf7">z</text><text x="138" y="40" fontSize="10" fontWeight="800" fill="#4dabf7">z</text></>}
      {mood === 'traurig' && <><path d="M92 89 Q100 82 108 89" stroke="#111" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M88 72 q-2 6 0 8 q3 0 2 -8" fill="#4dabf7" /></>}
    </g>
  );
}
