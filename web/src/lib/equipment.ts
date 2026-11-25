// Geräte einer Übung (am Namen erkannt): Schnellauswahl in der Übungsauswahl, Trainingsplan und Suche.
import type { Exercise } from './types';

/** Kleinschreibung ohne Akzente/Umlaut-Punkte: „drucken“ findet „Drücken“ */
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');

// Geräte-Schnellauswahl ganz oben in der Übungsauswahl (nur eine gleichzeitig)
export type EquipmentId = 'maschine' | 'kabel' | 'kurzhantel' | 'langhantel' | 'koerpergewicht' | 'cardio' | 'smith' | 'kettlebell' | 'band' | 'eigene';
export const EQUIPMENT: [EquipmentId, string][] = [
  ['maschine', 'Maschine'],
  ['kabel', 'Kabelturm'],
  ['kurzhantel', 'Kurzhantel'],
  ['langhantel', 'Langhantel'],
  ['koerpergewicht', 'Körpergewicht'],
  ['cardio', 'Cardio'],
  ['smith', 'Smith'],
  ['kettlebell', 'Kettlebell'],
  ['band', 'Band'],
  ['eigene', 'Eigene'],
];
export const EQUIPMENT_TEST: Record<Exclude<EquipmentId, 'cardio' | 'eigene'>, RegExp> = {
  maschine: /maschine|plattengerat|butterfly|beinpresse|beinstrecker|beinbeuger|brustpresse|abduktoren|adduktoren|^wadenheben$|hackenschmidt|bauchmaschine|trizepsmaschine/,
  kabel: /kabel|seil(?!springen|klettern|\b)|latziehen|pushdown|face pull|cable|pulldown|trizepsdrucken am kabel|woodchop|pallof/,
  kurzhantel: /kurzhantel|arnold press|hammercurl|konzentrationscurl|goblet|pullover/,
  langhantel: /langhantel|sz-stange|trap-bar|^bankdrucken(?! \((kurzhantel|kabel|maschine|smith|widerstandsband|kettlebell|plattengerat))|^schragbankdrucken(?! \((kurzhantel|kabel|maschine|smith|widerstandsband|plattengerat))|^kreuzheben|^kniebeuge|sumo-kreuzheben|pendlay|rack pull|good morning|^french press|hip thrust \(langhantel|^clean|^snatch|^jerk|enges bankdrucken/,
  koerpergewicht: /korpergewicht|liegestutz|klimmz|^dips|plank|crunch|sit-up|beinheben|knieheben|burpee|superman|ausfallschritt|bulgar|wandsitzen|mountain|bicycle|russian|dead bug|bird dog|hollow|seitstutz|calisthenics|muscle-up|handstand|glute bridge|clamshell|step-up|bank-dips|inverted|nordic|hyperextension/,
  smith: /smith/,
  kettlebell: /kettlebell/,
  band: /widerstandsband|\bband\b/,
};
/** Gerät einer Übung für die Anzeige („Ausrüstung“) */
export const equipmentOf = (ex: Pick<Exercise, 'name' | 'type'>): string => {
  if (ex.type === 'cardio') return 'Cardio-Gerät oder Strecke';
  const probe = { ...ex, id: 0, user_id: null } as Exercise;
  const hit = (['maschine', 'kabel', 'smith', 'kettlebell', 'band', 'kurzhantel', 'langhantel', 'koerpergewicht'] as EquipmentId[]).find((id) => matchesEquipment(probe, id));
  return hit ? EQUIPMENT.find(([id]) => id === hit)![1] : 'Körpergewicht';
};
export const matchesEquipment = (ex: Pick<Exercise, 'name' | 'type' | 'user_id'>, id: EquipmentId): boolean => {
  if (id === 'cardio') return ex.type === 'cardio';
  if (id === 'eigene') return Boolean(ex.user_id);
  if (ex.type === 'cardio') return false;
  return nameHasEquipment(ex.name, id);
};
/** Gerät allein am Namen erkennen (für die Suche) */
export const nameHasEquipment = (name: string, id: Exclude<EquipmentId, 'cardio' | 'eigene'>): boolean => {
  const n = normalize(name);
  if (!EQUIPMENT_TEST[id].test(n)) return false;
  // „Brustpresse (Kabel)“, „Abduktoren (Widerstandsband)“: Gerätename im Namen schlägt die typische Maschine
  if (id === 'maschine') return /maschine|plattengerat/.test(n) || !OTHER_GEAR.test(n);
  // „Hammercurls (Kabel)“, „Pullover (Kabel)“: typische Kurzhantel-Übung, aber mit anderem Gerät
  if (id === 'kurzhantel') return /kurzhantel/.test(n) || !OTHER_GEAR.test(n);
  // „Cable Crunches (Kabel)“, „Dips (gewichtet)“ mit Hantel o. Ä. zählen nicht als reines Körpergewicht
  if (id === 'koerpergewicht') return /korpergewicht/.test(n) || !WEIGHT_GEAR.test(n);
  return true;
};
const OTHER_GEAR = /kabel|seil|widerstandsband|\bband\b|kurzhantel|langhantel|kettlebell|korpergewicht|landmine|ringe|schlingentrainer|gymnastikball|sz-stange|hantelscheibe/;
const WEIGHT_GEAR = /kabel|maschine|smith|kurzhantel|langhantel|kettlebell|sz-stange|hantelscheibe|landmine|cable/;

