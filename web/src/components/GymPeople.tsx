// Leute im Gym: eigene Klötzchen-Figuren (du und deine Freunde), die frei herumlaufen, ein paar Sätze machen und reden.
import { useEffect, useRef, useState } from 'react';
import type { GymPerson, Look } from '../lib/gym';

/** Klötzchen-Figur von vorne (eigenes Design): eckiger Kopf mit Haaren, Oberkörper, Arme, Beine – Teile einzeln animierbar */
export function BlockFigure({ look, height, mode = 'stand', className = '' }: { look: Look; height: number; mode?: 'stand' | 'walk' | 'reps' | 'talk'; className?: string }) {
  const dark = '#22252b';
  return (
    <svg className={`block-fig fig-${mode} ${className}`} viewBox="0 0 40 84" style={{ height, width: (height * 40) / 84 }} aria-hidden="true">
      <ellipse cx="20" cy="82" rx="13" ry="2.2" fill="rgba(0,0,0,0.25)" />
      {/* Beine */}
      <g className="fig-leg fig-leg-l"><rect x="11" y="47" width="8.6" height="27" rx="1.5" fill={look.shorts} /><rect x="10.4" y="72" width="9.6" height="5" rx="1.5" fill={dark} /></g>
      <g className="fig-leg fig-leg-r"><rect x="20.4" y="47" width="8.6" height="27" rx="1.5" fill={look.shorts} /><rect x="20" y="72" width="9.6" height="5" rx="1.5" fill={dark} /></g>
      <rect x="10.5" y="43" width="19" height="6" rx="1.2" fill={look.shorts} />
      {/* Arme (Schulter als Drehpunkt), in den Händen bei Sätzen je eine Kurzhantel */}
      <g className="fig-arm fig-arm-l">
        <rect x="4.2" y="22" width="6.4" height="17" rx="3" fill={look.shirt} />
        <rect x="4.8" y="37" width="5.2" height="5.5" rx="2.4" fill={look.skin} />
        <g className="fig-db"><rect x="2" y="41.5" width="10.5" height="1.8" fill="#555b63" /><rect x="1" y="39.8" width="2.6" height="5.2" rx="0.6" fill={dark} /><rect x="10.9" y="39.8" width="2.6" height="5.2" rx="0.6" fill={dark} /></g>
      </g>
      <g className="fig-arm fig-arm-r">
        <rect x="29.4" y="22" width="6.4" height="17" rx="3" fill={look.shirt} />
        <rect x="30" y="37" width="5.2" height="5.5" rx="2.4" fill={look.skin} />
        <g className="fig-db"><rect x="27.5" y="41.5" width="10.5" height="1.8" fill="#555b63" /><rect x="26.5" y="39.8" width="2.6" height="5.2" rx="0.6" fill={dark} /><rect x="36.4" y="39.8" width="2.6" height="5.2" rx="0.6" fill={dark} /></g>
      </g>
      {/* Oberkörper */}
      <path d="M11 21 L29 21 L31 44 L9 44 Z" fill={look.shirt} />
      <path d="M11 21 L29 21 L29.4 25 L10.6 25 Z" fill="rgba(255,255,255,0.12)" />
      <path d="M17 21 L20 26 L23 21" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      {/* Kopf */}
      <rect x="17" y="17" width="6" height="5" fill={look.skin} />
      <g className="fig-head">
        <rect x="12.5" y="3.5" width="15" height="15" rx="4" fill={look.skin} />
        <path d="M12 9 Q12 2 20 2 Q28 2 28 9 L28 7.5 Q24 5.5 20 6.2 Q15 5.5 12 8 Z" fill={look.hair} />
        <circle cx="17.2" cy="11" r="1.1" fill={dark} /><circle cx="22.8" cy="11" r="1.1" fill={dark} />
        <path className="fig-mouth" d="M17.4 14.4 Q20 16.4 22.6 14.4" fill="none" stroke={dark} strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const SAYINGS = [
  'Noch ein Satz! 💪', 'Nur noch drei Wiederholungen!', 'Heute ist Beintag 🦵', 'Pause? Höchstens 90 Sekunden.', 'Neuer Rekord heute? 🏆',
  'Trinken nicht vergessen 💧', 'Kreatin schon genommen? ⚡', 'Saubere Technik vor viel Gewicht.', 'Gleich noch Bankdrücken.', 'Spürst du den Pump? 🔥',
  'Wer schwitzt, gewinnt.', 'Schön, dass du da bist!', 'Langsam runter, explosiv hoch!', 'Klein anfangen, dranbleiben.', 'Einer geht noch!',
];
type Mode = 'stand' | 'walk' | 'reps' | 'talk';
interface Walker { key: string; x: number; y: number; mode: Mode; until: number; dur: number; say: string; flip: boolean; reps: number }

/** einfacher Zufall je Person (sonst laufen alle gleich) */
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Figuren-Schicht im Raum: jede Person läuft zu zufälligen Punkten, bleibt stehen, macht ein paar Sätze mit Kurzhanteln
 * oder sagt etwas. place: Raumkoordinaten (0–100) → Bildschirmposition; figH: Figurhöhe bei Tiefe 1.
 */
export function GymPeople({ people, place, figH, lookOf, nameOf, still = false }: {
  people: GymPerson[];
  place: (x: number, y: number) => { left: number; bottom: number; scale: number; z: number };
  figH: number; lookOf: (p: GymPerson) => Look; nameOf: (p: GymPerson) => string; still?: boolean;
}) {
  const keyOf = (p: GymPerson) => `${p.who}:${p.id}`;
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const ref = useRef<Walker[]>([]);
  // Personen hinzufügen/entfernen, Startpunkte verteilt
  useEffect(() => {
    const now = Date.now();
    const next = people.map((p, i) => ref.current.find((w) => w.key === keyOf(p)) ?? {
      key: keyOf(p), x: 15 + ((i * 37) % 70), y: 30 + ((i * 53) % 60), mode: 'stand' as Mode, until: now + 400 + i * 700, dur: 0, say: '', flip: false, reps: 0,
    });
    ref.current = next; setWalkers(next);
  }, [people.map(keyOf).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  // Alle 0,5 s: wer fertig ist, macht etwas Neues
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const next = ref.current.map((w): Walker => {
        if (now < w.until) return w;
        changed = true;
        const r = Math.random();
        if (w.mode !== 'walk' && r < 0.55) {
          const x = Math.round(rand(6, 94)), y = Math.round(rand(8, 96));
          const dur = Math.min(6000, Math.max(1500, Math.hypot(x - w.x, (y - w.y) * 1.4) * 70));
          return { ...w, x, y, mode: 'walk', dur, until: now + dur, say: '', flip: x < w.x };
        }
        if (r < 0.8) return { ...w, mode: 'reps', dur: 0, until: now + rand(3500, 6000), say: Math.random() < 0.5 ? SAYINGS[Math.floor(rand(0, 5))] : '', reps: w.reps + 1 };
        if (r < 0.93) return { ...w, mode: 'talk', dur: 0, until: now + rand(2500, 4000), say: SAYINGS[Math.floor(rand(0, SAYINGS.length))] };
        return { ...w, mode: 'stand', dur: 0, until: now + rand(1000, 2500), say: '' };
      });
      if (changed) { ref.current = next; setWalkers(next); }
    }, 500);
    return () => clearInterval(t);
  }, [still]);
  return (
    <>
      {walkers.map((w) => {
        const p = people.find((x) => keyOf(x) === w.key);
        if (!p) return null;
        const pos = place(w.x, w.y);
        return (
          <div key={w.key} className={`gym-walker m-${w.mode}`} data-walker={w.key} data-mode={w.mode}
            style={{ left: `${pos.left}%`, bottom: `${pos.bottom}%`, zIndex: pos.z, transitionDuration: `${w.dur}ms` }}>
            {w.say && <span className="gym-say" data-say>{w.say}</span>}
            <div style={{ transform: w.flip ? 'scaleX(-1)' : undefined }}>
              <BlockFigure look={lookOf(p)} height={Math.round(figH * pos.scale)} mode={w.mode} />
            </div>
            <span className="gym-walker-name">{nameOf(p)}</span>
          </div>
        );
      })}
    </>
  );
}
