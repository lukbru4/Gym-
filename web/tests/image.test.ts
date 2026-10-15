import { describe, expect, test } from 'vitest';
import { centeredCrop, clampCrop, zoomAt } from '../src/lib/image';

// Bild 400 × 300, Quadrat 260 px: Zoom 1 → Skalierung 260/300
describe('Profilbild-Ausschnitt', () => {
  const W = 400, H = 300, V = 260;
  const s1 = V / 300;
  test('Start: Bild mittig, füllt das Quadrat', () => {
    const c = centeredCrop(W, H, V);
    expect(c.zoom).toBe(1);
    expect(c.oy).toBeCloseTo(0, 5);
    expect(c.ox).toBeCloseTo((V - W * s1) / 2, 5); // links und rechts wird gleich viel abgeschnitten
  });
  test('Verschieben bleibt im Bild (keine leeren Ränder)', () => {
    const c = centeredCrop(W, H, V);
    expect(clampCrop(W, H, V, { ...c, ox: 500 }).ox).toBe(0);
    expect(clampCrop(W, H, V, { ...c, ox: -500 }).ox).toBeCloseTo(V - W * s1, 5);
    expect(clampCrop(W, H, V, { ...c, oy: -50 }).oy).toBe(0); // bei Zoom 1 gibt es oben/unten nichts zu verschieben
  });
  test('Zoom ist auf 1 bis 5 begrenzt', () => {
    expect(clampCrop(W, H, V, { zoom: 0.2, ox: 0, oy: 0 }).zoom).toBe(1);
    expect(clampCrop(W, H, V, { zoom: 99, ox: 0, oy: 0 }).zoom).toBe(5);
  });
  test('Zoomen hält den Punkt unter dem Finger fest', () => {
    const c = centeredCrop(W, H, V);
    const fx = 200, fy = 100;
    const before = { x: (fx - c.ox) / s1, y: (fy - c.oy) / s1 }; // Bildpunkt unter dem Finger
    const z = zoomAt(W, H, V, c, 2, fx, fy);
    const s2 = s1 * 2;
    expect((fx - z.ox) / s2).toBeCloseTo(before.x, 4);
    expect((fy - z.oy) / s2).toBeCloseTo(before.y, 4);
    expect(z.zoom).toBe(2);
  });
  test('Hochformat funktioniert genauso', () => {
    const c = centeredCrop(300, 400, V);
    expect(c.ox).toBeCloseTo(0, 5);
    expect(c.oy).toBeLessThan(0);
  });
});

import { FIGURE_BOTTOM, HIP_Y, LEG_STRETCH, stretchPath, stretchY } from '../src/lib/bodyScale';
import * as shapes from '../src/lib/bodyShapes';
describe('Körper-Proportionen', () => {
  test('Strecken: oben bleibt, unten wird länger', () => {
    expect(stretchY(100)).toBe(100);
    expect(stretchY(HIP_Y)).toBe(HIP_Y);
    expect(stretchY(458)).toBeCloseTo(FIGURE_BOTTOM, 5);
    expect(FIGURE_BOTTOM).toBeGreaterThan(458);
    expect(stretchPath('M10 100 L20 300 C30 310 40 320 50 330 Z')).toBe(`M 10 100 L 20 ${Math.round(stretchY(300) * 100) / 100} C 30 ${Math.round(stretchY(310) * 100) / 100} 40 ${Math.round(stretchY(320) * 100) / 100} 50 ${Math.round(stretchY(330) * 100) / 100} Z`);
    expect(LEG_STRETCH).toBeGreaterThan(1.1);
  });
  test('alle Körperformen nutzen nur absolute Befehle (sonst lässt sich nicht strecken)', () => {
    const all = [shapes.OUTLINE, ...shapes.FRONT_NEUTRAL, ...shapes.BACK_NEUTRAL, ...shapes.FRONT_LINES, ...shapes.BACK_LINES, ...Object.values(shapes.FRONT).flat(), ...Object.values(shapes.BACK).flat()] as string[];
    for (const d of all) expect(() => stretchPath(d)).not.toThrow();
  });
});
