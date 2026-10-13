// Suchbegriffe für Übungen: Name + Katalog-Stichwörter + Körperregion (z. B. „hintere Schulter“) + Muskel-Synonyme.
// So findet „hintere schulter“, „po“ oder „breiter rücken“ die passenden Übungen – egal ob Umlaute oder Englisch.
import { keywordsOf } from './exerciseCatalog';

export const normalizeSearch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

/** [Muster auf Name + Stichwörter, zusätzliche Begriffe, Ausnahme?] – Muster ohne Umlaute (normalisiert) */
const RULES: [RegExp, string, RegExp?][] = [
  [/rear|face ?pull|reverse (fly|butterfly|pec)|(vorgebeugt\w*|bent over) (seitheben|lateral|raise|fly)|(seitheben|raise)[^,]*vorgebeugt|hintere schulter/, 'hintere Schulter, Rear Delt, hinterer Delta'],
  [/seitheben|lateral raise|side raise/, 'seitliche Schulter, Side Delt, seitlicher Delta, breite Schultern', /vorgebeugt|rear|reverse|bent over/],
  [/schulterdrucken|frontheben|front raise|overhead press|military|arnold|shoulder press/, 'vordere Schulter, Front Delt, vorderer Delta'],
  [/schrag|incline|obere brust/, 'obere Brust, Upper Chest'],
  [/\bdips|decline|negativ|untere brust/, 'untere Brust, Lower Chest', /bank ?dips|bench dips|trizeps dips/],
  [/bankdrucken|bench press|butterfly|\bfly|flys|fliegende|crossover|brustpresse|liegestutz|push ?up|pec deck/, 'Brust, Chest, Brustmuskel', /reverse|rear|vorgebeugt|enges bankdrucken|close grip/],
  [/hip thrust|glute|gesass|bridge|abduktor|abduction|po-|\bpo\b/, 'Po, Gesäß, Glutes, Hintern', /trizeps|triceps/],
  [/adduktor|adduction|innenschenkel/, 'Innenschenkel, Adduktoren, Oberschenkel innen'],
  [/abduktor|abduction|aussenschenkel/, 'Außenschenkel, Abduktoren, Hüfte außen'],
  [/shrug|nacken|trapez|schulterheben/, 'Nacken, Trapez, Trapezius'],
  [/rudern|\brow\b|\brows\b/, 'oberer Rücken, Rückendicke, Rücken Mitte'],
  [/latziehen|klimmzug|pull ?up|chin ?up|pulldown|pullover|\blat\b|latissimus/, 'breiter Rücken, Rückenbreite, Latissimus, Lat'],
  [/kreuzheben|deadlift|hyperextension|ruckenstrecker|back extension|good morning/, 'unterer Rücken, Rückenstrecker, Lendenwirbel'],
  [/hammer|reverse curl|zottman|brachialis/, 'Unterarme, Brachialis, Oberarm außen'],
  [/curl/, 'Bizeps, Oberarm vorne', /leg curl|beinbeuger|nordic|wrist curl|handgelenk/],
  [/uberkopf|overhead[^,]*(trizeps|triceps|extension)|french|skull|stirndrucken/, 'langer Trizepskopf, Trizeps lang'],
  [/trizeps|triceps|pushdown|kickback|\bdips|enges bankdrucken|close grip/, 'Trizeps, Oberarm hinten', /glute|gesass|bein|po-|\bpo\b|hip/],
  [/crunch|plank|beinheben|leg raise|sit ?up|bauch|ab wheel|rollout|hollow/, 'Bauch, Sixpack, Core, Rumpf, Bauchmuskeln'],
  [/russian twist|twist|holzhacker|woodchop|oblique|side plank|seitstutz|seitbeug|pallof/, 'seitliche Bauchmuskeln, Obliques, schräge Bauchmuskeln'],
  [/wade|calf/, 'Waden, Unterschenkel, Calves'],
  [/unterarm|wrist|handgelenk|farmer|griffkraft|grip|dead hang/, 'Unterarme, Griffkraft, Forearms'],
  [/kniebeuge|squat|beinpresse|leg press|ausfallschritt|lunge|step ?up|beinstrecker|leg extension|hackenschmidt/, 'Beine, vordere Oberschenkel, Quads, Quadrizeps'],
  [/beinbeuger|leg curl|rumanisch|romanian|nordic|stiff/, 'hintere Oberschenkel, Hamstrings, Beinbeuger'],
  [/kettlebell swing|swing|clean|snatch|reissen|umsetzen|thruster|sandsack|sled|schlitten|box jump|sprung|jump/, 'Ganzkörper, Explosivkraft, Power, Athletik'],
  [/knieheben|knee raise|toes to bar|zehen-zur-stange|zehen zur stange|dead bug|bird dog|mountain climber|l-sit|vacuum/, 'Bauch, Core, Rumpf, unterer Bauch'],
  [/windmill|turkish get|get-up|getup|tragen|carry|koffer|suitcase|medizinball|battle rope|burpee/, 'Ganzkörper, Core, Rumpfstabilität, Funktionell'],
  [/aussenrotation|innenrotation|external rotation|internal rotation|schulterkreisen|rotatoren|wall slide|y-heben|y raise|band pull ?apart|pull ?apart/, 'Rotatorenmanschette, Schultergesundheit, hintere Schulter, Haltung'],
  [/clamshell|muschel|monster walk|lateral walk|fire hydrant/, 'Po, Gesäß, seitlicher Po, Hüfte außen, Glutes'],
  [/huftbeuger|hip flexor|psoas/, 'Hüftbeuger, Hüfte vorne'],
  [/floor press|bodendrucken/, 'Brust, Trizeps, Chest'],
  [/brustdrucken|svend press/, 'Brust, Chest, Brustmuskel'],
  [/tibialis/, 'Schienbein, Unterschenkel vorne, Tibialis'],
  [/landmine|jerk|push press/, 'vordere Schulter, Schultern, Front Delt, Power'],
  [/muscle-up|muscle up|seilklettern|rope climb/, 'Rücken, breiter Rücken, Klettern, Calisthenics'],
  [/calisthenics|lever|planche|human flag|dragon flag|bear crawl|windshield/, 'Core, Rumpf, Calisthenics, Körpergewicht, Bauch'],
  [/wandsitzen|wall sit|isometrie/, 'Beine, vordere Oberschenkel, Isometrie, Halten'],
  [/superman/, 'unterer Rücken, Rückenstrecker'],
  [/pull-through|pull through|reifen kippen|tire flip/, 'Po, Gesäß, hintere Oberschenkel, Hüftstreckung'],
];

/** Synonyme je Muskelgruppe (MuscleId) */
const MUSCLE_SYNONYMS: Record<string, string> = {
  brust: 'Brust, Chest, Brustmuskel',
  schultern: 'Schultern, Schulter, Delta, Deltoid, Shoulders',
  bizeps: 'Bizeps, Biceps, Oberarm vorne, Arme',
  trizeps: 'Trizeps, Triceps, Oberarm hinten, Arme',
  bauch: 'Bauch, Bauchmuskeln, Abs, Core, Sixpack',
  oberer_ruecken: 'oberer Rücken, Nacken, Trapez, Rücken',
  lat: 'Latissimus, Lat, breiter Rücken, Rücken',
  unterer_ruecken: 'unterer Rücken, Rückenstrecker, Lendenwirbel, Rücken',
  gesaess: 'Po, Gesäß, Glutes, Hintern',
  quadrizeps: 'vordere Oberschenkel, Quadrizeps, Quads, Beine',
  beinbeuger: 'hintere Oberschenkel, Beinbeuger, Hamstrings, Beine',
  waden: 'Waden, Calves, Unterschenkel, Beine',
};

const cache = new Map<string, string>();

/** Begriffe, die eine Übung auffindbar machen (normalisiert, ein langer Text) */
export function searchTextOf(name: string, muscles: readonly string[] = []): string {
  const key = `${name}|${muscles.join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = normalizeSearch(`${name} ${keywordsOf(name)}`);
  const extra = RULES.filter(([re, , not]) => re.test(base) && !(not && not.test(base))).map(([, terms]) => terms);
  const text = normalizeSearch([name, keywordsOf(name), ...extra, ...muscles.map((m) => MUSCLE_SYNONYMS[m] ?? m)].join(' '));
  cache.set(key, text);
  return text;
}

/** Passt die Suche zu einer Übung?
 *  Ein Wort: kommt irgendwo in Name, Stichwörtern, Körperregion oder Muskel vor.
 *  Mehrere Wörter: entweder als zusammenhängender Begriff („hintere schulter“) irgendwo, oder jedes Wort in Name/Katalog-Stichwörtern. */
export function matchesSearch(query: string, name: string, muscles: readonly string[] = []): boolean {
  const q = normalizeSearch(query).replace(/\s+/g, ' ').trim();
  if (!q) return true;
  const hay = searchTextOf(name, muscles);
  const words = q.split(' ');
  if (words.length === 1) return hay.includes(q);
  if (hay.includes(q)) return true;
  const own = normalizeSearch(`${name} ${keywordsOf(name)}`);
  return words.every((w) => own.includes(w));
}

/** Gibt es für den Namen mindestens einen Regionsbegriff aus den Regeln? (für Tests) */
export const hasRegionTerm = (name: string) => {
  const base = normalizeSearch(`${name} ${keywordsOf(name)}`);
  return RULES.some(([re, , not]) => re.test(base) && !(not && not.test(base)));
};
