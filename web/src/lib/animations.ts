// Bewegungsmuster für die 3D-Figur: Schlüsselbilder (Winkel), Hilfsmittel, Hinweise zur Ausführung.
// Jede Übung des Katalogs wird einem Muster zugeordnet (animIdFor); Varianten (Kurzhantel, Maschine, Kabel …)
// unterscheiden sich in den Hilfsmitteln, die gezeichnet werden.
import type { MachineType } from './machines';
import type { Anchor, Keyframe, Pose, V3 } from './rig';

export type Segment = 'chest' | 'abs' | 'upperBack' | 'lowerBack' | 'shoulders' | 'upperArms' | 'forearms' | 'glutes' | 'thighs' | 'calves';

export type Prop =
  | { kind: 'barbell' }
  | { kind: 'dumbbells' }
  | { kind: 'kettlebell' }
  | { kind: 'bench'; angle?: number }                 // Winkel der Rückenlehne (0 = flach)
  | { kind: 'seat'; back?: number }                    // Sitz mit Lehne (Maschine)
  | { kind: 'cable'; from: V3 }                        // Kabelzug von der Rolle zu den Händen (mit Kabelturm samt Gewichtsblock)
  | { kind: 'pecpads' }                                // Butterfly-Maschine: Armpolster mit Drehachse
  | { kind: 'legpad' }                                 // Beinrolle (Beinstrecker/-beuger)
  | { kind: 'kneepad' }                                // Knierolle (Latziehen)
  | { kind: 'stack'; dz?: number; lever?: boolean; front?: boolean }    // Gewichtsblock mit Rahmen hinter dem Sitz (Maschine); lever = Druckhebel zu den Händen
  | { kind: 'bar'; y: number }
  | { kind: 'dipbars'; y: number }
  | { kind: 'pullbar' }                                // Zugstange am Kabel (Latziehen)                         // feste Stange (Klimmzug)
  | { kind: 'rope'; y: number }                        // Springseil-Andeutung
  | { kind: 'bike' }
  | { kind: 'erg' }
  | { kind: 'treadmill' }
  | { kind: 'step' }
  | { kind: 'plate'; machine?: boolean }               // Beinpresse-Schlitten
  | { kind: 'machine'; type: MachineType; from?: V3 };  // echtes Studiogerät (machines.ts); from = Seilrolle relativ zum Becken

export interface Pattern {
  id: string;
  name: string;
  /** Sekunden für eine Wiederholung (hin und zurück) */
  seconds: number;
  base?: Partial<Pose>;
  frames: Keyframe[];
  anchor?: Anchor;
  props: Prop[];
  /** Kamera-Drehung (Grad) – 0 = von vorn, 90 = von der Seite */
  azimuth: number;
  /** wiederholter Ablauf (Gehen/Laufen): läuft als Zyklus statt hin und zurück */
  cycle?: boolean;
  cues: string[];
  mistakes: string[];
}

const L = <T,>(v: T) => v;
/** beide Beine gleich */
export const legs = (hip: number, knee: number, extra: Partial<Pose> = {}): Partial<Pose> => ({ hipL: hip, hipR: hip, kneeL: knee, kneeR: knee, ...extra });
/** beide Arme gleich: Oberarm (Hebung, Ebene), Unterarm (Hebung, Ebene) */
export const arms = (e: number, p: number, e2: number, p2: number): Partial<Pose> => ({ armL: e, armR: e, armPlaneL: p, armPlaneR: p, foreL: e2, foreR: e2, forePlaneL: p2, forePlaneR: p2 });

const F = (pose: Partial<Pose>): Keyframe => ({ pose });
const SURFACE: Anchor = { on: 'surface', y: 0.42 };

export const PATTERNS: Record<string, Pattern> = {};
const def = (p: Pattern) => void (PATTERNS[p.id] = p);

// ---- Beine ------------------------------------------------------------------------------
def({
  id: 'squat', name: 'Kniebeuge', seconds: 3.2, azimuth: 75, anchor: { on: 'feet' }, props: [{ kind: 'barbell' }],
  frames: [
    F({ ...legs(0, 0), trunk: 3, ...arms(35, 0, 160, 0) }),
    F({ ...legs(88, 112), trunk: 38, shift: -0.04, ...arms(35, 0, 160, 0) }),
  ],
  cues: ['Füße etwa schulterbreit, Fußspitzen leicht nach außen.', 'Brust raus, Rücken gerade, Blick nach vorn.', 'Hüfte nach hinten-unten schieben, Knie zeigen in Richtung der Fußspitzen.', 'Aus der Mitte des Fußes kräftig nach oben drücken.'],
  mistakes: ['Knie fallen nach innen.', 'Der Rücken rundet sich unten.', 'Die Fersen heben ab.'],
});
def({
  id: 'goblet', name: 'Kniebeuge mit Gewicht vor der Brust', seconds: 3.2, azimuth: 75, props: [{ kind: 'dumbbells' }],
  frames: [
    F({ ...legs(0, 0), trunk: 2, ...arms(40, 0, 150, 0) }),
    F({ ...legs(92, 118), trunk: 28, shift: -0.02, ...arms(55, 0, 150, 0) }),
  ],
  cues: ['Gewicht eng vor der Brust halten.', 'Ellbogen zeigen zwischen die Knie.', 'Aufrecht bleiben und tief gehen.'],
  mistakes: ['Das Gewicht rutscht von der Brust weg.', 'Zu starkes Vorbeugen.'],
});
def({
  id: 'hinge', name: 'Hüftbeuge (Kreuzheben)', seconds: 3.4, azimuth: 80, props: [{ kind: 'barbell' }],
  frames: [
    F({ ...legs(2, 4), trunk: 2, ...arms(0, 0, 8, 0) }),
    F({ ...legs(55, 38), trunk: 62, shift: -0.2, neck: 25, ...arms(2, 0, 8, 0) }),
  ],
  cues: ['Hüfte nach hinten schieben, als würdest du eine Tür zuschieben.', 'Rücken bleibt die ganze Zeit gerade.', 'Die Stange gleitet dicht an den Beinen entlang.', 'Oben die Hüfte nach vorn strecken, Gesäß anspannen.'],
  mistakes: ['Runder Rücken.', 'Die Stange schwingt weg vom Körper.', 'Der Rücken überstreckt oben.'],
});
def({
  id: 'lunge', name: 'Ausfallschritt', seconds: 3, azimuth: 80, props: [{ kind: 'dumbbells' }],
  frames: [
    F({ hipR: 14, kneeR: 12, hipL: -14, kneeL: 10, footL: 10, trunk: 0, ...arms(6, 0, 12, 0) }),
    F({ hipR: 78, kneeR: 90, hipL: -22, kneeL: 76, footL: 38, trunk: 2, ...arms(6, 0, 12, 0) }),
  ],
  cues: ['Großer Schritt, der Oberkörper bleibt aufrecht.', 'Das vordere Knie zeigt über die Fußspitze, aber nicht darüber hinaus.', 'Das hintere Knie berührt fast den Boden.', 'Aus der Ferse des vorderen Fußes hochdrücken.'],
  mistakes: ['Das Knie kippt nach innen.', 'Der Schritt ist zu kurz.', 'Der Oberkörper fällt nach vorn.'],
});
def({
  id: 'legpress', name: 'Beinpresse', seconds: 3.2, azimuth: 85, anchor: SURFACE, props: [{ kind: 'machine', type: 'legpress' }],
  base: { trunk: -50, ...arms(10, 0, 40, 0) },
  frames: [F({ ...legs(120, 110), shift: 0.0 }), F({ ...legs(78, 10), shift: 0.0 })],
  cues: ['Rücken und Becken bleiben fest an der Lehne.', 'Füße schulterbreit auf der Platte.', 'Beine fast strecken, Knie nicht durchdrücken.', 'Kontrolliert zurück, die Knie zeigen nach außen.'],
  mistakes: ['Das Becken hebt sich unten ab (Rücken rundet).', 'Knie komplett durchgedrückt.', 'Zu wenig Tiefe.'],
});
def({
  id: 'legext', name: 'Beinstrecker', seconds: 2.8, azimuth: 85, anchor: { on: 'surface', y: 0.4 }, props: [{ kind: 'machine', type: 'legext' }],
  base: { trunk: -8, ...arms(10, 0, 40, 0), hipL: 80, hipR: 80 },
  frames: [F({ kneeL: 95, kneeR: 95 }), F({ kneeL: 4, kneeR: 4 })],
  cues: ['Kniegelenk auf Höhe der Drehachse der Maschine.', 'Oben kurz anspannen.', 'Langsam senken.'],
  mistakes: ['Schwung statt Muskelkraft.', 'Das Gesäß hebt vom Sitz ab.'],
});
def({
  id: 'legcurl', name: 'Beinbeuger', seconds: 2.8, azimuth: 80, anchor: { on: 'surface', y: 0.4 }, props: [{ kind: 'machine', type: 'legcurl' }],
  base: { trunk: 90, hipL: 0, hipR: 0, ...arms(70, 0, 95, 0) },
  frames: [F({ hipL: -92, hipR: -92, kneeL: 0, kneeR: 0 }), F({ hipL: -92, hipR: -92, kneeL: 115, kneeR: 115 })],
  cues: ['Hüfte bleibt auf der Auflage.', 'Fersen zum Gesäß ziehen.', 'Langsam wieder strecken.'],
  mistakes: ['Das Becken hebt ab.', 'Zu schnelles Ablassen.'],
});
def({
  id: 'calf', name: 'Wadenheben', seconds: 2.4, azimuth: 80, anchor: { on: 'feet' }, props: [{ kind: 'step' }],
  frames: [F({ ...legs(0, 0), ...arms(8, 0, 14, 0), footL: -10, footR: -10 }), F({ ...legs(0, 0), ...arms(8, 0, 14, 0), footL: 55, footR: 55 })],
  cues: ['Ganz nach oben auf die Zehenspitzen.', 'Oben kurz halten.', 'Unten die Wade dehnen.'],
  mistakes: ['Wippen mit den Knien.', 'Zu kleine Bewegung.'],
});
def({
  id: 'glute', name: 'Hüftstrecken (Hip Thrust, Brücke)', seconds: 3, azimuth: 80, anchor: { on: 'surface', y: 0.1 }, props: [{ kind: 'bench' }, { kind: 'barbell' }],
  base: { ...arms(35, 0, 55, 0) },
  frames: [F({ ...legs(108, 98), trunk: -64, lift: 0.04 }), F({ ...legs(82, 85), trunk: -104, lift: 0.36 })],
  cues: ['Oberer Rücken liegt auf der Bank, Füße stehen fest.', 'Hüfte nach oben strecken, Gesäß fest anspannen.', 'Oben bilden Oberkörper und Oberschenkel eine Linie.', 'Das Kinn bleibt leicht zur Brust.'],
  mistakes: ['Hohlkreuz oben.', 'Die Füße stehen zu weit weg.'],
});
def({
  id: 'swing', name: 'Kettlebell Swing', seconds: 2, azimuth: 80, props: [{ kind: 'kettlebell' }],
  frames: [F({ ...legs(40, 35), trunk: 48, shift: -0.12, ...arms(25, 0, 25, 0) }), F({ ...legs(2, 3), trunk: 2, ...arms(90, 0, 90, 0) })],
  cues: ['Die Kraft kommt aus der Hüfte, nicht aus den Armen.', 'Oben steht der Körper wie ein Brett.', 'Die Kugel schwingt bis auf Brusthöhe.'],
  mistakes: ['Die Arme ziehen hoch.', 'Der Rücken rundet sich unten.'],
});
def({
  id: 'jump', name: 'Sprung', seconds: 1.4, azimuth: 80, props: [],
  frames: [F({ ...legs(70, 90), trunk: 30, ...arms(40, 0, 60, 0), shift: -0.05 }), F({ ...legs(2, 2), trunk: 0, ...arms(160, 0, 170, 0), lift: 0.3, footL: 50, footR: 50 })],
  cues: ['Tief ausholen, dann explosiv abspringen.', 'Weich und leise landen, Knie nachgeben.'],
  mistakes: ['Steife Landung.', 'Knie fallen nach innen.'],
});

// ---- Brust, Schultern, Trizeps ---------------------------------------------------------------
def({
  id: 'bench', name: 'Bankdrücken', seconds: 3, azimuth: 70, anchor: SURFACE, props: [{ kind: 'bench' }, { kind: 'barbell' }],
  base: { trunk: -90, ...legs(80, 80) },
  frames: [F({ ...arms(172, 0, 178, 0) }), F({ ...arms(100, 78, 180, 0) })],
  cues: ['Schulterblätter zusammen und nach unten, fester Stand.', 'Stange kontrolliert zur Brust senken.', 'Unterarme bleiben senkrecht.', 'Kraftvoll nach oben drücken, ohne die Schultern hochzuziehen.'],
  mistakes: ['Ellbogen zu weit nach außen (90°).', 'Die Stange prallt von der Brust ab.', 'Der Po hebt von der Bank ab.'],
});
def({
  id: 'incline', name: 'Schrägbankdrücken', seconds: 3, azimuth: 70, anchor: SURFACE, props: [{ kind: 'bench', angle: 35 }, { kind: 'barbell' }],
  base: { trunk: -55, ...legs(80, 80) },
  frames: [F({ ...arms(170, 0, 178, 0) }), F({ ...arms(100, 70, 180, 0) })],
  cues: ['Bank etwa 30–40° einstellen.', 'Stange zur oberen Brust senken.', 'Schulterblätter bleiben fest.'],
  mistakes: ['Die Bank ist zu steil (zu viel Schulter).', 'Rücken hohl.'],
});
def({
  id: 'fly', name: 'Fliegende / Butterfly', seconds: 3, azimuth: 40, anchor: SURFACE, props: [{ kind: 'bench' }, { kind: 'dumbbells' }],
  base: { trunk: -90, ...legs(80, 80) },
  frames: [F({ ...arms(170, 0, 172, 0) }), F({ armL: 100, armR: 100, armPlaneL: 90, armPlaneR: 90, foreL: 150, foreR: 150, forePlaneL: 80, forePlaneR: 80 })],
  cues: ['Ellbogen bleiben leicht gebeugt.', 'Die Arme öffnen sich wie beim Umarmen eines Baumes.', 'Oben die Brust zusammendrücken.'],
  mistakes: ['Zu tiefes Absenken (Schulter überdehnt).', 'Die Ellbogen strecken oder beugen sich ständig.'],
});
def({
  id: 'pecdeck', name: 'Butterfly (Maschine)', seconds: 3, azimuth: 35, anchor: { on: 'surface', y: 0.42 }, props: [{ kind: 'machine', type: 'pecdeck' }],
  base: { trunk: -2, ...legs(85, 85) },
  frames: [F({ armL: 92, armR: 92, armPlaneL: 78, armPlaneR: 78, foreL: 172, foreR: 172, forePlaneL: 0, forePlaneR: 0 }), F({ armL: 92, armR: 92, armPlaneL: 12, armPlaneR: 12, foreL: 172, foreR: 172, forePlaneL: 0, forePlaneR: 0 })],
  cues: ['Sitzhöhe so einstellen, dass die Ellbogen auf Schulterhöhe sind.', 'Unterarme liegen an den Polstern, Rücken fest an der Lehne.', 'Die Arme vor der Brust zusammenführen, kurz halten.', 'Kontrolliert öffnen, nicht über die Schulterlinie hinaus.'],
  mistakes: ['Schultern ziehen nach vorn.', 'Zu weit nach hinten öffnen (Schulter überdehnt).', 'Mit Schwung arbeiten.'],
});
def({
  id: 'chestpress', name: 'Brustpresse (Maschine)', seconds: 3, azimuth: 70, anchor: { on: 'surface', y: 0.42 }, props: [{ kind: 'machine', type: 'chestpress' }],
  base: { trunk: -2, ...legs(85, 85) },
  frames: [F({ ...arms(72, 45, 92, 5) }), F({ ...arms(88, 3, 90, 0) })],
  cues: ['Sitzhöhe so, dass die Griffe auf Brusthöhe sind.', 'Rücken fest an der Lehne.', 'Nach vorn drücken, Arme nicht komplett durchstrecken.'],
  mistakes: ['Schultern ziehen nach vorn.', 'Zu viel Schwung.'],
});
def({
  id: 'pushup', name: 'Liegestütz', seconds: 2.6, azimuth: 80, anchor: { on: 'hands' }, props: [],
  base: { neck: 12 },
  frames: [F({ trunk: 66, ...legs(-72, 0, { footL: 45, footR: 45 }), ...arms(6, 0, 6, 0) }), F({ trunk: 80, ...legs(-80, 0, { footL: 25, footR: 25 }), ...arms(-78, 25, 12, 10) })],
  cues: ['Körper bildet eine gerade Linie von Kopf bis Ferse.', 'Ellbogen etwa 45° zum Körper.', 'Brust fast bis zum Boden senken.', 'Kräftig hochdrücken.'],
  mistakes: ['Das Becken hängt durch oder ragt hoch.', 'Die Ellbogen zeigen weit nach außen.'],
});
def({
  id: 'dip', name: 'Dips (Barren)', seconds: 3, azimuth: 70, anchor: { on: 'hang', y: 1.02 }, props: [{ kind: 'dipbars', y: 1.02 }],
  base: { trunk: 12, ...legs(-22, 45), neck: 8 },
  frames: [F({ ...arms(2, 0, 2, 0) }), F({ ...arms(-40, 0, 42, 0), trunk: 22 })],
  cues: ['Schultern nach unten, Brust raus.', 'Ellbogen bleiben dicht am Körper (Trizeps) oder leicht vorgeneigt (Brust).', 'Nur so tief, wie es sich in der Schulter gut anfühlt.'],
  mistakes: ['Die Schultern rutschen nach vorn.', 'Zu tiefes Absinken.'],
});
def({
  id: 'ohp', name: 'Schulterdrücken', seconds: 3, azimuth: 55, props: [{ kind: 'barbell' }],
  frames: [F({ ...legs(0, 0), ...arms(40, 20, 150, 10) }), F({ ...legs(0, 0), ...arms(172, 8, 176, 5) })],
  cues: ['Rumpf fest, Po anspannen, kein Hohlkreuz.', 'Stange auf einer Linie über dem Kopf nach oben drücken.', 'Oben den Kopf leicht nach vorn „durchstecken“.'],
  mistakes: ['Starkes Hohlkreuz.', 'Die Ellbogen zeigen zu weit nach vorn oder hinten.'],
});
def({
  id: 'ohp-seated', name: 'Schulterdrücken (sitzend / Maschine)', seconds: 3, azimuth: 55, anchor: { on: 'surface', y: 0.42 }, props: [{ kind: 'seat', back: 0 }, { kind: 'stack' }, { kind: 'dumbbells' }],
  base: { trunk: 0, ...legs(88, 88) },
  frames: [F({ ...arms(110, 70, 160, 25) }), F({ ...arms(172, 12, 176, 8) })],
  cues: ['Rücken an der Lehne, Rumpf fest.', 'Unterarme bleiben senkrecht.', 'Oben nicht die Schultern hochziehen.'],
  mistakes: ['Hohlkreuz.', 'Die Hanteln wandern nach vorn.'],
});
def({
  id: 'lateral', name: 'Seitheben', seconds: 3, azimuth: 30, props: [{ kind: 'dumbbells' }],
  base: { ...legs(0, 0), trunk: 8 },
  frames: [F({ ...arms(10, 90, 14, 90) }), F({ ...arms(88, 90, 94, 90) })],
  cues: ['Ellbogen leicht gebeugt.', 'Seitlich bis auf Schulterhöhe heben, nicht höher.', 'Kleine Finger zeigen leicht nach oben, langsam senken.'],
  mistakes: ['Schwung aus dem Rücken.', 'Die Schultern ziehen hoch.'],
});
def({
  id: 'front', name: 'Frontheben', seconds: 3, azimuth: 80, props: [{ kind: 'dumbbells' }],
  base: { ...legs(0, 0) },
  frames: [F({ ...arms(10, 0, 14, 0) }), F({ ...arms(88, 0, 92, 0) })],
  cues: ['Arme fast gestreckt bis Schulterhöhe heben.', 'Kein Schwung aus dem Rücken.'],
  mistakes: ['Zu hoch heben.', 'Mit dem Oberkörper mitschwingen.'],
});
def({
  id: 'reversefly', name: 'Hintere Schulter (Reverse Fly, Face Pull)', seconds: 3, azimuth: 40, props: [{ kind: 'dumbbells' }],
  base: { ...legs(25, 30), trunk: 55, neck: 20 },
  frames: [F({ ...arms(15, 0, 18, 0) }), F({ ...arms(85, 90, 100, 90) })],
  cues: ['Oberkörper nach vorn geneigt, Rücken gerade.', 'Arme zur Seite öffnen, Schulterblätter zusammenziehen.', 'Kontrolliert zurück.'],
  mistakes: ['Schwung aus dem Rücken.', 'Die Schultern ziehen zu den Ohren.'],
});
def({
  id: 'shrug', name: 'Schulterheben (Nacken/Trapez)', seconds: 2, azimuth: 40, props: [{ kind: 'dumbbells' }],
  base: { ...legs(0, 0) },
  frames: [F({ ...arms(4, 0, 5, 0), shrug: 0 }), F({ ...arms(4, 0, 5, 0), shrug: 0.075, neck: -4 })],
  cues: ['Schultern gerade nach oben zu den Ohren ziehen.', 'Oben kurz halten, nicht kreisen.'],
  mistakes: ['Kreisende Bewegung.', 'Mit den Armen ziehen.'],
});

// ---- Rücken ---------------------------------------------------------------------------------
def({
  id: 'row', name: 'Rudern vorgebeugt', seconds: 3, azimuth: 75, props: [{ kind: 'barbell' }],
  base: { ...legs(28, 34), trunk: 55, neck: 25 },
  frames: [F({ ...arms(2, 0, 4, 0) }), F({ ...arms(-42, 0, 30, 0) })],
  cues: ['Oberkörper etwa 45° vorgebeugt, Rücken gerade.', 'Ellbogen führen die Bewegung dicht am Körper.', 'Stange zum Bauchnabel ziehen, Schulterblätter zusammen.'],
  mistakes: ['Schwungvoll mit dem Oberkörper mitziehen.', 'Runder Rücken.'],
});
def({
  id: 'seatedrow', name: 'Rudern sitzend (Kabel / Maschine)', seconds: 3, azimuth: 75, anchor: { on: 'surface', y: 0.38 }, props: [{ kind: 'machine', type: 'cablerow' }],
  base: { ...legs(75, 10), trunk: 2 },
  frames: [F({ ...arms(88, 0, 90, 0), shift: 0.05, trunk: 12 }), F({ ...arms(20, 0, 120, 0), shift: -0.02, trunk: -4 })],
  cues: ['Aufrecht sitzen, Brust raus.', 'Ellbogen dicht am Körper nach hinten ziehen.', 'Schulterblätter am Ende zusammendrücken.', 'Kontrolliert zurück, ohne den Rücken zu runden.'],
  mistakes: ['Mit dem Oberkörper vor- und zurückpendeln.', 'Die Schultern ziehen hoch.'],
});
def({
  id: 'dbrow', name: 'Kurzhantelrudern (einarmig)', seconds: 3, azimuth: 80, anchor: { on: 'feet' }, props: [{ kind: 'bench' }, { kind: 'dumbbells' }],
  base: { trunk: 78, hipL: 20, hipR: 20, kneeL: 25, kneeR: 25, armR: 0, armPlaneR: 0, foreR: 0, forePlaneR: 0, neck: 30 },
  frames: [F({ armL: 2, foreL: 3 }), F({ armL: -28, foreL: 38 })],
  cues: ['Eine Hand und ein Knie stützen auf der Bank.', 'Hantel zur Hüfte ziehen, Ellbogen nah am Körper.', 'Rücken bleibt waagerecht und gerade.'],
  mistakes: ['Der Oberkörper dreht auf.', 'Zu viel Schwung.'],
});
def({
  id: 'pulldown', name: 'Latziehen', seconds: 3, azimuth: 70, anchor: { on: 'surface', y: 0.4 }, props: [{ kind: 'machine', type: 'latpull' }],
  base: { ...legs(88, 88), trunk: -8 },
  frames: [F({ ...arms(172, 25, 176, 20) }), F({ ...arms(55, 70, 170, 35), trunk: -14 })],
  cues: ['Leicht zurücklehnen, Brust raus.', 'Stange zur oberen Brust ziehen, nicht in den Nacken.', 'Schulterblätter nach unten-hinten ziehen.', 'Arme oben nicht komplett durchhängen lassen.'],
  mistakes: ['Zu stark hinten überlehnen.', 'Mit dem Schwung des Körpers ziehen.'],
});
def({
  id: 'pullup', name: 'Klimmzug', seconds: 3.4, azimuth: 70, anchor: { on: 'hang', y: 2.15 }, props: [{ kind: 'bar', y: 2.15 }],
  base: { ...legs(-8, 28), trunk: -4 },
  frames: [F({ ...arms(172, 22, 176, 15) }), F({ ...arms(32, 40, 150, 25), lift: 0 })],
  cues: ['Schultern zuerst nach unten ziehen, dann die Ellbogen.', 'Kinn über die Stange.', 'Kontrolliert ablassen bis fast gestreckt.'],
  mistakes: ['Mit Schwung (Kipping).', 'Nicht ganz hinunter.'],
});
def({
  id: 'backext', name: 'Rückenstrecken', seconds: 3, azimuth: 80, anchor: { on: 'surface', y: 0.62 }, props: [{ kind: 'bench' }],
  base: { ...legs(-55, 0), ...arms(60, -10, 100, -70) },
  frames: [F({ trunk: 122, neck: 20 }), F({ trunk: 58, neck: 8 })],
  cues: ['Der Körper bildet oben eine Linie.', 'Nicht in ein Hohlkreuz überstrecken.', 'Langsam senken.'],
  mistakes: ['Schwung nach oben.', 'Überstrecken oben.'],
});

// ---- Arme -----------------------------------------------------------------------------------
def({
  id: 'curl', name: 'Bizepscurl', seconds: 3, azimuth: 55, props: [{ kind: 'dumbbells' }],
  base: { ...legs(0, 0) },
  frames: [F({ ...arms(6, 0, 10, 0) }), F({ ...arms(14, 0, 150, 0) })],
  cues: ['Ellbogen bleiben seitlich am Körper.', 'Hanteln hochführen, oben den Bizeps anspannen.', 'Langsam wieder senken, unten fast strecken.'],
  mistakes: ['Mit dem Rücken schwingen.', 'Die Ellbogen wandern nach vorn.'],
});
def({
  id: 'preacher', name: 'Scott-Curl (Preacher)', seconds: 3, azimuth: 70, anchor: { on: 'surface', y: 0.4 }, props: [{ kind: 'machine', type: 'preacher' }, { kind: 'barbell' }],
  base: { ...legs(88, 88), trunk: 10 },
  frames: [F({ ...arms(55, 0, 40, 0) }), F({ ...arms(55, 0, 160, 0) })],
  cues: ['Oberarme liegen fest auf dem Polster.', 'Nicht ganz strecken – die Spannung bleibt.', 'Langsam senken.'],
  mistakes: ['Das Gewicht fällt unten.', 'Der Po hebt ab.'],
});
def({
  id: 'triceps', name: 'Trizepsdrücken (Kabel)', seconds: 2.8, azimuth: 55, props: [{ kind: 'machine', type: 'cabletower', from: [0, 2.0, 0.42] }],
  base: { ...legs(0, 0), trunk: 8 },
  frames: [F({ ...arms(10, 0, 100, 0) }), F({ ...arms(8, 0, 6, 0) })],
  cues: ['Ellbogen bleiben seitlich am Körper.', 'Arme unten ganz strecken, kurz anspannen.', 'Nur die Unterarme bewegen sich.'],
  mistakes: ['Die Ellbogen wandern nach vorn.', 'Mit dem Oberkörper nachdrücken.'],
});
def({
  id: 'overhead', name: 'Trizeps über Kopf', seconds: 3, azimuth: 55, props: [{ kind: 'dumbbells' }],
  base: { ...legs(0, 0) },
  frames: [F({ ...arms(172, 5, 176, 5) }), F({ ...arms(172, 5, 60, 5), forePlaneL: 170, forePlaneR: 170, foreL: 70, foreR: 70 })],
  cues: ['Oberarme bleiben senkrecht und eng am Kopf.', 'Nur die Unterarme beugen und strecken.', 'Rumpf fest, kein Hohlkreuz.'],
  mistakes: ['Ellbogen weichen nach außen aus.', 'Hohlkreuz.'],
});
def({
  id: 'skull', name: 'French Press (liegend)', seconds: 3, azimuth: 70, anchor: SURFACE, props: [{ kind: 'bench' }, { kind: 'barbell' }],
  base: { trunk: -90, ...legs(80, 80) },
  frames: [F({ ...arms(172, 0, 176, 0) }), F({ ...arms(172, 0, 90, 0), foreL: 60, foreR: 60, forePlaneL: 180, forePlaneR: 180 })],
  cues: ['Oberarme bleiben senkrecht.', 'Nur die Unterarme senken, Stange Richtung Stirn.', 'Wieder strecken.'],
  mistakes: ['Die Ellbogen wandern nach außen.', 'Die Oberarme kippen.'],
});

// ---- Rumpf ----------------------------------------------------------------------------------
def({
  id: 'crunch', name: 'Crunch', seconds: 2.4, azimuth: 85, anchor: { on: 'surface', y: 0 }, props: [],
  base: { trunk: -90, ...legs(70, 100), ...arms(70, -10, 95, -75) },
  frames: [F({ trunk: -90 }), F({ trunk: -62, neck: 5 })],
  cues: ['Unterer Rücken bleibt am Boden.', 'Rippen zum Becken ziehen.', 'Nacken locker lassen.'],
  mistakes: ['Am Nacken ziehen.', 'Mit Schwung hochkommen.'],
});
def({
  id: 'legraise', name: 'Beinheben', seconds: 3, azimuth: 80, anchor: { on: 'hang', y: 2.15 }, props: [{ kind: 'bar', y: 2.15 }],
  base: { ...arms(172, 10, 176, 5), trunk: 2 },
  frames: [F({ ...legs(2, 4) }), F({ ...legs(88, 8) })],
  cues: ['Schultern nach unten, nicht hängen lassen.', 'Beine aus dem Bauch heben, nicht schwingen.', 'Becken nach oben kippen.'],
  mistakes: ['Schwung aus den Beinen.', 'Nur die Hüftbeuger arbeiten.'],
});
def({
  id: 'plank', name: 'Plank / Stütz', seconds: 3, azimuth: 80, anchor: { on: 'hands' }, props: [],
  base: { trunk: 70, ...legs(-76, 0, { footL: 40, footR: 40 }), ...arms(4, 0, 4, 0), neck: 10 },
  frames: [F({}), F({ lift: 0.015 })],
  cues: ['Gerade Linie von Kopf bis Ferse.', 'Bauch und Gesäß fest anspannen.', 'Normal weiteratmen.'],
  mistakes: ['Das Becken hängt durch.', 'Das Becken ragt hoch.'],
});
def({
  id: 'twist', name: 'Rumpfdrehung', seconds: 2.4, azimuth: 40, anchor: { on: 'surface', y: 0.1 }, props: [{ kind: 'dumbbells' }],
  base: { trunk: -35, ...legs(60, 110), ...arms(60, 0, 60, 0) },
  frames: [F({ twist: -45 }), F({ twist: 45 })],
  cues: ['Oberkörper leicht zurückgelehnt, Rücken gerade.', 'Aus dem Rumpf drehen, nicht nur die Arme bewegen.', 'Blick folgt den Händen.'],
  mistakes: ['Nur die Arme schwingen.', 'Rücken rund.'],
});
def({
  id: 'chop', name: 'Holzhacker (Kabel)', seconds: 2.6, azimuth: 40, props: [{ kind: 'cable', from: [0.5, 2.0, 0] }],
  base: { ...legs(15, 20) },
  frames: [F({ ...arms(150, 0, 160, 0), twist: -30 }), F({ ...arms(60, 0, 70, 0), twist: 35 })],
  cues: ['Kraft aus Rumpf und Hüfte.', 'Arme bleiben fast gestreckt.', 'Standfest bleiben.'],
  mistakes: ['Nur mit den Armen ziehen.', 'Die Knie drehen mit.'],
});

// ---- Cardio ---------------------------------------------------------------------------------
def({
  id: 'run', name: 'Laufen', seconds: 0.85, cycle: true, azimuth: 80, props: [{ kind: 'treadmill' }],
  base: { trunk: 6 },
  frames: [
    F({ hipR: 40, kneeR: 40, hipL: -25, kneeL: 20, armR: -30, foreR: 60, armL: 40, foreL: 90, lift: 0.04 }),
    F({ hipR: -25, kneeR: 20, hipL: 40, kneeL: 40, armR: 40, foreR: 90, armL: -30, foreL: 60, lift: 0.04 }),
  ],
  cues: ['Aufrecht laufen, leicht nach vorn geneigt.', 'Ellbogen etwa 90°, locker mitschwingen.', 'Mit dem Mittelfuß unter dem Körper landen.', 'Gleichmäßig atmen.'],
  mistakes: ['Zu große Schritte (Landung weit vor dem Körper).', 'Die Schultern hochgezogen.'],
});
def({
  id: 'walk', name: 'Gehen', seconds: 1.1, cycle: true, azimuth: 80, props: [],
  frames: [
    F({ hipR: 25, kneeR: 4, hipL: -18, kneeL: 20, armR: -18, foreR: 35, armL: 22, foreL: 38 }),
    F({ hipR: -18, kneeR: 20, hipL: 25, kneeL: 4, armR: 22, foreR: 38, armL: -18, foreL: 35 }),
  ],
  cues: ['Aufrecht gehen, Blick nach vorn.', 'Arme schwingen locker gegengleich.', 'Von der Ferse über den Fuß abrollen.'],
  mistakes: ['Hängende Schultern.', 'Zu kurze Schritte.'],
});
def({
  id: 'bike', name: 'Radfahren', seconds: 1.0, cycle: true, azimuth: 85, anchor: { on: 'surface', y: 0.85 }, props: [{ kind: 'bike' }],
  base: { trunk: 38, ...arms(55, 0, 70, 0), neck: 22 },
  frames: [F({ hipR: 80, kneeR: 105, hipL: 10, kneeL: 5 }), F({ hipR: 10, kneeR: 5, hipL: 80, kneeL: 105 })],
  cues: ['Sattelhöhe: Das Bein ist unten fast gestreckt.', 'Rund treten, nicht stampfen.', 'Rücken gerade, Schultern locker.'],
  mistakes: ['Sattel zu tief (Knie überlastet).', 'Verspannte Schultern.'],
});
def({
  id: 'erg', name: 'Rudergerät', seconds: 2.2, azimuth: 80, anchor: { on: 'surface', y: 0.3 }, props: [{ kind: 'erg' }],
  base: { ...arms(80, 0, 90, 0) },
  frames: [F({ ...legs(115, 125), trunk: 30, ...arms(85, 0, 90, 0), shift: -0.1 }), F({ ...legs(35, 4), trunk: -18, ...arms(20, 0, 120, 0), shift: 0.05 })],
  cues: ['Zuerst die Beine drücken, dann den Rücken öffnen, zuletzt die Arme ziehen.', 'Zurück in umgekehrter Reihenfolge: Arme, Rücken, Beine.', 'Der Rücken bleibt gerade.'],
  mistakes: ['Nur mit den Armen ziehen.', 'Zu früh mit dem Rücken nachgeben.'],
});
def({
  id: 'rope', name: 'Seilspringen', seconds: 0.5, cycle: true, azimuth: 55, props: [{ kind: 'rope', y: 0 }],
  base: { ...arms(25, 30, 70, 30) },
  frames: [F({ ...legs(2, 2), lift: 0.0, footL: 5, footR: 5 }), F({ ...legs(10, 20), lift: 0.1, footL: 40, footR: 40 })],
  cues: ['Kleine Sprünge auf dem Fußballen.', 'Das Seil kommt aus den Handgelenken.', 'Ellbogen bleiben am Körper.'],
  mistakes: ['Zu hoch springen.', 'Ganze Arme kreisen lassen.'],
});
def({
  id: 'generic', name: 'Ganzkörperbewegung', seconds: 3, azimuth: 55, props: [],
  frames: [F({ ...legs(0, 0), ...arms(8, 0, 14, 0) }), F({ ...legs(40, 60), trunk: 20, ...arms(70, 0, 90, 0) })],
  cues: ['Kontrolliert und mit sauberer Haltung ausführen.'],
  mistakes: ['Zu viel Schwung.'],
});

/** Abwandlung eines Musters mit anderen Hilfsmitteln (z. B. Kurzhanteln statt Langhantel) */
const variant = (base: string, id: string, name: string, props: Prop[], extra: Partial<Pattern> = {}) =>
  def({ ...PATTERNS[base], ...extra, id, name, props });
variant('bench', 'bench-db', 'Bankdrücken mit Kurzhanteln', [{ kind: 'bench' }, { kind: 'dumbbells' }]);
variant('incline', 'incline-db', 'Schrägbankdrücken mit Kurzhanteln', [{ kind: 'bench', angle: 35 }, { kind: 'dumbbells' }]);
variant('ohp', 'ohp-db', 'Schulterdrücken stehend mit Kurzhanteln', [{ kind: 'dumbbells' }]);
variant('row', 'row-db', 'Rudern vorgebeugt mit Kurzhanteln', [{ kind: 'dumbbells' }]);
variant('squat', 'squat-bw', 'Kniebeuge ohne Gewicht', [], { frames: [{ pose: { ...legs(0, 0), ...arms(10, 0, 20, 0) } }, { pose: { ...legs(90, 115), trunk: 30, ...arms(85, 0, 90, 0) } }] });
variant('hinge', 'hinge-db', 'Rumänisches Kreuzheben mit Kurzhanteln', [{ kind: 'dumbbells' }]);
variant('curl', 'curl-bar', 'Bizepscurl mit Stange', [{ kind: 'barbell' }]);
variant('curl', 'curl-cable', 'Bizepscurl am Kabel', [{ kind: 'machine', type: 'cabletower', from: [0, 0.3, 0.55] }]);
variant('triceps', 'triceps-rope', 'Trizepsdrücken mit Seil', [{ kind: 'machine', type: 'cabletower', from: [0, 2.0, 0.42] }]);
variant('run', 'cross', 'Crosstrainer', [], { seconds: 1.2 });
variant('lunge', 'lunge-bw', 'Ausfallschritt ohne Gewicht', []);
variant('crunch', 'situp', 'Sit-up', [], { frames: [{ pose: { trunk: -90 } }, { pose: { trunk: -8, neck: 5 } }] });

// ---- Maschinen-Varianten (echte Studiogeräte, machines.ts) ----
variant('ohp-seated', 'ohp-machine', 'Schulterpresse (Maschine)', [{ kind: 'machine', type: 'shoulderpress' }]);
variant('ohp-seated', 'ohp-smith', 'Schulterdrücken an der Smith-Maschine', [{ kind: 'seat' }, { kind: 'machine', type: 'smith' }, { kind: 'barbell' }]);
variant('seatedrow', 'rowmachine', 'Rudermaschine mit Brustpolster', [{ kind: 'machine', type: 'rowmachine' }], { frames: [{ pose: { ...arms(88, 0, 90, 0), shift: 0.02, trunk: 6 } }, { pose: { ...arms(20, 0, 120, 0), shift: 0.02, trunk: 4 } }] });
variant('calf', 'calf-machine', 'Wadenheben an der Maschine', [{ kind: 'machine', type: 'calf' }], { frames: [{ pose: { ...legs(0, 0), ...arms(150, 30, 30, 120), footL: -10, footR: -10 } }, { pose: { ...legs(0, 0), ...arms(150, 30, 30, 120), footL: 55, footR: 55 } }] });
variant('preacher', 'curl-machine', 'Bizepsmaschine (Scott)', [{ kind: 'machine', type: 'curlmachine' }]);
variant('bench', 'bench-smith', 'Bankdrücken an der Smith-Maschine', [{ kind: 'bench' }, { kind: 'machine', type: 'smith' }, { kind: 'barbell' }]);
variant('incline', 'incline-smith', 'Schrägbankdrücken an der Smith-Maschine', [{ kind: 'bench', angle: 35 }, { kind: 'machine', type: 'smith' }, { kind: 'barbell' }]);
variant('squat', 'squat-smith', 'Kniebeuge an der Smith-Maschine', [{ kind: 'machine', type: 'smith' }, { kind: 'barbell' }]);
variant('squat', 'hack', 'Hackenschmidt-Kniebeuge (Maschine)', [{ kind: 'machine', type: 'hack' }], { frames: [{ pose: { ...legs(0, 0), trunk: -12, ...arms(150, 60, 60, 80) } }, { pose: { ...legs(95, 110), trunk: -14, shift: -0.06, ...arms(150, 60, 60, 80) } }] });
variant('glute', 'hipthrust-machine', 'Hip Thrust an der Maschine', [{ kind: 'machine', type: 'hipthrust' }]);
variant('pullup', 'assist-pullup', 'Klimmzug-Maschine (unterstützt)', [{ kind: 'machine', type: 'assist' }], { base: { ...legs(-5, 95), trunk: -4 } });
def({
  id: 'cablefly', name: 'Cable Crossover (Kabelzug)', seconds: 3, azimuth: 30, props: [{ kind: 'machine', type: 'crossover' }],
  base: { ...legs(6, 8), trunk: 14 },
  frames: [F({ armL: 95, armR: 95, armPlaneL: 88, armPlaneR: 88, foreL: 105, foreR: 105, forePlaneL: 82, forePlaneR: 82 }), F({ armL: 62, armR: 62, armPlaneL: 18, armPlaneR: 18, foreL: 70, foreR: 70, forePlaneL: 8, forePlaneR: 8 })],
  cues: ['Leicht vorgebeugt, ein Fuß vor dem anderen für einen festen Stand.', 'Arme in einem Bogen vor dem Körper zusammenführen.', 'Ellbogen bleiben leicht gebeugt.', 'Kontrolliert öffnen, bis eine Dehnung in der Brust spürbar ist.'],
  mistakes: ['Mit den Armen drücken statt einen Bogen zu ziehen.', 'Zu viel Gewicht – der Oberkörper schwingt mit.'],
});
def({
  id: 'abmachine', name: 'Bauchmaschine', seconds: 2.6, azimuth: 70, anchor: { on: 'surface', y: 0.45 }, props: [{ kind: 'machine', type: 'abmachine' }],
  base: { ...legs(85, 85), ...arms(150, 35, 40, 140) },
  frames: [F({ trunk: 0 }), F({ trunk: 38, neck: -10 })],
  cues: ['Sitzhöhe so, dass das Polster auf der Brust liegt.', 'Den Oberkörper einrollen – Rippen zum Becken.', 'Langsam zurück, Spannung halten.'],
  mistakes: ['Mit den Armen ziehen.', 'Mit Schwung arbeiten.'],
});
def({
  id: 'abductor', name: 'Abduktoren (Maschine)', seconds: 2.6, azimuth: 20, anchor: { on: 'surface', y: 0.45 }, props: [{ kind: 'machine', type: 'abductor' }],
  base: { ...legs(80, 82), trunk: -14, ...arms(30, 20, 45, 20) },
  frames: [F({ abdL: 4, abdR: 4 }), F({ abdL: 32, abdR: 32 })],
  cues: ['Rücken an der Lehne, Becken fest im Sitz.', 'Beine kontrolliert nach außen drücken.', 'Kurz halten und langsam zurück.'],
  mistakes: ['Mit Schwung arbeiten.', 'Der Oberkörper beugt sich nach vorn.'],
});
variant('abductor', 'adductor', 'Adduktoren (Maschine)', [{ kind: 'machine', type: 'abductor' }], { frames: [{ pose: { abdL: 32, abdR: 32 } }, { pose: { abdL: 4, abdR: 4 } }] });
def({
  id: 'dipmachine', name: 'Dip-/Trizepsmaschine', seconds: 2.6, azimuth: 60, anchor: { on: 'surface', y: 0.45 }, props: [{ kind: 'machine', type: 'dipmachine' }],
  base: { ...legs(85, 85), trunk: 2 },
  frames: [F({ ...arms(-30, 0, 70, 0) }), F({ ...arms(4, 0, 6, 0) })],
  cues: ['Rücken an der Lehne, Schultern unten.', 'Griffe nach unten drücken, bis die Arme gestreckt sind.', 'Ellbogen bleiben eng am Körper.'],
  mistakes: ['Schultern ziehen hoch.', 'Ellbogen gehen weit nach außen.'],
});
def({
  id: 'legcurl-seated', name: 'Beinbeuger (sitzend)', seconds: 2.8, azimuth: 80, anchor: { on: 'surface', y: 0.45 }, props: [{ kind: 'machine', type: 'legcurlseated' }],
  base: { trunk: -10, ...arms(25, 20, 40, 20), hipL: 85, hipR: 85 },
  frames: [F({ kneeL: 5, kneeR: 5 }), F({ kneeL: 105, kneeR: 105 })],
  cues: ['Kniegelenk auf Höhe der Drehachse.', 'Oberschenkelpolster fest einstellen.', 'Fersen nach unten-hinten ziehen, langsam zurück.'],
  mistakes: ['Das Gesäß hebt ab.', 'Zu schnelles Zurückfedern.'],
});

export const PATTERN_IDS = Object.keys(PATTERNS);
void L;
