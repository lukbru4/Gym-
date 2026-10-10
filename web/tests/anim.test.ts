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
  const generic = new Set(['Schwimmen', 'Boxen (Sandsack)', 'HIIT (Intervalltraining)']);
  const genericOk = /^(Battle Ropes|Turkish Get-up|Clean|Medizinball|Slam Ball)/;
  test('jede Übung des Katalogs hat ein vorhandenes Muster; „allgemein“ nur für wenige Ausnahmen', () => {
    for (const c of CATALOG) {
      const id = animIdFor(c.name, c.muscles);
      expect(PATTERNS[id], `${c.name} → ${id}`).toBeTruthy();
      if (id === 'generic') expect(c.type === 'cardio' || generic.has(c.name) || genericOk.test(c.name), `${c.name} hat nur das allgemeine Muster`).toBe(true);
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

describe('Muster passen zu den Muskeln der Übung', () => {
  // Muster → Muskeln, von denen mindestens einer in der Übung vorkommen muss (verhindert z. B. „Bankdrücken“-Animation bei Rückenübungen)
  const FITS: Record<string, string[]> = {
    bench: ['brust', 'trizeps'], 'bench-db': ['brust'], incline: ['brust', 'schultern'], 'incline-db': ['brust', 'schultern'], chestpress: ['brust'], fly: ['brust', 'lat'],
    pushup: ['brust', 'trizeps'], dip: ['trizeps', 'brust'], pullup: ['lat'], pulldown: ['lat'], row: ['oberer_ruecken', 'lat'], seatedrow: ['oberer_ruecken', 'lat'], dbrow: ['lat', 'oberer_ruecken'],
    curl: ['bizeps'], 'curl-bar': ['bizeps'], 'curl-cable': ['bizeps'], preacher: ['bizeps'], triceps: ['trizeps'], 'triceps-rope': ['trizeps'], skull: ['trizeps'], overhead: ['trizeps'],
    lateral: ['schultern'], front: ['schultern'], reversefly: ['schultern', 'oberer_ruecken'], shrug: ['oberer_ruecken'], ohp: ['schultern', 'trizeps'], 'ohp-seated': ['schultern'],
    squat: ['quadrizeps', 'gesaess'], legpress: ['quadrizeps', 'gesaess'], legext: ['quadrizeps'], legcurl: ['beinbeuger'], calf: ['waden'], glute: ['gesaess', 'quadrizeps'], lunge: ['quadrizeps', 'gesaess'],
    hinge: ['unterer_ruecken', 'gesaess', 'beinbeuger'], backext: ['unterer_ruecken'], crunch: ['bauch'], situp: ['bauch'], legraise: ['bauch', 'quadrizeps'], twist: ['bauch'], plank: ['bauch', 'schultern'],
  };
  test('kein Muster bei einer Übung ohne passenden Muskel', () => {
    const bad: string[] = [];
    for (const c of CATALOG) {
      if (c.type !== 'strength' || /^(Landmine|Isometrie)/.test(c.name)) continue;
      const id = animIdFor(c.name, c.muscles);
      const fit = FITS[id];
      if (fit && !c.muscles.some((m) => fit.includes(m))) bad.push(`${c.name} → ${id} (${c.muscles.join('/')})`);
    }
    expect(bad).toEqual([]);
  });
  test('Beliebtheit: Klassiker zuerst, Rest nach Namen', async () => {
    const { filterExercises } = await import('../src/lib/muscles');
    const ex = CATALOG.map((c, i) => ({ id: i + 1, name: c.name, type: c.type, user_id: null, muscles: c.muscles }));
    const brust = filterExercises(ex, { muscles: ['brust'] }).map((e) => e.name);
    expect(brust.slice(0, 3)).toEqual(['Brustpresse (Maschine)', 'Butterfly', 'Cable Crossover (Kabelzug)']);
    // Muskelgruppe = Hauptmuskel: Dips (Trizeps zuerst) gehören zu Trizeps, nicht zu Brust
    expect(brust).not.toContain('Dips');
    expect(filterExercises(ex, { muscles: ['trizeps'] }).map((e) => e.name)).toContain('Dips');
    expect(CATALOG.length).toBeGreaterThanOrEqual(1000);
  });
});
