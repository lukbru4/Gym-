// Suchbegriffe für Übungen: Name + Katalog-Stichwörter + Körperregion (z. B. „hintere Schulter“) + Muskel-Synonyme.
// So findet „hintere schulter“, „po“ oder „breiter rücken“ die passenden Übungen – egal ob Umlaute oder Englisch.
import { nameHasEquipment, type EquipmentId } from './equipment';
import { CATALOG, keywordsOf } from './exerciseCatalog';

export const normalizeSearch = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

/** [Muster auf Name + Stichwörter, zusätzliche Begriffe, Ausnahme?] – Muster ohne Umlaute (normalisiert) */
const RULES: [RegExp, string, RegExp?][] = [
  [/rear|face ?pull|reverse (fly|butterfly|pec)|(vorgebeugt\w*|bent over) (seitheben|lateral|raise|fly)|(seitheben|raise)[^,]*vorgebeugt|hintere schulter/, 'hintere Schulter, Rear Delt, hinterer Delta'],
  [/seitheben|lateral raise|side raise/, 'seitliche Schulter, Side Delt, seitlicher Delta, breite Schultern', /vorgebeugt|rear|reverse|bent over/],
  [/schulterdrucken|frontheben|front raise|overhead press|military|arnold|shoulder press/, 'vordere Schulter, Front Delt, vorderer Delta'],
  [/((schrag|incline|low incline)[^,]*(drucken|press|fly|flye|fliegende|butterfly|crossover))|((drucken|press|fly|fliegende|butterfly|crossover)[^,]*(schrag|incline))|obere brust|von unten|low to high|guillotine/, 'obere Brust, Upper Chest', /negativ|decline|beinpresse|leg press|bizeps|curl|trizeps|french|enges|close grip|schulter|seitheben|frontheben|rudern|row|reverse|pullover|sit-?up|bauch/],
  [/\bdips|((decline|negativ)[^,]*(drucken|press|fly|fliegende|push))|((drucken|press|fly|fliegende|brustpresse)[^,]*(decline|negativ))|untere brust|von oben|high to low/, 'untere Brust, Lower Chest', /fusse erhoht|bank ?dips|bench dips|trizeps dips|dips \(bank|bizeps|curl|trizeps|french|enges|close grip|sit-?up|bauch|klimmz|pull ?up|rudern|row/],
  [/bankdrucken|bench press|butterfly|\bfly|flys|fliegende|crossover|brustpresse|liegestutz|push ?up|pec deck/, 'Brust, Chest, Brustmuskel', /reverse|rear|vorgebeugt|enges bankdrucken|close grip|trizeps-fokus/],
  [/hip thrust|glute|gesass|bridge|abduktor|abduction|po-|\bpo\b/, 'Po, Gesäß, Glutes, Hintern', /trizeps|triceps/],
  [/adduktor|adduction|innenschenkel/, 'Innenschenkel, Adduktoren, Oberschenkel innen'],
  [/abduktor|abduction|aussenschenkel/, 'Außenschenkel, Abduktoren, Hüfte außen'],
  [/shrug|nacken|trapez|schulterheben/, 'Nacken, Trapez, Trapezius', /trizeps|triceps|latziehen|drucken|press|dehn/],
  [/rudern|\brow\b|\brows\b/, 'oberer Rücken, Rückendicke, Rücken Mitte', /aufrechtes|upright|hintere-schulter|rear delt|rudergerat|rowing machine/],
  [/latziehen|klimmzug|pull ?up|chin ?up|pulldown|pullover|\blat\b|latissimus/, 'breiter Rücken, Rückenbreite, Latissimus, Lat', /beinheben|knieheben|toes|zehen|bauch|leg raise|knee raise|skapula|scapula/],
  [/kreuzheben|deadlift|hyperextension|ruckenstrecker|back extension|good morning/, 'unterer Rücken, Rückenstrecker, Lendenwirbel'],
  [/hammer ?curl|hammercurl|reverse curl|zottman|brachialis|pinwheel/, 'Unterarme, Brachialis, Oberarm außen', /strength|drucken|press/],
  [/curl/, 'Bizeps, Oberarm vorne', /leg curl|beinbeuger|nordic|wrist curl|handgelenk/],
  [/uberkopf|overhead[^,]*(trizeps|triceps|extension)|french|skull|stirndrucken|katana/, 'langer Trizepskopf, Trizeps lang', /tragen|carry|walk|schulterdrucken|shoulder press|squat|kniebeuge/],
  [/trizeps|triceps|pushdown|kickback|\bdips|enges bankdrucken|close grip/, 'Trizeps, Oberarm hinten', /glute|gesass|bein|po-|\bpo\b|hip/],
  [/crunch|plank|beinheben|leg raise|sit ?up|bauch|ab wheel|rollout|hollow/, 'Bauch, Sixpack, Core, Rumpf, Bauchmuskeln'],
  [/russian twist|twist|holzhacker|woodchop|oblique|side plank|seitstutz|seitbeug|pallof/, 'seitliche Bauchmuskeln, Obliques, schräge Bauchmuskeln'],
  [/wade|calf/, 'Waden, Unterschenkel, Calves'],
  [/unterarm|wrist|handgelenk|farmer|griffkraft|grip strength|pinch|dead hang|hangen \(klimmzug/, 'Unterarme, Griffkraft, Forearms', /stutz|plank|unterarmstutz/],
  [/kniebeuge|squat|beinpresse|leg press|ausfallschritt|lunge|step ?up|beinstrecker|leg extension|hackenschmidt/, 'Beine, vordere Oberschenkel, Quads, Quadrizeps'],
  [/beinbeuger|leg curl|rumanisch|romanian|nordic|stiff|glute ham|b-stance/, 'hintere Oberschenkel, Hamstrings, Beinbeuger', /reverse nordic/],
  [/kettlebell swing|swing|clean|snatch|reissen|umsetzen|thruster|sandsack|sled|schlitten|box jump|sprung|jump/, 'Ganzkörper, Explosivkraft, Power, Athletik'],
  [/knieheben|knee raise|toes to bar|zehen-zur-stange|zehen zur stange|beinheben|leg raise|reverse crunch|flutter|l-sit|v-up|jackknife|toe touch/, 'Bauch, Core, Rumpf, unterer Bauch', /bird dog|dead bug|superman|plank|seitstutz|seitliches beinheben|seitlich \(|abduk|po\b|gesass/],
  [/dead bug|bird dog|mountain climber|vacuum|stir the pot|body saw/, 'Bauch, Core, Rumpf, Rumpfstabilität'],
  [/windmill|turkish get|get-up|getup|tragen|carry|koffer|suitcase|medizinball|battle rope|burpee/, 'Ganzkörper, Core, Rumpfstabilität, Funktionell'],
  [/aussenrotation|external rotation|band pull ?apart|pull ?apart|y-t-w|ytw|\bt raise/, 'Rotatorenmanschette, Schultergesundheit, hintere Schulter, Haltung'],
  [/innenrotation|internal rotation|schulterkreisen|rotatoren|wall slide|y-heben|y raise|dislocat|durchzug/, 'Rotatorenmanschette, Schultergesundheit, Schultermobilität, Haltung, unterer Trapez'],
  [/clamshell|muschel|monster walk|lateral walk|fire hydrant/, 'Po, Gesäß, seitlicher Po, Hüfte außen, Glutes'],
  [/huftbeuger|hip flexor|psoas/, 'Hüftbeuger, Hüfte vorne'],
  [/floor press|bodendrucken/, 'Brust, Trizeps, Chest'],
  [/brustdrucken|svend press/, 'Brust, Chest, Brustmuskel'],
  [/tibialis/, 'Schienbein, Unterschenkel vorne, Tibialis'],
  [/landmine|jerk|push press/, 'vordere Schulter, Schultern, Front Delt, Power', /kreuzheben|deadlift|rudern|row|squat|kniebeuge|ausfallschritt|rotation/],
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

// ---- Suchwörter für Geräte und Muskelgruppen („Maschine Brust“, „Kabel Rücken“, „Brustmaschine“) ----
type Equip = Exclude<EquipmentId, 'cardio' | 'eigene'>;
const CARDIO = new Set(CATALOG.filter((c) => c.type === 'cardio').map((c) => c.name.toLowerCase()));
const EQUIP_WORDS: Record<string, Equip[]> = {
  maschine: ['maschine'], maschinen: ['maschine'], gerat: ['maschine'], gerate: ['maschine'], plattengerat: ['maschine'],
  kabel: ['kabel'], kabelzug: ['kabel'], seilzug: ['kabel'], zugturm: ['kabel'], kabelturm: ['kabel'], cable: ['kabel'],
  kurzhantel: ['kurzhantel'], kurzhanteln: ['kurzhantel'], hantel: ['kurzhantel'], hanteln: ['kurzhantel'], kh: ['kurzhantel'], dumbbell: ['kurzhantel'],
  langhantel: ['langhantel'], stange: ['langhantel'], lh: ['langhantel'], barbell: ['langhantel'],
  smith: ['smith'], multipresse: ['smith'],
  band: ['band'], bander: ['band'], gummiband: ['band'], widerstandsband: ['band'], theraband: ['band'],
  kettlebell: ['kettlebell'], kugelhantel: ['kettlebell'],
  korpergewicht: ['koerpergewicht'], eigengewicht: ['koerpergewicht'], bodyweight: ['koerpergewicht'], calisthenics: ['koerpergewicht'],
  zuhause: ['koerpergewicht', 'band'], daheim: ['koerpergewicht', 'band'],
};
const ALL_LEGS = ['quadrizeps', 'beinbeuger', 'waden', 'gesaess'];
const MUSCLE_WORDS: Record<string, string[]> = {
  brust: ['brust'], chest: ['brust'], brustmuskel: ['brust'],
  rucken: ['lat', 'oberer_ruecken', 'unterer_ruecken'], back: ['lat', 'oberer_ruecken', 'unterer_ruecken'],
  lat: ['lat'], latissimus: ['lat'], nacken: [], trapez: [],
  schulter: ['schultern'], schultern: ['schultern'], delta: ['schultern'], delts: ['schultern'], shoulder: ['schultern'], shoulders: ['schultern'],
  bizeps: ['bizeps'], biceps: ['bizeps'], trizeps: ['trizeps'], triceps: ['trizeps'], arme: ['bizeps', 'trizeps'], arm: ['bizeps', 'trizeps'], unterarm: [], unterarme: [],
  bauch: ['bauch'], abs: ['bauch'], core: ['bauch'], sixpack: ['bauch'], rumpf: ['bauch'],
  po: ['gesaess'], gesass: ['gesaess'], glutes: ['gesaess'], hintern: ['gesaess'], hufte: ['gesaess'],
  beine: ALL_LEGS, bein: ALL_LEGS, legs: ALL_LEGS, oberschenkel: ['quadrizeps', 'beinbeuger'],
  quads: ['quadrizeps'], quadrizeps: ['quadrizeps'], beinbeuger: ['beinbeuger'], hamstrings: ['beinbeuger'],
  waden: ['waden'], wade: ['waden'], calves: ['waden'],
};
const FILLER = new Set(['und', 'mit', 'an', 'am', 'auf', 'der', 'die', 'das', 'fur', 'ubung', 'ubungen', 'training', 'trainieren', 'oder']);
const MUSCLE_KEYS = Object.keys(MUSCLE_WORDS).filter((k) => k.length >= 4).sort((a, b) => b.length - a.length);
const EQUIP_KEYS = Object.keys(EQUIP_WORDS).filter((k) => k.length >= 4).sort((a, b) => b.length - a.length);
const TAIL = new Set(['ubung', 'ubungen', 'training', 'muskel', 'muskeln']);

/** „Brustmaschine“ → brust + maschine, „Kabelrucken“ → kabel + rucken, „Ruckenubungen“ → rucken */
function splitCompound(w: string): string[] {
  if (MUSCLE_WORDS[w] || EQUIP_WORDS[w]) return [w];
  for (const m of MUSCLE_KEYS) if (w.startsWith(m)) {
    const rest = w.slice(m.length);
    if (EQUIP_WORDS[rest]) return [m, rest];
    if (TAIL.has(rest)) return [m];
  }
  for (const e of EQUIP_KEYS) if (w.startsWith(e)) {
    const rest = w.slice(e.length);
    if (MUSCLE_WORDS[rest]) return [e, rest];
  }
  return [w];
}

const regionCache = new Map<string, string>();
/** Nur die Körperregion-Begriffe aus den Regeln (ohne Muskel-Synonyme) – zuverlässiger als zufällige Wortteile */
function regionTextOf(name: string): string {
  const hit = regionCache.get(name);
  if (hit !== undefined) return hit;
  const base = normalizeSearch(`${name} ${keywordsOf(name)}`);
  const text = normalizeSearch(RULES.filter(([re, , not]) => re.test(base) && !(not && not.test(base))).map(([, t]) => t).join(', '));
  regionCache.set(name, text);
  return text;
}
/** Wort am Wortanfang (kurze Wörter wie „po“ nur als ganzes Wort, sonst würde „Power“ passen) */
const hasWord = (text: string, w: string) => new RegExp(`(^|[^a-z])${w}${w.length <= 3 ? '($|[^a-z])' : ''}`).test(text);

/** Passt ein einzelnes Suchwort? Gerät → am Namen erkannt, Muskel → Hauptmuskel oder Körperregion, sonst Name/Stichwörter. */
function wordMatches(w: string, name: string, muscles: readonly string[], own: string): boolean {
  const eq = EQUIP_WORDS[w];
  if (eq) return !CARDIO.has(name.toLowerCase()) && eq.some((id) => nameHasEquipment(name, id));
  const mg = MUSCLE_WORDS[w];
  if (mg) return (muscles.length > 0 && mg.includes(muscles[0])) || hasWord(regionTextOf(name), w);
  return own.includes(w);
}

/** Passt die Suche zu einer Übung?
 *  Ein Wort: kommt irgendwo in Name, Stichwörtern, Körperregion oder Muskel vor (zusammengesetzte Wörter wie „Brustmaschine“ werden zerlegt).
 *  Mehrere Wörter: als zusammenhängender Begriff („hintere schulter“) irgendwo, oder jedes Wort für sich –
 *  Gerätewörter (Maschine, Kabel, Kurzhantel …) über das Gerät, Muskelwörter (Brust, Rücken, Beine …) über den Hauptmuskel. */
export function matchesSearch(query: string, name: string, muscles: readonly string[] = []): boolean {
  const q = normalizeSearch(query).replace(/\s+/g, ' ').trim();
  if (!q) return true;
  const hay = searchTextOf(name, muscles);
  if (hay.includes(q)) return true;
  const words = q.replace(/ohne (gerate?|equipment|hanteln)/g, 'korpergewicht').split(' ').filter((w) => !FILLER.has(w)).flatMap(splitCompound);
  if (!words.length) return true;
  if (words.length === 1 && words[0] === q) return false;
  const own = normalizeSearch(`${name} ${keywordsOf(name)}`);
  // Zwei Wörter, die zusammen ein Begriff sind („hintere schulter kabel“), zählen gemeinsam
  for (let i = 0; i < words.length; i++) {
    if (i + 1 < words.length && hay.includes(`${words[i]} ${words[i + 1]}`)) {
      i++;
      continue;
    }
    if (!wordMatches(words[i], name, muscles, own)) return false;
  }
  return true;
}

/** Gibt es für den Namen mindestens einen Regionsbegriff aus den Regeln? (für Tests) */
export const hasRegionTerm = (name: string) => {
  const base = normalizeSearch(`${name} ${keywordsOf(name)}`);
  return RULES.some(([re, , not]) => re.test(base) && !(not && not.test(base)));
};
