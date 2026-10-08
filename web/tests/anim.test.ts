import { describe, expect, test } from 'vitest';
import { CATALOG } from '../src/lib/exerciseCatalog';
import { animIdFor } from '../src/lib/animMap';
import { PATTERNS } from '../src/lib/animations';
import { NEUTRAL, poseAt, project, solve, LEN, type Joints, type V3 } from '../src/lib/rig';

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('3D-Figur', () => {
  test('Gliedmaßen behalten ihre Länge in jeder Pose', () => {
    for (const p of Object.values(PATTERNS)) {
      for (const u of [0, 0.2, 0.5, 0.8]) {
        const j: Joints = solve({ ...NEUTRAL, ...poseAt(p.base ?? {}, p.frames, u) }, p.anchor);
        expect(dist(j.shL, j.elL), p.id).toBeCloseTo(LEN.upper, 5);
        expect(dist(j.elL, j.wrL), p.id).toBeCloseTo(LEN.fore, 5);
        expect(dist(j.hipR, j.knR), p.id).toBeCloseTo(LEN.thigh, 5);
        expect(dist(j.knR, j.anR), p.id).toBeCloseTo(LEN.shin, 5);
        expect(dist(j.pelvis, j.chest), p.id).toBeCloseTo(LEN.torso, 5);
      }
    }
  });
  test('stehende Figur: Füße stehen auf dem Boden, Kopf etwa 1,7 m hoch', () => {
    const j = solve(NEUTRAL);
    expect(Math.min(j.toeL[1], j.heelL[1])).toBeCloseTo(0, 5);
    expect(j.head[1]).toBeGreaterThan(1.5);
    expect(j.head[1]).toBeLessThan(1.9);
  });
  test('Animation läuft hin und zurück und endet wie sie beginnt', () => {
    const p = PATTERNS.squat;
    const a = poseAt(p.base ?? {}, p.frames, 0), mid = poseAt(p.base ?? {}, p.frames, 0.5), b = poseAt(p.base ?? {}, p.frames, 1);
    expect(a.kneeL).toBeCloseTo(b.kneeL, 5);
    expect(mid.kneeL).toBeGreaterThan(100);
  });
  test('Projektion: weiter weg = kleiner', () => {
    const cam = { azimuth: 0, elevation: 0, distance: 4, target: [0, 0, 0] as V3 };
    expect(project([0, 0, 1], cam, 400, 400).s).toBeGreaterThan(project([0, 0, -1], cam, 400, 400).s);
  });
});

describe('Übungen → Bewegungsmuster', () => {
  const generic = new Set(['Battle Ropes', 'Turkish Get-up', 'Clean (Langhantel)', 'Schwimmen', 'Boxen (Sandsack)', 'HIIT (Intervalltraining)']);
  test('jede Übung des Katalogs hat ein vorhandenes Muster; „allgemein“ nur für wenige Ausnahmen', () => {
    for (const c of CATALOG) {
      const id = animIdFor(c.name, c.muscles);
      expect(PATTERNS[id], `${c.name} → ${id}`).toBeTruthy();
      if (id === 'generic') expect(c.type === 'cardio' || generic.has(c.name), `${c.name} hat nur das allgemeine Muster`).toBe(true);
    }
  });
  test('Beispiele', () => {
    const id = (n: string) => animIdFor(n, []);
    expect(id('Bankdrücken')).toBe('bench');
    expect(id('Kurzhantel-Bankdrücken')).toBe('bench-db');
    expect(id('Schulterdrücken (Maschine)')).toBe('ohp-seated');
    expect(id('Schulterdrücken (Langhantel, sitzend)')).toBe('ohp-seated');
    expect(id('Scott-Curls (Maschine)')).toBe('preacher');
    expect(id('Wadenheben (Beinpresse)')).toBe('calf');
    expect(id('Beinpresse (sitzend)')).toBe('legpress');
    expect(id('Klimmzug-Maschine (unterstützt)')).toBe('pulldown');
    expect(id('Klimmzüge (Untergriff)')).toBe('pullup');
    expect(id('Bizepscurls (Kabel)')).toBe('curl-cable');
    expect(id('Beinheben (hängend)')).toBe('legraise');
    expect(id('Laufband')).toBe('run');
    expect(id('Fahrradergometer')).toBe('bike');
    expect(id('Rudergerät')).toBe('erg');
    expect(id('Rumänisches Kreuzheben (Kurzhantel)')).toBe('hinge-db');
    expect(animIdFor('Meine Spezialübung', ['bizeps'])).toBe('curl'); // eigene Übung: nach Muskel
    expect(animIdFor('Meine Spezialübung', [])).toBe('generic');
  });
  test('jedes Muster hat Hinweise und gültige Schlüsselbilder', () => {
    for (const p of Object.values(PATTERNS)) {
      expect(p.cues.length, p.id).toBeGreaterThan(0);
      expect(p.frames.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.seconds, p.id).toBeGreaterThan(0.3);
    }
  });
});
