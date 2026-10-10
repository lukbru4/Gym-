// Einfache 3D-Figur für die Übungs-Animationen: Gelenke werden aus Winkeln berechnet (Vorwärtskinematik),
// danach perspektivisch auf den Bildschirm projiziert. Keine fremden Modelle, keine Bibliothek.
export type V3 = [number, number, number];

/** Gelenkwinkel in Grad. Koordinaten: x = seitlich (rechts der Figur), y = oben, z = nach vorn (Blickrichtung der Figur). */
export interface Pose {
  /** Rumpf: Neigung aus der Senkrechten nach vorn (0 = aufrecht, 90 = waagerecht nach vorn, −90 = liegend auf dem Rücken) */
  trunk: number;
  /** Rumpfdrehung um die Körperachse (Schultern gegen die Hüfte) */
  twist: number;
  /** Nackenwinkel relativ zum Rumpf (positiv = Kopf nach hinten/oben) */
  neck: number;
  /** Oberschenkel links/rechts: Winkel aus der Senkrechten nach vorn (0 = gerade nach unten) */
  hipL: number; hipR: number;
  /** Kniebeugung: Unterschenkel schwingt um so viel nach hinten */
  kneeL: number; kneeR: number;
  /** Beine seitlich abspreizen */
  abdL: number; abdR: number;
  /** Fußspitze nach unten (Zehenspitzenstand) */
  footL: number; footR: number;
  /** Oberarme links/rechts: Hebung aus der Senkrechten (0 = hängt, 90 = waagerecht, 180 = über Kopf) und Ebene (0 = nach vorn, 90 = zur Seite, −90 = über den Körper) */
  armL: number; armPlaneL: number; armR: number; armPlaneR: number;
  /** Unterarme: Hebung und Ebene absolut (wie bei den Oberarmen) */
  foreL: number; forePlaneL: number; foreR: number; forePlaneR: number;
  /** Beckenverschiebung nach vorn/hinten (m) und Höhe (nur bei „ohne Boden“-Verankerung) */
  shift: number;
  lift: number;
  /** Schultern hochziehen (m) */
  shrug: number;
}

export const NEUTRAL: Pose = {
  trunk: 0, twist: 0, neck: 0,
  hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, abdL: 0, abdR: 0, footL: 0, footR: 0,
  armL: 8, armPlaneL: 0, armR: 8, armPlaneR: 0, foreL: 14, forePlaneL: 0, foreR: 14, forePlaneR: 0,
  shift: 0, lift: 0, shrug: 0,
};

export const LEN = { torso: 0.5, neck: 0.14, head: 0.11, shoulder: 0.2, hip: 0.1, upper: 0.3, fore: 0.27, hand: 0.08, thigh: 0.44, shin: 0.43, foot: 0.24, heel: 0.06 };

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

/** Richtung aus Hebung e (0 = nach unten, 90 = waagerecht, 180 = nach oben) und Ebene p (0 = vorn, 90 = seitlich nach außen) */
export function dirFrom(e: number, p: number, side: 1 | -1): V3 {
  const E = rad(e), P = rad(p);
  return [Math.sin(E) * Math.sin(P) * side, -Math.cos(E), Math.sin(E) * Math.cos(P)];
}
/** Bein: Winkel aus der Senkrechten nach vorn (a) plus seitliches Abspreizen */
function legDir(a: number, abd: number, side: 1 | -1): V3 {
  const A = rad(a), B = rad(abd);
  return [Math.sin(B) * side, -Math.cos(A) * Math.cos(B), Math.sin(A) * Math.cos(B)];
}

export interface Joints {
  pelvis: V3; chest: V3; neckTop: V3; head: V3;
  shL: V3; shR: V3; elL: V3; elR: V3; wrL: V3; wrR: V3; handL: V3; handR: V3;
  hipL: V3; hipR: V3; knL: V3; knR: V3; anL: V3; anR: V3; toeL: V3; toeR: V3; heelL: V3; heelR: V3;
}

/** Verankerung: wo die Figur den Halt hat – bestimmt die Höhe des Beckens */
export type Anchor =
  | { on: 'feet' }
  | { on: 'surface'; y: number }          // Becken liegt auf Bank/Boden (Höhe y der Unterlage)
  | { on: 'hands' }                        // Liegestütz/Plank: Hände am Boden
  | { on: 'hang'; y: number };             // Hängen an der Stange (Handgelenke auf Höhe y)

export function solve(p: Pose, anchor: Anchor = { on: 'feet' }): Joints {
  const t = rad(p.trunk);
  const up: V3 = [0, Math.cos(t), Math.sin(t)]; // Richtung Becken → Brust
  const pelvis: V3 = [0, 0, p.shift];
  const chest = add(pelvis, mul(up, LEN.torso));
  // Schulterlinie: quer zum Rumpf, um die Körperachse gedreht
  const tw = rad(p.twist);
  const across: V3 = [Math.cos(tw), 0, -Math.sin(tw)];
  const shR = add(add(chest, mul(across, LEN.shoulder)), [0, p.shrug, 0]);
  const shL = add(add(chest, mul(across, -LEN.shoulder)), [0, p.shrug, 0]);
  const headDir: V3 = [0, Math.cos(t * 0.35 + rad(p.neck)), Math.sin(t * 0.35 + rad(p.neck))];
  const neckTop = add(chest, mul(headDir, LEN.neck));
  const head = add(neckTop, mul(headDir, LEN.head));

  // Arme (Drehung der Ebene mit der Schulterlinie)
  const rotY = (v: V3): V3 => [v[0] * Math.cos(tw) + v[2] * Math.sin(tw), v[1], -v[0] * Math.sin(tw) + v[2] * Math.cos(tw)];
  const arm = (sh: V3, e: number, pl: number, e2: number, pl2: number, side: 1 | -1) => {
    const el = add(sh, mul(rotY(dirFrom(e, pl, side)), LEN.upper));
    const wr = add(el, mul(rotY(dirFrom(e2, pl2, side)), LEN.fore));
    const hand = add(wr, mul(rotY(dirFrom(e2, pl2, side)), LEN.hand));
    return { el, wr, hand };
  };
  const aR = arm(shR, p.armR, p.armPlaneR, p.foreR, p.forePlaneR, 1);
  const aL = arm(shL, p.armL, p.armPlaneL, p.foreL, p.forePlaneL, -1);

  // Beine
  const hipR = add(pelvis, [LEN.hip, 0, 0]);
  const hipL = add(pelvis, [-LEN.hip, 0, 0]);
  const leg = (hp: V3, hip: number, knee: number, abd: number, foot: number, side: 1 | -1) => {
    const kn = add(hp, mul(legDir(hip, abd, side), LEN.thigh));
    const an = add(kn, mul(legDir(hip - knee, abd, side), LEN.shin));
    const f = rad(foot);
    const toeDir: V3 = [0, -Math.sin(f), Math.cos(f)];
    const toe = add(an, mul(toeDir, LEN.foot));
    const heel = add(an, [0, -0.02, -LEN.heel]);
    return { kn, an, toe, heel };
  };
  const lR = leg(hipR, p.hipR, p.kneeR, p.abdR, p.footR, 1);
  const lL = leg(hipL, p.hipL, p.kneeL, p.abdL, p.footL, -1);

  const j: Joints = {
    pelvis, chest, neckTop, head, shL, shR, elL: aL.el, elR: aR.el, wrL: aL.wr, wrR: aR.wr, handL: aL.hand, handR: aR.hand,
    hipL, hipR, knL: lL.kn, knR: lR.kn, anL: lL.an, anR: lR.an, toeL: lL.toe, toeR: lR.toe, heelL: lL.heel, heelR: lR.heel,
  };

  // Höhe so wählen, dass die Figur Halt hat
  let dy = 0;
  if (anchor.on === 'feet') dy = -Math.min(j.toeL[1], j.toeR[1], j.heelL[1], j.heelR[1]);
  else if (anchor.on === 'surface') dy = anchor.y + 0.1;
  else if (anchor.on === 'hands') dy = -Math.min(j.handL[1], j.handR[1]) + 0.03;
  else dy = anchor.y - Math.max(j.wrL[1], j.wrR[1]);
  dy += p.lift;
  for (const k of Object.keys(j) as (keyof Joints)[]) j[k] = [j[k][0], j[k][1] + dy, j[k][2]];
  return j;
}

// ---- Kamera ---------------------------------------------------------------------------
export interface Camera { azimuth: number; elevation: number; distance: number; target: V3 }
export interface Projected { x: number; y: number; s: number; depth: number }

/** Perspektivische Projektion auf Bildkoordinaten (Einheit: Pixel bei Bildhöhe h) */
export function project(v: V3, cam: Camera, w: number, h: number): Projected {
  const a = rad(cam.azimuth), e = rad(cam.elevation);
  const x0 = v[0] - cam.target[0], y0 = v[1] - cam.target[1], z0 = v[2] - cam.target[2];
  // um die senkrechte Achse drehen, dann kippen
  const x1 = x0 * Math.cos(a) + z0 * Math.sin(a);
  const z1 = -x0 * Math.sin(a) + z0 * Math.cos(a);
  const y2 = y0 * Math.cos(e) - z1 * Math.sin(e);
  const z2 = y0 * Math.sin(e) + z1 * Math.cos(e);
  const dist = cam.distance - z2; // Abstand zur Kamera (z2 positiv = näher)
  const f = h * 0.95;
  const s = f / dist;
  return { x: w / 2 + x1 * s, y: h / 2 - y2 * s, s, depth: dist };
}

// ---- Animation ------------------------------------------------------------------------
export type PoseKey = keyof Pose;
export interface Keyframe { pose: Partial<Pose> }

const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);

/** Pose zum Zeitpunkt u (0–1) zwischen den Schlüsselbildern (hin und zurück) */
export function poseAt(base: Partial<Pose>, frames: Keyframe[], u: number): Pose {
  const n = frames.length;
  const full = frames.map((f) => ({ ...NEUTRAL, ...base, ...f.pose }) as Pose);
  if (n === 1) return full[0];
  // hin (0 → 0,5) und zurück (0,5 → 1)
  const pp = u < 0.5 ? u * 2 : (1 - u) * 2; // 0 → 1 → 0
  const pos = pp * (n - 1);
  const i = Math.min(n - 2, Math.floor(pos));
  const k = ease(pos - i);
  const out = { ...full[i] } as Pose;
  for (const key of Object.keys(out) as PoseKey[]) out[key] = full[i][key] + (full[i + 1][key] - full[i][key]) * k;
  return out;
}
