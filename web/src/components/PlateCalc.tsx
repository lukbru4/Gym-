// Scheibenrechner: gezeichnete Stange mit den Scheiben je Seite, Stange und vorhandene Scheiben einstellbar.
import { useState } from 'react';
import { fmt } from '../lib/format';
import { ALL_PLATES, BARS, plateColor, platesFor, plateText, setSetup, usePlateSetup } from '../lib/plates';

function Bar({ perSide, bar }: { perSide: number[]; bar: number }) {
  // Scheibenhöhe nach Gewicht, Breite gleich; Stange in der Mitte
  const h = (p: number) => 34 + Math.min(1, p / 25) * 46;
  const w = 10, gap = 1.5;
  const sideW = perSide.length * (w + gap);
  const width = 120 + 2 * Math.max(sideW, 30) + 40;
  const cx = width / 2, cy = 50;
  const sleeve = Math.max(sideW, 30) + 14;
  return (
    <svg viewBox={`0 0 ${width} 100`} className="plate-bar" role="img" aria-label={`Je Seite: ${plateText(perSide)}`}>
      <rect x={cx - 60} y={cy - 3} width="120" height="6" rx="2" fill={bar ? '#8d949c' : '#c9ced4'} />
      {[-1, 1].map((dir) => (
        <g key={dir}>
          <rect x={dir < 0 ? cx - 60 - 6 : cx + 60} y={cy - 9} width="6" height="18" rx="1.5" fill="#6c737c" />
          <rect x={dir < 0 ? cx - 66 - sleeve : cx + 66} y={cy - 4} width={sleeve} height="8" rx="2" fill="#a4abb3" />
          {perSide.map((p, i) => {
            const x = dir < 0 ? cx - 66 - (i + 1) * (w + gap) : cx + 66 + i * (w + gap) + gap;
            return <rect key={i} x={x} y={cy - h(p) / 2} width={w} height={h(p)} rx="2" fill={plateColor(p)} stroke="rgba(0,0,0,0.35)" strokeWidth="1" data-plate={p} />;
          })}
        </g>
      ))}
    </svg>
  );
}

/** Rechner-Inhalt; weight = Startwert */
export function PlateCalc({ weight: start, id = 'plate-calc' }: { weight?: number; id?: string }) {
  const setup = usePlateSetup();
  const [weight, setWeight] = useState(start && start > 0 ? String(start).replace('.', ',') : '60');
  const [settings, setSettings] = useState(false);
  const total = Number(weight.replace(',', '.'));
  const res = Number.isFinite(total) && total > 0 ? platesFor(total, setup.bar, setup.plates) : null;
  return (
    <div className="plate-calc" id={id}>
      <label className="plate-input">Gesamtgewicht (kg)<input inputMode="decimal" value={weight} data-plate-weight onChange={(e) => setWeight(e.target.value)} /></label>
      {res && (
        <>
          <Bar perSide={res.perSide} bar={setup.bar} />
          <p className="plate-result" id={`${id}-result`}><strong>Je Seite: {plateText(res.perSide)}</strong></p>
          <p className="muted small">{setup.bar ? `Stange ${fmt(setup.bar)} kg` : 'ohne Stange'}{res.perSide.length ? ` + 2 × ${fmt(res.perSide.reduce((s, p) => s + p, 0), 2)} kg` : ''} = {fmt(res.loaded, 2)} kg</p>
          {!res.exact && <p className="notice small" id={`${id}-inexact`}>{total < setup.bar ? `Leichter als die Stange (${fmt(setup.bar)} kg).` : `${fmt(total, 2)} kg geht mit deinen Scheiben nicht genau – möglich sind ${fmt(res.lower, 2)} kg oder ${fmt(res.upper, 2)} kg.`}</p>}
        </>
      )}
      <button type="button" className="link-btn small" data-plate-settings onClick={() => setSettings(!settings)}>{settings ? 'Einstellungen schließen' : '⚙️ Stange & Scheiben einstellen'}</button>
      {settings && (
        <div className="plate-settings">
          <div className="small"><strong>Stange</strong></div>
          <div className="seg seg-small" role="group" aria-label="Stange">
            {BARS.map((b) => <button key={b} type="button" className={`seg-tab${setup.bar === b ? ' active' : ''}`} aria-pressed={setup.bar === b} data-bar={b} onClick={() => setSetup({ ...setup, bar: b })}>{b ? `${b} kg` : 'ohne'}</button>)}
          </div>
          <div className="small"><strong>Vorhandene Scheiben</strong></div>
          <div className="plate-chips">
            {ALL_PLATES.map((p) => {
              const on = setup.plates.includes(p);
              return <button key={p} type="button" className={`chip plate-chip${on ? ' on' : ''}`} aria-pressed={on} data-have={p} style={{ borderColor: plateColor(p) }}
                onClick={() => setSetup({ ...setup, plates: on ? setup.plates.filter((x) => x !== p) : [...setup.plates, p] })}>{String(p).replace('.', ',')}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PlateDialog({ weight, onClose }: { weight?: number; onClose: () => void }) {
  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" id="plate-dialog" role="dialog" aria-modal="true" aria-label="Scheibenrechner">
        <h3>🏋️ Scheibenrechner</h3>
        <PlateCalc weight={weight} id="plate-dialog-calc" />
        <button type="button" className="btn block" id="plate-close" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}
