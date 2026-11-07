// Ordnet jede Übung einem Bewegungsmuster zu (nach Namen, zuletzt nach Muskel) und liefert Hinweise zur Ausführung.
import { PATTERNS, type Pattern } from './animations';
import { norm } from './describe';
import type { MuscleId } from './types';

// Reihenfolge ist wichtig: das erste passende Wort gewinnt.
const RULES: [RegExp, string][] = [
  // Cardio
  [/laufband|laufen|joggen|jogging|treadmill|sprint|berglauf|treppenlauf/, 'run'],
  [/crosstrainer|vario|ellipt/, 'cross'],
  [/gehen|spazier|walk|wandern|treppen|stepper|farmers/, 'walk'],
  [/fahrrad|ergometer|spinning|radfahren|air bike|assault|mountainbike|rennrad/, 'bike'],
  [/ruderger|ski-ergo|skierg/, 'erg'],
  [/seilspringen|springseil/, 'rope'],
  [/burpee|sprung|jump|box jump/, 'jump'],
  [/thruster/, 'squat'],
  [/^clean|power clean/, 'generic'],
  [/kettlebell swing|kettlebell clean|kettlebell snatch|windmill|kettlebell windmill/, 'swing'],
  [/rudern \((boot|kajak)|kajak|kanu|paddel/, 'erg'],
  [/landmine.*(rudern|row)/, 'row'],
  [/landmine.*(rotation|rumpfdreh)/, 'twist'],
  [/landmine.*ausfallschritt/, 'lunge'],
  [/(squat|kniebeuge).*landmine|landmine.*(squat|kniebeuge)/, 'squat'],
  [/landmine.*kreuzheben/, 'hinge-db'],
  [/landmine/, 'ohp'],
  [/tragen|carry/, 'walk'],
  [/calisthenics|lever|planche|human flag|dragon flag|l-sit|v-sit|dead bug|hollow|bird dog/, 'plank'],
  [/muscle-up|muscle up/, 'pullup'],
  [/hueftbeuger/, 'legraise'],
  [/bauchrad|rollout/, 'plank'],
  [/aussenrotation|schulterkreisen|y-heben|wall slides/, 'front'],
  [/reverse butterfly|reverse fly|reverse kabel|face pull|hintere schulter|hintere-schulter|pull-apart|y-t-w|seitheben \(kurzhantel, vorgebeugt/, 'reversefly'],
  [/seitheben|lu raises/, 'lateral'],
  [/medizinball-wurf|slam|wall ball|wandwurf/, 'generic'],
  // Maschinen (vor den allgemeinen Regeln)
  [/smith.*(kniebeuge|squat)|(kniebeuge|squat).*smith/, 'squat-smith'],
  [/smith.*schraeg|schraeg.*smith/, 'incline-smith'],
  [/smith.*(bankdruecken|negativ)|(bankdruecken|negativbank).*smith/, 'bench-smith'],
  [/schulterdruecken \(smith/, 'ohp-smith'],
  [/^wadenheben$|wadenheben \((sitzend|beinpresse|hackenschmidt|plattengeraet|einbeinig, maschine|stehend, langsam|stehend, pause)/, 'calf-machine'],
  [/hackenschmidt|pendulum|v-squat|belt squat/, 'hack'],
  [/beinbeuger \(sitzend/, 'legcurl-seated'],
  [/hip thrust \((maschine|plattengeraet)/, 'hipthrust-machine'],
  [/^abduktoren \(maschine|seitliches beinheben \(maschine/, 'abductor'],
  [/^adduktoren \(maschine/, 'adductor'],
  [/bauchmaschine|crunches \(maschine/, 'abmachine'],
  [/scott-curls \(maschine|bizepscurls \((maschine|plattengeraet)/, 'curl-machine'],
  [/dip-maschine|trizepsdips \(maschine|trizepsmaschine|dips \(maschine/, 'dipmachine'],
  [/klimmzug-maschine|klimmzuege \(unterstuetzt/, 'assist-pullup'],
  [/schulterdruecken \((maschine|plattengeraet)|viking press/, 'ohp-machine'],
  [/rudern \((maschine|plattengeraet)|hintere-schulter-rudern \(maschine|t-stange, brustpolster/, 'rowmachine'],
  [/cable crossover|fliegende \(kabel/, 'cablefly'],
  [/bankdruecken \((maschine|plattengeraet)|schraegbankdruecken \(plattengeraet|brustpresse/, 'chestpress'],
  // Beine
  [/bulgar|step-up|ausfallschritt|lunge/, 'lunge'],
  [/wadenheben/, 'calf'],
  [/beinpresse/, 'legpress'],
  [/beinstrecker/, 'legext'],
  [/reverse nordic/, 'legext'],
  [/beinbeuger|nordic/, 'legcurl'],
  [/hip thrust|glute bridge|kickback.*ges|gesaess|abduktor|adduktor|seitliches beinheben|brücke|bruecke/, 'glute'],
  [/goblet/, 'goblet'],
  [/koerpergewicht.*kniebeuge|kniebeuge.*koerpergewicht|sissy|wandsitzen/, 'squat-bw'],
  [/kniebeuge|hackenschmidt|squat|schlitten/, 'squat'],
  [/rumaenisches kreuzheben \(kurz/, 'hinge-db'],
  [/jefferson/, 'hinge'],
  [/kreuzheben|good morning|rack pull/, 'hinge'],
  // Brust
  [/liegestuetz|diamant/, 'pushup'],
  [/dip-maschine|bank-dips|dips/, 'dip'],
  [/brustpresse/, 'chestpress'],
  [/^butterfly$|^butterfly \(maschine|pec deck/, 'pecdeck'],
  [/fliegende|butterfly|crossover|pullover/, 'fly'],
  [/((druecken|presse).*schraeg|schraeg.*(druecken|presse)).*kurzhantel|kurzhantel.*(druecken|presse).*schraeg|kurzhantel-schraeg/, 'incline-db'],
  [/(druecken|presse).*schraeg|schraeg.*(druecken|presse)/, 'incline'],
  [/kurzhantel-bank|bankdruecken \(kurzhantel/, 'bench-db'],
  [/brustdruecken/, 'chestpress'],
  [/bankdruecken/, 'bench'],
  // Schultern
  [/seitheben/, 'lateral'],
  [/frontheben|aufrechtes rudern/, 'front'],
  [/schulterheben|shrug/, 'shrug'],
  [/schulterdruecken \(kurzhantel|schulterdruecken \(maschine|schulterdruecken \(smith|schulterdruecken.*sitzend|kabel-schulterdruecken|arnold/, 'ohp-seated'],
  [/schulterdruecken|push press|landmine|handstand/, 'ohp'],
  // Rücken
  [/klimmzug-maschine|latziehen|geradarm|seilzug-pullover/, 'pulldown'],
  [/klimmz/, 'pullup'],
  [/hyperextension|rueckenstreck|superman/, 'backext'],
  [/kurzhantelrudern|rudern \(kurzhantel/, 'dbrow'],
  [/kabelrudern|rudern am kabel|rudern \(maschine|rudern \(smith|rudern \(t-stange/, 'seatedrow'],
  [/rudern|row/, 'row'],
  // Arme
  [/scott/, 'preacher'],
  [/curl.*kabel|kabel.*curl|curl.*seil/, 'curl-cable'],
  [/langhantel-curls|reverse curls/, 'curl-bar'],
  [/curl/, 'curl'],
  [/ueberkopf/, 'overhead'],
  [/french|skull/, 'skull'],
  [/trizeps.*seil/, 'triceps-rope'],
  [/trizeps|pushdown/, 'triceps'],
  // Rumpf
  [/beinheben \(liegend/, 'crunch'],
  [/beinheben \(haengend|knieheben|toes to bar/, 'legraise'],
  [/beinheben|windshield/, 'legraise'],
  [/sit-up/, 'situp'],
  [/crunch|bauchmaschine|bicycle/, 'crunch'],
  [/russian|rumpfdreh/, 'twist'],
  [/holzhacker|pallof|woodchop/, 'chop'],
  [/plank|stuetz|ab wheel|hollow|dead bug|mountain/, 'plank'],
  [/battle rope|schwimmen|boxen|hiit|turkish/, 'generic'],
];

const BY_MUSCLE: Record<string, string> = {
  brust: 'bench', schultern: 'ohp', bizeps: 'curl', trizeps: 'triceps', bauch: 'crunch', oberer_ruecken: 'row', lat: 'pulldown',
  unterer_ruecken: 'hinge', gesaess: 'glute', quadrizeps: 'squat', beinbeuger: 'legcurl', waden: 'calf',
};

/** Muster-ID für eine Übung; „generic“, wenn nichts passt */
export function animIdFor(name: string, muscles: MuscleId[] = []): string {
  const n = norm(name);
  for (const [re, id] of RULES) if (re.test(n) && PATTERNS[id]) return id;
  const m = muscles[0];
  return (m && BY_MUSCLE[m]) || 'generic';
}

export const patternFor = (name: string, muscles: MuscleId[] = []): Pattern => PATTERNS[animIdFor(name, muscles)] ?? PATTERNS.generic;
