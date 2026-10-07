// Eingebaute Lebensmitteltabelle (ungefähre Durchschnittswerte pro 100 g bzw. 100 ml, übliche Nährwerttabellen).
// Wird von den Rezepten und vom „Beschreiben“ beim Essen-Eintragen benutzt.
import type { Nutrients } from './food';

export interface Food extends Nutrients {
  key: string;
  name: string;
  /** weitere Schreibweisen (klein, ohne Umlaute: ae/oe/ue/ss) */
  aliases: string[];
  /** Gramm pro Stück (1 Ei, 1 Banane, 1 Scheibe …) */
  piece?: number;
  /** Gramm pro Milliliter (Standard 1) */
  density?: number;
  /** Gramm pro Esslöffel, wenn es nicht 15 × Dichte ist */
  el?: number;
}

// [key, Name, Aliase (|), kcal, Eiweiß, Kohlenhydrate, Fett, Stück-Gramm?, Dichte?, Esslöffel-Gramm?]
type Row = [string, string, string, number, number, number, number, number?, number?, number?];
const ROWS: Row[] = [
  // Milch & Milchprodukte
  ['milch', 'Milch (1,5 %)', 'milch|fettarme milch|milch 1,5', 47, 3.4, 4.9, 1.5, undefined, 1.03],
  ['vollmilch', 'Vollmilch', 'vollmilch|milch 3,5', 64, 3.3, 4.8, 3.6, undefined, 1.03],
  ['hafermilch', 'Haferdrink', 'hafermilch|haferdrink|haferdrink|pflanzenmilch', 45, 1, 6.5, 1.5, undefined, 1.03],
  ['sojamilch', 'Sojadrink', 'sojamilch|sojadrink', 40, 3.3, 2.5, 1.8, undefined, 1.03],
  ['joghurt', 'Joghurt (3,5 %)', 'joghurt|jogurt|jughurt|naturjoghurt|vollmilchjoghurt', 66, 3.5, 4.7, 3.8, undefined, 1.03, 18],
  ['joghurt-fettarm', 'Joghurt (1,5 %)', 'fettarmer joghurt|joghurt 1,5|joghurt fettarm|magerjoghurt', 46, 3.5, 4.5, 1.5, undefined, 1.03, 18],
  ['griechischer-joghurt', 'Griechischer Joghurt', 'griechischer joghurt|joghurt griechisch|griechisches joghurt', 130, 5.5, 4, 10, undefined, 1.03, 18],
  ['magerquark', 'Magerquark', 'magerquark|quark|quark mager', 67, 12, 4, 0.3, undefined, 1.05, 20],
  ['speisequark', 'Speisequark (20 %)', 'speisequark|quark 20|sahnequark', 125, 11, 3.5, 7.5, undefined, 1.05, 20],
  ['skyr', 'Skyr', 'skyr', 63, 11, 4, 0.2, undefined, 1.05, 20],
  ['kefir', 'Kefir', 'kefir', 40, 3.3, 4, 1, undefined, 1.03],
  ['frischkaese', 'Frischkäse', 'frischkaese|frischkase', 250, 6, 3, 24, undefined, 1, 20],
  ['koerniger-frischkaese', 'Körniger Frischkäse', 'koerniger frischkaese|cottage cheese|hüttenkäse|huettenkaese', 98, 12, 3, 4.3, undefined, 1, 20],
  ['mozzarella', 'Mozzarella', 'mozzarella', 250, 18, 1, 19, 125],
  ['feta', 'Feta', 'feta|schafskaese|hirtenkaese', 264, 17, 1, 21],
  ['gouda', 'Gouda', 'gouda|kaese|schnittkaese|emmentaler|cheddar', 356, 25, 1, 28, 25],
  ['parmesan', 'Parmesan', 'parmesan|hartkaese', 392, 36, 0, 28, undefined, undefined, 6],
  ['sahne', 'Sahne', 'sahne|schlagsahne|kochsahne', 292, 2.4, 3.3, 30, undefined, 1],
  ['butter', 'Butter', 'butter', 741, 0.7, 0.6, 83, undefined, 0.95, 14],
  // Eier
  ['eier', 'Ei', 'ei|eier|huehnerei|vollei|spiegelei|rührei|ruehrei|gekochtes ei', 143, 12.6, 0.7, 9.9, 50],
  ['eiweiss', 'Eiklar', 'eiweiss|eiklar|eiweisse', 48, 11, 0.7, 0.2, 33],
  // Fleisch & Fisch
  ['haehnchenbrust', 'Hähnchenbrust', 'haehnchenbrust|haehnchen|huehnchen|hühnchen|huhn|haehnchenfilet|chicken|haehnchenbrustfilet', 106, 23, 0, 1.5],
  ['haehnchenkeule', 'Hähnchenkeule', 'haehnchenkeule|haehnchenschenkel|hendl', 172, 19, 0, 11],
  ['putenbrust', 'Putenbrust', 'putenbrust|pute|puten|truthahn|putenfilet|putenaufschnitt', 105, 24, 0, 1],
  ['rinderhack', 'Rinderhack', 'rinderhack|rinderhackfleisch|hack|hackfleisch|rindfleisch gehackt', 220, 19, 0, 16],
  ['rindersteak', 'Rindersteak', 'rindersteak|steak|rindfleisch|rinderfilet|rinderhuefte', 130, 22, 0, 4.5],
  ['schweinefilet', 'Schweinefilet', 'schweinefilet|schnitzel|schweinefleisch|schweineschnitzel|kotelett', 110, 22, 0, 2.5],
  ['schinken', 'Kochschinken', 'schinken|kochschinken|schinkenwuerfel', 107, 19, 1, 3, 20],
  ['salami', 'Salami', 'salami|wurst aufschnitt|aufschnitt', 400, 20, 1, 35, 8],
  ['bratwurst', 'Bratwurst', 'bratwurst|wurst|wuerstchen|currywurst|bockwurst|wiener', 300, 13, 1, 27, 120],
  ['bacon', 'Bacon', 'bacon|speck|frühstücksspeck|fruehstuecksspeck', 334, 15, 1, 30, 10],
  ['lachs', 'Lachs', 'lachs|lachsfilet|räucherlachs|raeucherlachs', 208, 20, 0, 13],
  ['thunfisch', 'Thunfisch (im eigenen Saft)', 'thunfisch|thunfisch dose', 116, 26, 0, 1, 120],
  ['kabeljau', 'Kabeljau', 'kabeljau|dorsch|seelachs|fischfilet|weissfisch|pangasius', 82, 18, 0, 0.7],
  ['forelle', 'Forelle', 'forelle|lachsforelle', 116, 19, 0, 4.5],
  ['garnelen', 'Garnelen', 'garnelen|shrimps|krabben|scampi', 83, 18, 0.5, 1],
  ['fischstaebchen', 'Fischstäbchen', 'fischstaebchen|fischstaebchen', 192, 13, 17, 8, 28],
  // Gemüse
  ['tomate', 'Tomate', 'tomate|tomaten|kirschtomaten|cherrytomaten', 18, 0.9, 2.6, 0.2, 100],
  ['gurke', 'Gurke', 'gurke|salatgurke|gurken', 15, 0.7, 2.4, 0.1, 300],
  ['paprika', 'Paprika', 'paprika|paprikaschote', 31, 1, 6, 0.3, 150],
  ['brokkoli', 'Brokkoli', 'brokkoli|broccoli', 34, 2.8, 2.7, 0.4],
  ['blumenkohl', 'Blumenkohl', 'blumenkohl', 25, 2.5, 2.3, 0.3],
  ['zucchini', 'Zucchini', 'zucchini', 17, 1.2, 2, 0.3, 250],
  ['aubergine', 'Aubergine', 'aubergine', 24, 1, 2.5, 0.2, 250],
  ['spinat', 'Spinat', 'spinat|blattspinat', 23, 2.9, 0.8, 0.4],
  ['salat', 'Blattsalat', 'salat|blattsalat|eisbergsalat|kopfsalat|feldsalat|mischsalat', 14, 1.3, 1.2, 0.2],
  ['rucola', 'Rucola', 'rucola', 25, 2.6, 2, 0.7],
  ['karotte', 'Karotte', 'karotte|karotten|moehre|moehren|möhre|möhren', 41, 0.9, 10, 0.2, 80],
  ['zwiebel', 'Zwiebel', 'zwiebel|zwiebeln', 40, 1.1, 9, 0.1, 80],
  ['lauch', 'Lauch', 'lauch|porree', 29, 2.1, 3, 0.3],
  ['champignons', 'Champignons', 'champignons|pilze|champignon', 22, 3.1, 0.5, 0.3, 20],
  ['kuerbis', 'Kürbis', 'kuerbis|hokkaido', 26, 1, 4.6, 0.1],
  ['gruene-bohnen', 'Grüne Bohnen', 'gruene bohnen|buschbohnen|brechbohnen', 31, 2, 4, 0.2],
  ['erbsen', 'Erbsen', 'erbsen', 66, 5, 9, 0.5],
  ['mais', 'Mais (Dose)', 'mais|dosenmais|zuckermais', 90, 3.3, 17, 1.2],
  ['rote-bete', 'Rote Bete', 'rote bete|rote beete', 43, 1.6, 8, 0.1],
  ['kartoffel', 'Kartoffel', 'kartoffel|kartoffeln|salzkartoffeln|pellkartoffeln|ofenkartoffeln', 77, 2, 17, 0.1, 120],
  ['suesskartoffel', 'Süßkartoffel', 'suesskartoffel|suesskartoffeln|batate', 86, 1.6, 20, 0.1, 200],
  ['avocado', 'Avocado', 'avocado', 160, 2, 1.8, 14.6, 150],
  ['oliven', 'Oliven', 'oliven|schwarze oliven|gruene oliven', 145, 1, 4, 14, 4],
  ['tomatensauce', 'Passierte Tomaten', 'tomatensauce|tomatensosse|passierte tomaten|tomatenmark|pizzasosse|tomatensoße', 28, 1.4, 4.5, 0.2, undefined, 1.05],
  // Obst
  ['banane', 'Banane', 'banane|bananen', 90, 1.1, 20.3, 0.2, 120],
  ['apfel', 'Apfel', 'apfel|aepfel', 52, 0.3, 12, 0.2, 180],
  ['birne', 'Birne', 'birne|birnen', 53, 0.5, 12, 0.3, 170],
  ['orange', 'Orange', 'orange|orangen|clementine|clementinen', 47, 0.9, 9, 0.2, 180],
  ['mandarine', 'Mandarine', 'mandarine|mandarinen', 46, 0.7, 10, 0.3, 80],
  ['kiwi', 'Kiwi', 'kiwi|kiwis', 51, 1, 10, 0.5, 75],
  ['weintrauben', 'Weintrauben', 'weintrauben|trauben', 70, 0.7, 16, 0.2],
  ['ananas', 'Ananas', 'ananas', 55, 0.5, 12, 0.2],
  ['mango', 'Mango', 'mango', 60, 0.8, 13.5, 0.4, 300],
  ['pfirsich', 'Pfirsich', 'pfirsich|nektarine|pfirsiche', 41, 0.8, 8.5, 0.1, 150],
  ['wassermelone', 'Wassermelone', 'wassermelone|melone', 30, 0.6, 7, 0.2],
  ['erdbeeren', 'Erdbeeren', 'erdbeeren|erdbeere', 32, 0.7, 5.5, 0.3],
  ['heidelbeeren', 'Heidelbeeren', 'heidelbeeren|blaubeeren|heidelbeere', 42, 0.6, 9, 0.4],
  ['himbeeren', 'Himbeeren', 'himbeeren|himbeere', 43, 1.2, 4.9, 0.4],
  ['datteln', 'Datteln', 'datteln|dattel', 280, 2.5, 65, 0.4, 8],
  ['rosinen', 'Rosinen', 'rosinen|trockenfruechte|trockenobst', 290, 3, 66, 0.5],
  // Getreide, Brot, Beilagen
  ['haferflocken', 'Haferflocken', 'haferflocken|hafer|porridge|oats|haferbrei', 372, 13.5, 58.7, 7, undefined, undefined, 7],
  ['muesli', 'Müsli', 'muesli|müsli|knuspermuesli|granola', 360, 9.5, 64, 5.5, undefined, undefined, 10],
  ['cornflakes', 'Cornflakes', 'cornflakes|frühstückscerealien|fruehstuecksflocken|cerealien', 372, 7, 84, 0.9],
  ['reis', 'Reis (ungekocht)', 'reis|basmatireis|jasminreis|vollkornreis|reis roh', 350, 7, 78, 0.6],
  ['reis-gekocht', 'Reis (gekocht)', 'gekochter reis|reis gekocht|gekochten reis', 130, 2.7, 28, 0.3],
  ['spaghetti', 'Nudeln (ungekocht)', 'spaghetti|nudeln|pasta|penne|fusilli|makkaroni|tagliatelle|nudeln roh', 358, 13, 71, 1.5],
  ['nudeln-gekocht', 'Nudeln (gekocht)', 'gekochte nudeln|nudeln gekocht|gekochte spaghetti', 150, 5, 30, 1],
  ['quinoa', 'Quinoa', 'quinoa', 366, 14, 64, 6],
  ['couscous', 'Couscous', 'couscous|bulgur', 354, 12.5, 72, 1.8],
  ['vollkornbrot', 'Vollkornbrot', 'vollkornbrot|vollkorntoast|schwarzbrot|brot|mischbrot|vollkornscheibe', 210, 7, 38, 1.5, 45],
  ['weissbrot', 'Weißbrot', 'weissbrot|toast|toastbrot|baguette|weizenbrot', 265, 8, 50, 3, 30],
  ['broetchen', 'Brötchen', 'broetchen|semmel|schrippe|weizenbroetchen', 265, 9, 52, 1.5, 55],
  ['knaeckebrot', 'Knäckebrot', 'knaeckebrot', 310, 10, 60, 1.5, 10],
  ['wrap', 'Wrap (Tortilla)', 'wrap|tortilla|wraps|fladenbrot', 295, 8, 50, 7, 60],
  ['mehl', 'Mehl', 'mehl|weizenmehl|dinkelmehl', 337, 10, 72, 1, undefined, undefined, 10],
  // Hülsenfrüchte, Nüsse, Samen
  ['linsen', 'Linsen (ungekocht)', 'linsen|rote linsen|linsen roh', 340, 24, 50, 1.5],
  ['kichererbsen', 'Kichererbsen (Dose)', 'kichererbsen|kichererbse', 120, 7, 18, 2],
  ['kidneybohnen', 'Kidneybohnen (Dose)', 'kidneybohnen|bohnen|schwarze bohnen|weisse bohnen|kidneybohne', 95, 7.5, 14, 0.5],
  ['tofu', 'Tofu', 'tofu|raeuchertofu', 120, 13, 1.5, 7],
  ['hummus', 'Hummus', 'hummus', 230, 7, 10, 18, undefined, undefined, 20],
  ['walnuesse', 'Walnüsse', 'walnuesse|walnuss|walnüsse|nuesse|nuss|nussmix|nuss mix', 654, 15, 7, 65, 4],
  ['mandeln', 'Mandeln', 'mandeln|mandel', 574, 21, 10, 50, 1.2],
  ['cashews', 'Cashewkerne', 'cashews|cashewkerne|cashew', 570, 18, 30, 45, 1.5],
  ['haselnuesse', 'Haselnüsse', 'haselnuesse|haselnuss', 654, 14, 10, 58, 1.5],
  ['erdnuesse', 'Erdnüsse', 'erdnuesse|erdnuss', 594, 26, 10, 50, 1],
  ['erdnussbutter', 'Erdnussbutter', 'erdnussbutter|erdnussmus|nussmus|mandelmus', 590, 25, 10, 50, undefined, undefined, 16],
  ['sonnenblumenkerne', 'Sonnenblumenkerne', 'sonnenblumenkerne|kuerbiskerne|kerne|samen', 575, 21, 10, 49],
  // Öle, Süßes, Sonstiges
  ['olivenoel', 'Olivenöl', 'olivenoel|oel|rapsoel|speiseoel|kokosoel|sonnenblumenoel|öl', 884, 0, 0, 100, undefined, 0.92],
  ['honig', 'Honig', 'honig|ahornsirup|agavendicksaft', 304, 0.3, 75, 0, undefined, 1.4],
  ['zucker', 'Zucker', 'zucker|haushaltszucker', 400, 0, 100, 0, undefined, undefined, 12],
  ['marmelade', 'Marmelade', 'marmelade|konfituere|konfitüre|gelee|fruchtaufstrich', 250, 0.3, 60, 0.1, undefined, undefined, 20],
  ['nuss-nougat-creme', 'Nuss-Nougat-Creme', 'nutella|nuss nougat creme|nussnougatcreme|schokocreme', 531, 6, 57, 31, undefined, undefined, 18],
  ['schokolade', 'Schokolade', 'schokolade|vollmilchschokolade|zartbitterschokolade|schoko', 540, 7, 57, 31, 5],
  ['kekse', 'Kekse', 'kekse|keks|plaetzchen|butterkeks', 484, 6, 70, 20, 8],
  ['eis', 'Eis', 'eis|speiseeis|vanilleeis', 200, 3.5, 24, 10, 60],
  ['gummibaerchen', 'Gummibärchen', 'gummibaerchen|gummibaer|haribo|weingummi', 340, 7, 77, 0],
  ['chips', 'Chips', 'chips|kartoffelchips|tortilla chips|salzstangen|snacks', 539, 6, 50, 35],
  ['pommes', 'Pommes', 'pommes|pommes frites|fritten', 302, 4, 40, 14],
  ['pizza', 'Pizza (Margherita)', 'pizza|tiefkuehlpizza|pizzastueck', 245, 11, 30, 9, 350],
  ['proteinpulver', 'Proteinpulver', 'proteinpulver|whey|eiweisspulver|proteinshake|protein pulver|shake pulver', 390, 78, 6, 6, 30, undefined, 10],
  ['proteinriegel', 'Proteinriegel', 'proteinriegel|eiweissriegel|riegel|energieriegel|müsliriegel|mueslirigel', 368, 30, 35, 12, 50],
  ['sojasauce', 'Sojasauce', 'sojasauce|sojasosse|sojasoße', 60, 8, 5, 0, undefined, 1.15],
  ['pesto', 'Pesto', 'pesto', 441, 5, 4, 45, undefined, undefined, 15],
  ['ketchup', 'Ketchup', 'ketchup', 110, 1.2, 25, 0.1, undefined, undefined, 17],
  ['mayonnaise', 'Mayonnaise', 'mayonnaise|mayo|remoulade', 691, 1, 3, 75, undefined, undefined, 14],
  // Getränke (pro 100 ml)
  ['cola', 'Cola', 'cola|limo|limonade|fanta|sprite|eistee|softdrink', 42, 0, 10.6, 0, undefined, 1],
  ['orangensaft', 'Orangensaft', 'orangensaft|saft|apfelsaft|fruchtsaft|multivitaminsaft|apfelschorle', 45, 0.7, 10, 0.2, undefined, 1.04],
  ['smoothie', 'Smoothie', 'smoothie|fruchtsmoothie', 55, 0.7, 12, 0.3, undefined, 1.03],
];

export const FOODS: Food[] = ROWS.map(([key, name, aliases, kcal, protein, carbs, fat, piece, density, el]) => ({
  key, name, aliases: aliases.split('|'), kcal, protein, carbs, fat, piece, density, el,
}));

export const FOOD_BY_KEY = new Map(FOODS.map((f) => [f.key, f]));

/** Nährwerte pro 100 g für die Rezepte (Schlüssel → Werte) */
export const BASE: Record<string, Nutrients> = Object.fromEntries(FOODS.map((f) => [f.key, { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }]));
