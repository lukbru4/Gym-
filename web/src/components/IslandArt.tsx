// Die Trainings-Insel: jedes Gebiet steht für eine Muskelgruppe und wächst bzw. vertrocknet mit deinem Training.
import type { ReactElement } from 'react';
import type { Area, Group, Island, Mood, Species } from '../lib/adventure';
import { REGIONS, stateFor } from '../lib/adventure';
import { PetArt } from './PetArt';

/** Farbe zwischen „vertrocknet“ (braun) und „saftig“ (grün) */
const mix = (a: [number, number, number], b: [number, number, number], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
const DRY: [number, number, number] = [176, 146, 98], LUSH: [number, number, number] = [86, 156, 72];
const green = (l: number) => mix(DRY, LUSH, l);
/** Wo der Begleiter steht, je nachdem, was zuletzt trainiert wurde */
/** Schilder an den Gebieten (antippbar) */
const LABEL: Record<Area, [number, number]> = { beine: [104, 30], ruecken: [292, 46], brust: [200, 290], schultern: [350, 228], arme: [70, 252], bauch: [200, 203], cardio: [310, 260] };
const SPOT: Record<Area | 'home', [number, number]> = {
  home: [214, 142], beine: [118, 118], ruecken: [282, 118], brust: [200, 238], schultern: [330, 170], arme: [92, 196], bauch: [200, 172], cardio: [248, 214],
};

export function IslandArt({ island, species, stageIdx, shares, mood, selected, onPick }: {
  island: Island; species?: Species; stageIdx?: number; shares?: Record<Group, number>; mood?: Mood;
  selected?: Area | null; onPick?: (a: Area) => void;
}) {
  const L = island.level;
  const pick = (a: Area) => ({ 'data-area': a, onClick: () => onPick?.(a), className: `isl-area${selected === a ? ' sel' : ''} st-${stateFor(L[a])}`, role: onPick ? 'button' : undefined, tabIndex: onPick ? 0 : undefined, onKeyDown: (e: { key: string }) => { if (e.key === 'Enter') onPick?.(a); } });
  const [px, py] = SPOT[island.last ?? 'home'];
  const trees = 2 + Math.round(L.ruecken * 11), houses = 1 + Math.round(L.arme * 5), flowers = 3 + Math.round(L.bauch * 16), palms = Math.round(L.brust * 3);
  const tree = (x: number, y: number, i: number): ReactElement => L.ruecken < 0.15
    ? <g key={i}><rect x={x - 1.5} y={y - 6} width="3" height="7" fill="#7a5a3a" /></g> // nur Baumstümpfe
    : <g key={i}><rect x={x - 1.2} y={y - 4} width="2.4" height="6" fill="#6b4a2b" /><path d={`M${x} ${y - 20 - L.ruecken * 6} L${x - 8} ${y - 3} L${x + 8} ${y - 3} Z`} fill={mix([196, 140, 60], [34, 110, 52], L.ruecken)} /></g>;
  return (
    <svg className="island-art" viewBox="0 0 400 300" role="img" aria-label={`Trainings-Insel, Ausgewogenheit ${island.balance} %`}>
      <defs>
        <radialGradient id="isea" cx="50%" cy="50%" r="70%"><stop offset="0" stopColor="#7fd3f0" /><stop offset="1" stopColor="#2b8cc4" /></radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#isea)" />
      {[[40, 40], [350, 60], [30, 260], [370, 270]].map(([x, y], i) => <path key={i} d={`M${x - 10} ${y} q5 -4 10 0 q5 4 10 0`} stroke="#d8f3ff" strokeWidth="1.5" fill="none" opacity="0.7" />)}
      {/* Strand (Brust): Sandsaum rund um die Insel, breiter mit mehr Brust-Training */}
      <g {...pick('brust')}>
        <path d="M30 160 C 30 70 120 30 205 34 C 300 38 378 80 374 165 C 370 245 300 282 200 282 C 100 282 30 245 30 160 Z" fill={mix([214, 196, 160], [244, 222, 160], L.brust)} />
      </g>
      {/* Grasland */}
      <path d="M48 160 C 48 84 128 50 205 54 C 290 58 356 94 352 165 C 348 232 286 262 200 262 C 112 262 48 230 48 160 Z" fill={green(Math.max(0.2, island.balance / 100))} />
      {/* Palmen und Sonnenschirm am Strand (über der Wiese, damit man sie sieht) */}
      <g {...pick('brust')}>
        {Array.from({ length: palms }, (_, i) => { const x = 150 + i * 45, y = 276; return <g key={i}><path d={`M${x} ${y} q2 -14 -2 -24`} stroke="#8a5a2b" strokeWidth="2.5" fill="none" /><path d={`M${x - 2} ${y - 24} q-10 -2 -14 6 M${x - 2} ${y - 24} q10 -4 14 4 M${x - 2} ${y - 24} q-2 -10 6 -12`} stroke="#2f8a3a" strokeWidth="3" fill="none" strokeLinecap="round" /></g>; })}
        {L.brust >= 0.5 && <g><path d="M262 262 l0 -14" stroke="#555" strokeWidth="1.5" /><path d="M250 250 q12 -10 24 0 z" fill="#e8222f" /></g>}
      </g>
      {/* Klippen (Schultern) rechts */}
      <g {...pick('schultern')}>
        <path d={`M330 ${130 - L.schultern * 20} L366 ${142 - L.schultern * 24} L372 205 L332 215 Z`} fill="#8a8f98" stroke="#5f646c" strokeWidth="1.5" />
        <path d={`M330 ${130 - L.schultern * 20} L366 ${142 - L.schultern * 24} L364 ${148 - L.schultern * 24} L332 ${137 - L.schultern * 20} Z`} fill={green(L.schultern)} />
        {L.schultern >= 0.5 && [0, 1].map((i) => <path key={i} d={`M${344 + i * 12} ${110 - i * 8} q3 -3 6 0 q3 -3 6 0`} stroke="#333" strokeWidth="1.2" fill="none" />)}
      </g>
      {/* Berge (Beine) links oben */}
      <g {...pick('beine')}>
        {[[80, 1], [118, 1.25], [152, 0.9]].map(([x, f], i) => {
          const h = (34 + L.beine * 38) * f;
          return <g key={i}><path d={`M${x - 30} 128 L${x} ${128 - h} L${x + 30} 128 Z`} fill={mix([150, 120, 86], [96, 128, 92], L.beine)} stroke="#5d5040" strokeWidth="1" />{L.beine >= 0.85 && <path d={`M${x - 8} ${128 - h + 9} L${x} ${128 - h} L${x + 8} ${128 - h + 9} Z`} fill="#fff" />}</g>;
        })}
      </g>
      {/* Fluss (Cardio) von den Bergen zum Meer, mit Wasserfall */}
      <g {...pick('cardio')}>
        <path d="M128 112 C 150 150 180 150 205 190 C 225 222 250 230 262 262 L270 282" fill="none" stroke={L.cardio < 0.15 ? '#a68a5e' : '#3fa9e0'} strokeWidth={3 + L.cardio * 9} strokeLinecap="round" strokeDasharray={L.cardio < 0.15 ? '4 4' : undefined} />
        {L.cardio >= 0.5 && <path d="M124 104 l4 12 m-8 -10 l4 12 m8 -12 l3 11" stroke="#dff4ff" strokeWidth="1.5" />}
        <path d="M128 112 C 150 150 180 150 205 190 C 225 222 250 230 262 262 L270 282" fill="none" stroke="transparent" strokeWidth="18" />
      </g>
      {/* Wald (Rücken) rechts oben */}
      <g {...pick('ruecken')}>
        <rect x="236" y="70" width="96" height="66" fill="transparent" />
        {Array.from({ length: trees }, (_, i) => tree(246 + (i % 5) * 19 + (Math.floor(i / 5) % 2) * 9, 92 + Math.floor(i / 5) * 18, i))}
      </g>
      {/* Dorf (Arme) links unten */}
      <g {...pick('arme')}>
        <rect x="56" y="170" width="78" height="56" fill="transparent" />
        {Array.from({ length: houses }, (_, i) => {
          const x = 66 + (i % 3) * 22, y = 190 + Math.floor(i / 3) * 24;
          return L.arme < 0.15
            ? <g key={i}><rect x={x} y={y} width="14" height="8" fill="#9a8b78" /><path d={`M${x} ${y} l5 -5 l4 3`} stroke="#6b5c48" fill="none" /></g>
            : <g key={i}><rect x={x} y={y} width="15" height="11" fill="#f1e3c8" stroke="#8a6b47" strokeWidth="0.8" /><path d={`M${x - 2} ${y} L${x + 7.5} ${y - 9} L${x + 17} ${y} Z`} fill="#c0392b" /><rect x={x + 6} y={y + 5} width="3.5" height="6" fill="#6b4a2b" /></g>;
        })}
      </g>
      {/* Garten (Bauch) in der Mitte */}
      <g {...pick('bauch')}>
        <ellipse cx="200" cy="172" rx="34" ry="18" fill={L.bauch < 0.15 ? '#9c7b55' : mix([140, 110, 70], [70, 140, 64], L.bauch)} stroke="#6b4a2b" strokeWidth="1" />
        {L.bauch >= 0.15 && Array.from({ length: flowers }, (_, i) => {
          const a = i * 2.4, r = 6 + (i % 4) * 6;
          return <circle key={i} cx={200 + Math.cos(a) * r * 1.6} cy={172 + Math.sin(a) * r * 0.7} r="2.4" fill={['#ffd43b', '#f06595', '#fff', '#ff922b'][i % 4]} />;
        })}
      </g>
      {/* Hütte des Begleiters */}
      <g className="isl-hut">
        <rect x="204" y="128" width="22" height="16" fill="#b07a45" stroke="#6b4423" />
        <path d="M200 128 L215 116 L230 128 Z" fill="#7b4a26" />
        <rect x="212" y="134" width="6" height="10" fill="#5c3b1e" />
      </g>
      {REGIONS.map((r) => {
        const [x, y] = LABEL[r.area], w = 22 + r.muscle.length * 7;
        return (
          <g key={r.area} className={`isl-label${selected === r.area ? ' sel' : ''}`} data-label={r.area} onClick={() => onPick?.(r.area)} role={onPick ? 'button' : undefined} aria-label={`${r.name}: ${r.muscle}`}>
            <rect x={x - w / 2} y={y - 10} width={w} height="19" rx="9.5" fill={selected === r.area ? '#ffd43b' : 'rgba(255,255,255,0.88)'} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#1b1d21" fontFamily="sans-serif">{r.icon} {r.muscle}</text>
          </g>
        );
      })}
      {species && stageIdx !== undefined && shares && (
        <g className="isl-pet" transform={`translate(${px - 18} ${py - 34})`}>
          <PetArt species={species} stageIdx={stageIdx} shares={shares} mood={mood} size={36} />
        </g>
      )}
    </svg>
  );
}
