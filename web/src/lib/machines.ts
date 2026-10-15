// Studiogeräte für die Übungs-Animation – gebaut aus den Bausteinen in gymKit.ts.
// Jedes Gerät richtet sich nach der Figur (Becken, Hände, Füße), damit Griffe, Polster und Seile mitgehen.
import { MAT, vec, type Kit } from './gymKit';
import type { Joints, V3 } from './rig';

export type MachineType =
  | 'chestpress' | 'pecdeck' | 'shoulderpress' | 'latpull' | 'cablerow' | 'rowmachine' | 'cabletower' | 'crossover'
  | 'legpress' | 'hack' | 'legext' | 'legcurl' | 'legcurlseated' | 'calf' | 'abductor' | 'abmachine'
  | 'preacher' | 'curlmachine' | 'dipmachine' | 'smith' | 'hipthrust' | 'assist' | 'rack';

export interface MachineCtx {
  k: Kit;
  j: Joints;
  /** Becken-Position nach vorn (z) */
  shift: number;
  /** Sitzhöhe (Oberkante Polster), falls die Figur sitzt/liegt */
  seatY: number;
  /** Rumpfneigung in Grad (für Rückenpolster) */
  trunk: number;
  /** Seilrolle (für Kabelgeräte) */
  from?: V3;
}

const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];
/** Sortier-Zuschlag für Teile, die immer hinter bzw. unter der Figur liegen (Sitz, Lehne) */
const BEHIND = 0.35;
/** Gewichtsblock seitlich: auf der von der Kamera abgewandten Seite (Seitenansichten blicken von links) */
const SIDE = 0.78;
const { add, sub, mul, norm, cross } = vec;
const mid = (a: V3, b: V3): V3 => mul(add(a, b), 0.5);
const at = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));

/** Gewichtsblock im Rahmen: Säulen, Führungsstangen, Platten, Stift, Abdeckung. Mitte (x, z), Front zeigt nach `facing` (+1 = +z) */
export function weightTower(k: Kit, x: number, z: number, top = 1.9, lifted = 0.06, wide = false) {
  const hw = wide ? 0.3 : 0.24;
  for (const sx of [-1, 1]) {
    k.tube([x + sx * hw, 0.03, z - 0.14], [x + sx * hw, top, z - 0.14], 0.035, MAT.frame, 0.12);
    k.tube([x + sx * hw, 0.03, z + 0.14], [x + sx * hw, top, z + 0.14], 0.035, MAT.frame, 0.12);
  }
  k.aabb(x - hw - 0.04, x + hw + 0.04, top - 0.03, top + 0.05, z - 0.18, z + 0.18, MAT.frame, 0.11);
  k.aabb(x - hw - 0.06, x + hw + 0.06, 0, 0.05, z - 0.2, z + 0.2, MAT.frame, 0.11);
  for (const sx of [-0.09, 0.09]) k.tube([x + sx, 0.05, z], [x + sx, top - 0.03, z], 0.012, MAT.chrome, 0.13);
  // Platten: unten liegen die meisten, oben ein paar angehoben (bewegt sich mit)
  const n = 12, ph = 0.045, gap = 0.006;
  for (let i = 0; i < n; i++) {
    const lift = i >= n - 3 ? lifted : 0;
    const y0 = 0.08 + i * (ph + gap) + lift;
    k.aabb(x - 0.16, x + 0.16, y0, y0 + ph, z - 0.1, z + 0.1, i === n - 3 ? MAT.pin : MAT.stack, 0.1);
  }
  const yTop = 0.08 + n * (ph + gap) + lifted;
  k.aabb(x - 0.17, x + 0.17, yTop, yTop + 0.05, z - 0.11, z + 0.11, MAT.frame, 0.09);
  k.tube([x, yTop + 0.05, z], [x, top - 0.05, z], 0.01, MAT.chrome, 0.1);
}

/** Sitz und Rückenpolster passend zur Figur */
function seatAndBack(c: MachineCtx, opts: { back?: boolean; seatLen?: number; backLen?: number } = {}) {
  const { k, j, seatY } = c;
  const p = j.pelvis;
  const sl = opts.seatLen ?? 0.21;
  k.pad([0, seatY - 0.045, p[2] + 0.06], X, Y, Z, 0.2, 0.045, sl, BEHIND);
  // Sitzträger
  k.tube([0, 0.05, p[2] + 0.05], [0, seatY - 0.09, p[2] + 0.05], 0.04, MAT.frame, 0.05);
  k.aabb(-0.08, 0.08, seatY - 0.11, seatY - 0.09, p[2] - 0.1, p[2] + 0.2, MAT.frame, 0.05);
  if (opts.back !== false) {
    const up = norm(sub(j.chest, j.pelvis));
    const n = norm(cross(X, up)); // zeigt nach hinten (vom Bauch weg)
    const back = mul(n, -1);
    const len = opts.backLen ?? 0.42;
    const c0 = add(add(p, mul(up, len * 0.95)), mul(back, -0.17));
    k.pad(c0, X, up, back, 0.19, len, 0.04, BEHIND);
    // Stütze hinter dem Polster
    k.tube(add(c0, mul(back, -0.06)), [0, 0.05, c0[2] - 0.12], 0.035, MAT.frame, 0.06);
  }
}

/** Bodenrahmen zwischen zwei Punkten */
const rail = (k: Kit, a: V3, b: V3, r = 0.04) => k.tube([a[0], 0.04, a[2]], [b[0], 0.04, b[2]], r, MAT.frame, 0.15);

/** Griff (gummiert) senkrecht oder waagerecht an einer Hand */
const grip = (k: Kit, h: V3, dir: V3, len = 0.07) => k.tube(add(h, mul(dir, -len)), add(h, mul(dir, len)), 0.022, MAT.grip, -0.03);

export function drawMachine(type: MachineType, c: MachineCtx) {
  const { k, j, seatY } = c;
  const p = j.pelvis;
  const hands = mid(j.handL, j.handR);
  switch (type) {
    case 'chestpress': {
      seatAndBack(c, { backLen: 0.45 });
      const pz = p[2] - 0.3;
      // Rahmen: Hauptsäule hinter dem Rücken, Ausleger nach oben, Bodenrahmen
      k.tube([0, 0.05, pz], [0, 1.62, pz], 0.05, MAT.frame, 0.08);
      rail(k, [0, 0, pz - 0.35], [0, 0, p[2] + 0.45]);
      rail(k, [-0.3, 0, pz - 0.1], [SIDE, 0, pz - 0.1]);
      for (const [hd, sx] of [[j.handL, -1], [j.handR, 1]] as const) {
        const piv: V3 = [sx * 0.24, 1.55, pz + 0.05];
        k.disc(piv, X, 0.05, 0.05, MAT.frame, 0.04);
        // Hebelarm: vom Drehpunkt über einen Knick zur Hand
        const knee = add(hd, [sx * 0.05, 0.12, -0.32]);
        k.tube(piv, knee, 0.032, MAT.frame, 0.02);
        k.tube(knee, add(hd, [0, 0.06, -0.02]), 0.03, MAT.frame, 0.0);
        grip(k, add(hd, [0, 0, 0.01]), Y, 0.075);
      }
      k.tube([-0.24, 1.55, pz + 0.05], [0.24, 1.55, pz + 0.05], 0.03, MAT.frame, 0.05);
      weightTower(k, SIDE, pz - 0.05, 1.75, 0.05 + Math.max(0, (hands[2] - p[2] - 0.3)) * 0.25);
      k.cable([SIDE, 1.7, pz - 0.05], [0.24, 1.5, pz + 0.05], 0.05);
      break;
    }
    case 'pecdeck': {
      seatAndBack(c, { backLen: 0.48 });
      const pz = p[2] - 0.3;
      k.tube([0, 0.05, pz], [0, 1.95, pz], 0.05, MAT.frame, 0.08);
      k.tube([0, 1.95, pz], [0, 1.95, pz + 0.2], 0.045, MAT.frame, 0.06);
      rail(k, [0, 0, pz - 0.4], [0, 0, p[2] + 0.4]);
      for (const [el, wr, sx] of [[j.elL, j.wrL, -1], [j.elR, j.wrR, 1]] as const) {
        const piv: V3 = [sx * 0.08, 1.9, pz + 0.2];
        k.disc(piv, Y, 0.045, 0.06, MAT.frame, 0.03);
        // Armpolster am Unterarm, Hebel nach oben zur Drehachse
        const fa = norm(sub(wr, el));
        const side = norm(cross(fa, Z));
        const padC = at(el, wr, 0.45);
        k.pad(add(padC, [0, 0, 0.05]), side, fa, Z, 0.045, 0.16, 0.035, -0.03);
        const topP: V3 = [padC[0], wr[1] + 0.2, padC[2] + 0.02];
        k.tube(add(padC, [0, 0.16, 0.02]), topP, 0.025, MAT.frame, -0.01);
        k.tube(topP, piv, 0.03, MAT.frame, 0.02);
      }
      weightTower(k, 0, pz - 0.38, 1.85, 0.05);
      break;
    }
    case 'shoulderpress': {
      seatAndBack(c, { backLen: 0.55 });
      const pz = p[2] - 0.32;
      k.tube([0, 0.05, pz], [0, 1.2, pz], 0.05, MAT.frame, 0.08);
      rail(k, [0, 0, pz - 0.3], [0, 0, p[2] + 0.45]);
      for (const [hd, sx] of [[j.handL, -1], [j.handR, 1]] as const) {
        const piv: V3 = [sx * 0.32, 1.15, pz - 0.05];
        k.disc(piv, X, 0.05, 0.05, MAT.frame, 0.05);
        k.tube(piv, add(hd, [sx * 0.04, -0.02, -0.08]), 0.032, MAT.frame, 0.0);
        grip(k, hd, Z, 0.07);
      }
      k.tube([-0.32, 1.15, pz - 0.05], [0.32, 1.15, pz - 0.05], 0.03, MAT.frame, 0.06);
      weightTower(k, 0.72, pz, 1.8, 0.04 + Math.max(0, hands[1] - 1.5) * 0.2);
      break;
    }
    case 'latpull': {
      seatAndBack(c, { back: false });
      const tz = p[2] + 0.62;
      // Turm vor der Figur mit Gewichtsblock, Ausleger oben bis über den Kopf
      weightTower(k, 0, tz + 0.1, 2.15, 0.05 + Math.max(0, 1.9 - hands[1]) * 0.25, true);
      k.tube([0, 2.18, tz + 0.1], [0, 2.32, p[2] + 0.05], 0.05, MAT.frame, 0.04);
      const pul: V3 = [0, 2.27, p[2] + 0.06];
      k.disc(pul, X, 0.06, 0.04, MAT.frame, 0.0);
      rail(k, [0, 0, p[2] - 0.15], [0, 0, tz + 0.3]);
      // Knierollen über den Oberschenkeln
      const kn = mid(j.knL, j.knR);
      k.tube([0, kn[1] + 0.12, kn[2] - 0.05], [0, kn[1] + 0.12, tz - 0.05], 0.035, MAT.frame, 0.03);
      for (const sx of [-1, 1]) k.tube([sx * 0.04, kn[1] + 0.11, kn[2] - 0.05], [sx * 0.2, kn[1] + 0.11, kn[2] - 0.05], 0.055, MAT.pad, -0.03);
      // Seil und Latzugstange
      k.cable(pul, add(hands, [0, 0.02, 0]), -0.02);
      k.tube(add(hands, [-0.5, 0, 0]), add(hands, [0.5, 0, 0]), 0.016, MAT.chrome, -0.03);
      for (const sx of [-1, 1]) {
        k.tube(add(hands, [sx * 0.5, 0, 0]), add(hands, [sx * 0.58, -0.08, 0]), 0.016, MAT.chrome, -0.03);
        grip(k, add(hands, [sx * 0.38, 0, 0]), X, 0.08);
      }
      break;
    }
    case 'cablerow': {
      // Lange Sitzbank, Fußplatte, tiefe Rolle im Turm vorn, V-Griff
      const zf = mid(j.anL, j.anR)[2];
      k.pad([0, seatY - 0.04, p[2] - 0.05], X, Y, Z, 0.17, 0.04, 0.32, BEHIND);
      k.aabb(-0.07, 0.07, 0.05, seatY - 0.08, p[2] - 0.32, p[2] + 0.2, MAT.frame, 0.05);
      rail(k, [0, 0, p[2] - 0.4], [0, 0, zf + 0.5]);
      const ft = mid(j.toeL, j.toeR);
      k.box([0, ft[1], zf + 0.12], X, norm([0, 1, -0.35]), norm([0, 0.35, 1]), 0.24, 0.17, 0.02, MAT.frame, -0.01);
      weightTower(k, 0, zf + 0.5, 2.0, 0.05 + Math.max(0, zf - hands[2]) * 0.15);
      const pul: V3 = [0, 0.45, zf + 0.36];
      k.disc(pul, X, 0.06, 0.04, MAT.frame, 0.0);
      k.cable(pul, add(hands, [0, 0, 0.06]), -0.02);
      k.tube(add(hands, [-0.06, 0, 0.02]), add(hands, [0, 0, 0.11]), 0.015, MAT.chrome, -0.04);
      k.tube(add(hands, [0.06, 0, 0.02]), add(hands, [0, 0, 0.11]), 0.015, MAT.chrome, -0.04);
      grip(k, hands, X, 0.08);
      break;
    }
    case 'rowmachine': {
      seatAndBack(c, { back: false });
      // Brustpolster vor der Brust, Hebel mit Griffen, Gewichtsblock vorn
      const cz = j.chest[2] + 0.17;
      k.pad([0, j.chest[1] - 0.05, cz], X, Y, Z, 0.17, 0.17, 0.045, -0.02);
      k.tube([0, j.chest[1] - 0.05, cz + 0.05], [0, 0.05, cz + 0.12], 0.04, MAT.frame, 0.03);
      const tz = p[2] + 0.85;
      weightTower(k, 0, tz, 1.85, 0.05);
      rail(k, [0, 0, p[2] - 0.2], [0, 0, tz + 0.2]);
      for (const [hd, sx] of [[j.handL, -1], [j.handR, 1]] as const) {
        const piv: V3 = [sx * 0.3, 1.55, tz - 0.25];
        k.tube(piv, add(hd, [sx * 0.03, 0.02, 0.06]), 0.028, MAT.frame, 0.0);
        grip(k, hd, Y, 0.07);
      }
      k.tube([-0.3, 1.55, tz - 0.25], [0.3, 1.55, tz - 0.25], 0.03, MAT.frame, 0.05);
      break;
    }
    case 'cabletower': {
      // Kabelturm vor der Figur: zwei Säulen, Gewichtsblock, verstellbare Rolle auf Höhe von `from`
      const from = c.from ?? [0, 2.0, p[2] + 0.35];
      const tz = Math.max(from[2], p[2] + 0.35) + 0.12;
      weightTower(k, 0, tz + 0.1, 2.25, 0.05, true);
      k.tube([-0.06, from[1], tz - 0.05], [-0.06, from[1], from[2]], 0.03, MAT.frame, 0.02);
      k.disc([0, from[1], from[2]], X, 0.055, 0.04, MAT.frame, 0.0);
      k.cable([0, from[1], from[2]], hands, -0.02);
      // Griff: Seil (Trizeps/Curl) oder Stange
      k.tube(add(hands, [-0.08, 0, 0]), add(hands, [0.08, 0, 0]), 0.017, MAT.chrome, -0.04);
      grip(k, hands, X, 0.07);
      break;
    }
    case 'crossover': {
      // Kabelzug-Station mit zwei Türmen links und rechts, Rollen oben, je ein Griff pro Hand
      const z0 = p[2] - 0.1;
      for (const [hd, sx] of [[j.handL, -1], [j.handR, 1]] as const) {
        const x = sx * 1.0;
        weightTower(k, x, z0, 2.3, 0.04, false);
        const pul: V3 = [x - sx * 0.2, 2.05, z0 + 0.12];
        k.tube([x - sx * 0.05, 2.05, z0], pul, 0.03, MAT.frame, 0.02);
        k.disc(pul, Z, 0.055, 0.04, MAT.frame, 0.0);
        k.cable(pul, hd, -0.02);
        grip(k, hd, Y, 0.06);
      }
      k.tube([-1.0, 2.32, z0], [1.0, 2.32, z0], 0.045, MAT.frame, 0.1);
      break;
    }
    case 'legpress': {
      // 45°-Beinpresse: Rückenpolster, Sitz, Schlitten auf Schienen mit Fußplatte und Scheiben-Hörnern
      const f = mid(j.toeL, j.toeR);
      const dir = norm([0, 0.7, 0.72]), pl = norm([0, 0.72, -0.7]);
      const up = norm(sub(j.chest, j.pelvis)), back = mul(norm(cross(X, up)), -1);
      k.pad(add(add(p, mul(up, 0.42)), mul(back, -0.16)), X, up, back, 0.2, 0.42, 0.04, BEHIND);
      k.pad([0, seatY - 0.04, p[2] + 0.05], X, Y, Z, 0.2, 0.04, 0.2, BEHIND);
      // Schienen laufen durch den Schlitten an den Füßen (unten hinter den Füßen, oben weit vorn)
      const back0 = Math.min(0.75, (f[1] - 0.12) / dir[1]);
      const r0: V3 = add(f, mul(dir, -back0)), r1: V3 = add(f, mul(dir, 1.25));
      for (const sx of [-0.3, 0.3]) {
        k.tube(add(r0, [sx, 0, 0]), add(r1, [sx, 0, 0]), 0.035, MAT.chrome, 0.12);
        k.tube([sx, 0.04, r1[2] - 0.05], add(r1, [sx, -0.02, 0]), 0.045, MAT.frame, 0.12);
        k.tube([sx, 0.04, r0[2]], add(r0, [sx, -0.02, 0]), 0.045, MAT.frame, 0.12);
      }
      rail(k, [0, 0, p[2] - 0.5], [0, 0, r1[2] + 0.1]);
      k.tube([0, 0.05, p[2] - 0.35], add(add(p, mul(up, 0.4)), mul(back, -0.22)), 0.05, MAT.frame, 0.08);
      // Schlitten mit Fußplatte (senkrecht zur Druckrichtung)
      const sled = add(f, mul(dir, 0.06));
      k.box(add(sled, mul(dir, 0.08)), X, pl, dir, 0.36, 0.3, 0.06, MAT.frame, 0.01);
      k.box(sled, X, pl, dir, 0.34, 0.27, 0.015, MAT.rubber, -0.02);
      for (const sx of [-1, 1]) {
        const horn = add(add(sled, mul(dir, 0.12)), [sx * 0.42, 0, 0]);
        k.tube(add(horn, [-sx * 0.06, 0, 0]), add(horn, [sx * 0.12, 0, 0]), 0.02, MAT.chrome, 0.0);
        k.disc(add(horn, [sx * 0.03, 0, 0]), X, 0.2, 0.04, MAT.plate, 0.0);
        k.disc(add(horn, [sx * 0.08, 0, 0]), X, 0.16, 0.035, MAT.plate, 0.0);
      }
      break;
    }
    case 'hack': {
      // Hackenschmidt: Rückenpolster und Schulterpolster auf schrägem Schlitten, Fußplatte schräg
      const up = norm(sub(j.chest, j.pelvis)), back = mul(norm(cross(X, up)), -1);
      k.pad(add(add(p, mul(up, 0.32)), mul(back, -0.16)), X, up, back, 0.2, 0.42, 0.04, BEHIND);
      for (const sx of [-1, 1]) k.pad(add(j[sx < 0 ? 'shL' : 'shR'], [0, 0.07, -0.02]), X, Y, Z, 0.07, 0.035, 0.11, -0.03);
      const f = mid(j.toeL, j.toeR);
      k.box([0, 0.12, f[2] - 0.05], X, norm([0, 1, 0.45]), norm([0, -0.45, 1]), 0.42, 0.3, 0.03, MAT.rubber, 0.0);
      const ra: V3 = [0, 0.15, f[2] - 0.4], rb: V3 = [0, 2.2, f[2] - 1.45];
      for (const sx of [-0.32, 0.32]) k.tube(add(ra, [sx, 0, 0]), add(rb, [sx, 0, 0]), 0.04, MAT.chrome, 0.15);
      rail(k, [0, 0, f[2] + 0.3], [0, 0, rb[2] - 0.2]);
      k.tube([0, 0.05, rb[2] - 0.15], rb, 0.05, MAT.frame, 0.15);
      for (const sx of [-1, 1]) k.disc(add(j[sx < 0 ? 'shL' : 'shR'], [sx * 0.2, 0, -0.25]), X, 0.2, 0.04, MAT.plate, 0.05);
      break;
    }
    case 'legext': {
      seatAndBack(c, { backLen: 0.42 });
      const kn = mid(j.knL, j.knR), an = mid(j.anL, j.anR);
      const piv: V3 = [-0.3, kn[1], kn[2]];
      k.disc(piv, X, 0.06, 0.05, MAT.frame, 0.0);
      // Hebel vom Drehpunkt (auf Kniehöhe) zur Schienbeinrolle
      const roll: V3 = add(an, [0, 0.05, 0.06]);
      k.tube(piv, [-0.28, roll[1], roll[2]], 0.03, MAT.frame, -0.01);
      k.tube([-0.28, roll[1], roll[2]], [0.22, roll[1], roll[2]], 0.02, MAT.chrome, -0.01);
      k.tube([-0.2, roll[1], roll[2]], [0.2, roll[1], roll[2]], 0.055, MAT.pad, -0.03);
      rail(k, [0, 0, p[2] - 0.35], [0, 0, kn[2] + 0.2]);
      weightTower(k, SIDE, p[2] - 0.05, 1.6, 0.04 + Math.max(0, roll[1] - 0.35) * 0.2);
      k.cable([SIDE, 1.55, p[2] - 0.05], [0.3, piv[1], piv[2]], 0.05);
      break;
    }
    case 'legcurl': {
      // liegender Beinbeuger: geknickte Liegefläche, Haltegriffe, Fersenrolle am Hebel
      const kn = mid(j.knL, j.knR), an = mid(j.anL, j.anR);
      k.pad([0, seatY - 0.03, p[2] + 0.18], X, Y, Z, 0.2, 0.04, 0.42, BEHIND);
      k.pad([0, seatY - 0.03, kn[2] - 0.05], X, norm([0, 1, 0.12]), norm([0, -0.12, 1]), 0.2, 0.04, 0.22, BEHIND);
      for (const z of [p[2] + 0.5, kn[2] - 0.1]) k.tube([0, 0.05, z], [0, seatY - 0.07, z], 0.04, MAT.frame, 0.05);
      rail(k, [0, 0, p[2] + 0.6], [0, 0, an[2] - 0.6]);
      grip(k, [0, seatY + 0.05, p[2] + 0.62], X, 0.18);
      const piv: V3 = [-0.28, kn[1] + 0.02, kn[2]];
      k.disc(piv, X, 0.06, 0.05, MAT.frame, 0.0);
      const roll: V3 = add(an, [0, 0.06, -0.04]);
      k.tube(piv, [-0.28, roll[1], roll[2]], 0.03, MAT.frame, -0.01);
      k.tube([-0.2, roll[1], roll[2]], [0.2, roll[1], roll[2]], 0.055, MAT.pad, -0.03);
      weightTower(k, SIDE, kn[2] - 0.2, 1.5, 0.04 + Math.max(0, roll[1] - seatY) * 0.2);
      break;
    }
    case 'legcurlseated': {
      seatAndBack(c, { backLen: 0.42 });
      const kn = mid(j.knL, j.knR), an = mid(j.anL, j.anR);
      // Oberschenkelpolster von oben, Rolle hinter den Fersen
      k.tube([-0.22, kn[1] + 0.11, kn[2] - 0.12], [0.22, kn[1] + 0.11, kn[2] - 0.12], 0.05, MAT.pad, -0.03);
      const piv: V3 = [-0.3, kn[1], kn[2]];
      k.disc(piv, X, 0.06, 0.05, MAT.frame, 0.0);
      const roll: V3 = add(an, [0, 0.02, 0.07]);
      k.tube(piv, [-0.28, roll[1], roll[2]], 0.03, MAT.frame, -0.01);
      k.tube([-0.2, roll[1], roll[2]], [0.2, roll[1], roll[2]], 0.055, MAT.pad, -0.03);
      rail(k, [0, 0, p[2] - 0.35], [0, 0, kn[2] + 0.3]);
      weightTower(k, SIDE, p[2] - 0.05, 1.6, 0.05);
      break;
    }
    case 'calf': {
      // Stehende Wadenmaschine: Trittblock, Schulterpolster am Schlitten, Gewichtsblock dahinter
      const f = mid(j.toeL, j.toeR);
      k.aabb(-0.3, 0.3, 0, 0.1, f[2] - 0.12, f[2] + 0.05, MAT.rubber, 0.0);
      const shY = Math.max(j.shL[1], j.shR[1]);
      for (const sx of [-1, 1]) k.pad([sx * 0.16, shY + 0.07, j.chest[2]], X, Y, Z, 0.08, 0.035, 0.12, -0.03);
      const tz = j.chest[2] - 0.35;
      k.tube([-0.16, shY + 0.07, j.chest[2] - 0.1], [-0.16, shY + 0.07, tz], 0.03, MAT.frame, 0.02);
      k.tube([0.16, shY + 0.07, j.chest[2] - 0.1], [0.16, shY + 0.07, tz], 0.03, MAT.frame, 0.02);
      weightTower(k, 0, tz - 0.1, 2.2, 0.05 + Math.max(0, shY - 1.4) * 0.3, true);
      rail(k, [0, 0, tz], [0, 0, f[2] + 0.2]);
      break;
    }
    case 'abductor': {
      seatAndBack(c, { backLen: 0.45 });
      // Polster außen an den Knien (Abduktoren) bzw. innen (Adduktoren), Fußrasten
      for (const [kn, an, sx] of [[j.knL, j.anL, -1], [j.knR, j.anR, 1]] as const) {
        k.pad(add(kn, [sx * 0.1, 0, -0.08]), Y, Z, X, 0.06, 0.12, 0.025, -0.03);
        k.tube(add(an, [0, -0.04, 0.02]), add(an, [sx * 0.1, -0.04, 0.02]), 0.02, MAT.chrome, -0.02);
        k.tube(add(kn, [sx * 0.13, -0.05, -0.08]), [sx * 0.12, seatY - 0.08, p[2] + 0.1], 0.03, MAT.frame, 0.0);
      }
      rail(k, [0, 0, p[2] - 0.4], [0, 0, p[2] + 0.6]);
      weightTower(k, 0, p[2] - 0.65, 1.6, 0.05);
      break;
    }
    case 'abmachine': {
      seatAndBack(c, { back: false, seatLen: 0.2 });
      // Brustpolster und Griffe über den Schultern, Drehpunkt seitlich auf Hüfthöhe
      const up = norm(sub(j.chest, j.pelvis));
      const n = mul(norm(cross(X, up)), -1);
      const padC = add(at(j.pelvis, j.chest, 0.85), mul(n, 0.15));
      k.pad(padC, X, up, n, 0.17, 0.09, 0.04, -0.03);
      const piv: V3 = [-0.32, p[1], p[2] - 0.05];
      k.disc(piv, X, 0.07, 0.05, MAT.frame, 0.02);
      k.tube(piv, [-0.32, padC[1], padC[2]], 0.035, MAT.frame, 0.0);
      k.tube([-0.32, padC[1], padC[2]], padC, 0.03, MAT.frame, -0.01);
      for (const hd of [j.handL, j.handR]) grip(k, hd, X, 0.06);
      k.tube([0, 0.05, p[2] - 0.25], [0, j.chest[1] + 0.2, p[2] - 0.3], 0.045, MAT.frame, 0.06);
      k.pad([0, j.chest[1], p[2] - 0.32], X, Y, Z, 0.19, 0.3, 0.04, BEHIND);
      weightTower(k, SIDE, p[2] - 0.1, 1.6, 0.05);
      rail(k, [-0.2, 0, p[2] - 0.1], [SIDE, 0, p[2] - 0.1]);
      break;
    }
    case 'preacher':
    case 'curlmachine': {
      // Scott-Pult: schräges Armpolster auf einem Ständer, Sitz davor
      const el = mid(j.elL, j.elR);
      k.pad([0, seatY - 0.04, p[2] + 0.03], X, Y, Z, 0.18, 0.04, 0.17, BEHIND);
      k.tube([0, 0.05, p[2] + 0.03], [0, seatY - 0.08, p[2] + 0.03], 0.04, MAT.frame, 0.05);
      const slope = norm([0, -0.6, 1]);
      const padC = add(el, [0, -0.03, 0.12]);
      k.pad(padC, X, slope, norm(cross(X, slope)), 0.28, 0.14, 0.04, 0.03);
      k.tube(add(padC, [0, -0.1, 0.05]), [0, 0.05, padC[2] + 0.12], 0.045, MAT.frame, 0.06);
      rail(k, [0, 0, p[2] - 0.2], [0, 0, padC[2] + 0.35]);
      if (type === 'curlmachine') {
        const piv: V3 = [-0.3, el[1], el[2] + 0.05];
        k.disc(piv, X, 0.06, 0.05, MAT.frame, 0.0);
        k.tube(piv, add(j.handL, [-0.06, 0, 0]), 0.03, MAT.frame, -0.02);
        k.tube(add(j.handL, [-0.06, 0, 0]), add(j.handR, [0.06, 0, 0]), 0.018, MAT.chrome, -0.03);
        weightTower(k, SIDE, padC[2] + 0.1, 1.6, 0.05);
      }
      break;
    }
    case 'dipmachine': {
      seatAndBack(c, { backLen: 0.5 });
      const pz = p[2] - 0.3;
      for (const [hd, sx] of [[j.handL, -1], [j.handR, 1]] as const) {
        const piv: V3 = [sx * 0.36, 1.25, pz];
        k.disc(piv, X, 0.05, 0.05, MAT.frame, 0.03);
        k.tube(piv, add(hd, [sx * 0.05, 0, -0.05]), 0.032, MAT.frame, 0.0);
        grip(k, hd, Z, 0.07);
      }
      k.tube([0, 0.05, pz], [0, 1.25, pz], 0.05, MAT.frame, 0.08);
      k.tube([-0.36, 1.25, pz], [0.36, 1.25, pz], 0.03, MAT.frame, 0.06);
      weightTower(k, 0, pz - 0.35, 1.7, 0.05);
      rail(k, [0, 0, pz - 0.5], [0, 0, p[2] + 0.45]);
      break;
    }
    case 'smith': {
      // Multipresse: zwei Säulen mit Führung, Stange hängt in der Führung, Haken
      const z = hands[2];
      for (const sx of [-0.68, 0.68]) {
        k.tube([sx, 0.04, z], [sx, 2.3, z], 0.04, MAT.chrome, 0.1);
        k.tube([sx, 0.04, z - 0.35], [sx, 2.3, z - 0.35], 0.05, MAT.frame, 0.12);
        k.tube([sx, 2.3, z], [sx, 2.3, z - 0.35], 0.045, MAT.frame, 0.12);
        rail(k, [sx, 0, z - 0.6], [sx, 0, z + 0.45]);
        k.aabb(sx - 0.05, sx + 0.05, hands[1] - 0.06, hands[1] + 0.06, z - 0.05, z + 0.05, MAT.frame, -0.02);
      }
      k.tube([-0.68, 2.3, z - 0.35], [0.68, 2.3, z - 0.35], 0.045, MAT.frame, 0.12);
      break;
    }
    case 'rack': {
      // Kniebeugen-Ständer hinter der Figur (Sicherheitsablagen)
      const z = j.chest[2] - 0.45;
      for (const sx of [-0.6, 0.6]) {
        k.aabb(sx - 0.035, sx + 0.035, 0, 2.2, z - 0.035, z + 0.035, MAT.frame, 0.12);
        k.aabb(sx - 0.035, sx + 0.035, 0, 2.2, z + 0.62, z + 0.69, MAT.frame, 0.12);
        k.aabb(sx - 0.05, sx + 0.05, 0.9, 0.95, z, z + 0.66, MAT.chrome, 0.1);
        rail(k, [sx, 0, z - 0.1], [sx, 0, z + 0.75]);
      }
      break;
    }
    case 'hipthrust': {
      // Hip-Thrust-Maschine: Rückenpolster, Beckengurt-Polster am Hebel
      const up = norm(sub(j.chest, j.pelvis));
      k.pad([0, 0.42, j.chest[2] - 0.05], X, Y, Z, 0.24, 0.045, 0.16, BEHIND);
      for (const sx of [-0.17, 0.17]) k.tube([sx, 0.04, j.chest[2] - 0.12], [sx, 0.37, j.chest[2] - 0.05], 0.03, MAT.frame, 0.06);
      k.tube([-0.2, 0.04, j.chest[2] - 0.12], [0.2, 0.04, j.chest[2] - 0.12], 0.03, MAT.frame, 0.07);
      const belt = add(p, [0, 0.13, 0.02]);
      k.tube(add(belt, [-0.25, 0, 0]), add(belt, [0.25, 0, 0]), 0.06, MAT.pad, -0.04);
      const piv: V3 = [-0.36, 0.3, p[2] + 0.4];
      k.disc(piv, X, 0.06, 0.05, MAT.frame, 0.0);
      k.tube(piv, add(belt, [-0.28, 0, 0]), 0.03, MAT.frame, -0.01);
      rail(k, [0, 0, j.chest[2] - 0.2], [0, 0, mid(j.toeL, j.toeR)[2] + 0.2]);
      void up;
      break;
    }
    case 'assist': {
      // Klimmzug-/Dip-Maschine mit Kniepolster (Unterstützung)
      const kn = mid(j.knL, j.knR);
      k.pad(add(kn, [0, -0.06, 0]), X, Y, Z, 0.17, 0.035, 0.12, -0.02);
      k.tube(add(kn, [0, -0.1, -0.05]), [0, 0.5, kn[2] - 0.45], 0.035, MAT.frame, 0.02);
      const z = j.chest[2] - 0.35;
      for (const sx of [-0.55, 0.55]) k.tube([sx, 0.04, z], [sx, 2.35, z], 0.05, MAT.frame, 0.1);
      k.tube([-0.55, 2.35, z], [0.55, 2.35, z], 0.05, MAT.frame, 0.1);
      for (const sx of [-1, 1]) {
        k.tube([sx * 0.55, 2.3, z], [sx * 0.45, hands[1], hands[2]], 0.03, MAT.frame, 0.02);
        grip(k, [sx * 0.42, hands[1], hands[2]], X, 0.07);
      }
      rail(k, [0, 0, z - 0.2], [0, 0, kn[2] + 0.3]);
      weightTower(k, 0, z - 0.3, 1.6, 0.05);
      break;
    }
  }
}
