// Muskel-Radar: Netzdiagramm aller 12 Muskelgruppen, je weiter außen, desto höher die Stufe.
import { useCosmetics } from '../lib/cosmetics';
import { MUSCLES, type MuscleLevel } from '../lib/muscles';
import type { MuscleId } from '../lib/types';
import { GlowFilter } from './BodyGraph';

const SHORT_NAMES: Partial<Record<MuscleId, string>> = {
  oberer_ruecken: 'Ob. Rücken',
  unterer_ruecken: 'Unt. Rücken',
  quadrizeps: 'Beine vorne',
  beinbeuger: 'Beine hinten',
};

export function Radar({ levels }: { levels: Map<MuscleId, MuscleLevel> }) {
  const skin = useCosmetics().equipped.skin;
  const n = MUSCLES.length;
  const cx = 250, cy = 200, R = 130;
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const xy = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const radius = (id: MuscleId) => R * Math.max(0.04, levels.get(id)!.level / 5);
  const summary = MUSCLES.map(([id, name]) => `${name} ${levels.get(id)!.level}`).join(', ');
  return (
    <div className="bodygraph-panel" data-skin={skin}>
      <svg className="radar" viewBox="-40 0 580 400" role="img" aria-label={`Muskel-Radar (Stufe 0–5): ${summary}`}>
        <GlowFilter />
        <g className="radar-grid">
          {[1, 2, 3, 4, 5].map((k) => (
            <polygon key={k} points={MUSCLES.map((_, i) => xy(pt(i, (R * k) / 5))).join(' ')} />
          ))}
          {MUSCLES.map((_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} />;
          })}
        </g>
        <polygon className="radar-shape" points={MUSCLES.map(([id], i) => xy(pt(i, radius(id)))).join(' ')} />
        <g className="radar-dots">
          {MUSCLES.map(([id], i) => {
            const [x, y] = pt(i, radius(id));
            return <circle key={id} cx={x.toFixed(1)} cy={y.toFixed(1)} r="4" />;
          })}
        </g>
        <g className="radar-labels">
          {MUSCLES.map(([id, name], i) => {
            const [x, y] = pt(i, R + 24);
            const anchor = Math.abs(x - cx) < 8 ? 'middle' : x < cx ? 'end' : 'start';
            const lv = levels.get(id)!.level;
            return (
              <text key={id} x={x.toFixed(1)} y={(y + 5).toFixed(1)} textAnchor={anchor} className={lv ? 'on' : ''}>
                {SHORT_NAMES[id] || name}
                {lv ? ` · ${lv}` : ''}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
