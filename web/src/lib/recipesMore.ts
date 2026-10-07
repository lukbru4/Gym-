// Weitere Rezepte (Zutaten: [Schlüssel aus foodDb.ts, Gramm, Anzeigetext]). Ohne Anzeigetext wird „<Gramm> g <Name>“ gezeigt.
import type { RawRecipe } from './recipes';

export const MORE_RECIPES: RawRecipe[] = [
  // ---- Frühstück ----
  {
    id: 'overnight-oats', name: 'Overnight Oats mit Beeren', meal: 'fruehstueck', minutes: 5, tags: ['vegetarisch', 'schnell'],
    ingredients: [['haferflocken', 50, '50 g Haferflocken'], ['joghurt', 150, '150 g Joghurt'], ['milch', 100, '100 ml Milch'], ['himbeeren', 80, '80 g Himbeeren'], ['honig', 10, '1 TL Honig']],
    steps: ['Haferflocken, Joghurt und Milch in einem Glas verrühren.', 'Über Nacht (mindestens 4 Stunden) im Kühlschrank quellen lassen.', 'Morgens mit Himbeeren und Honig toppen.'],
  },
  {
    id: 'skyr-bowl', name: 'Skyr-Bowl mit Banane und Nüssen', meal: 'fruehstueck', minutes: 5, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['skyr', 250, '250 g Skyr'], ['banane', 100, '1 Banane'], ['haferflocken', 30, '30 g Haferflocken'], ['walnuesse', 15, '15 g Walnüsse'], ['honig', 10, '1 TL Honig']],
    steps: ['Skyr in eine Schüssel geben.', 'Banane in Scheiben schneiden, Walnüsse grob hacken.', 'Alles mit den Haferflocken auf dem Skyr verteilen und mit Honig beträufeln.'],
  },
  {
    id: 'vollkorn-ei-avocado', name: 'Vollkornbrot mit Avocado und Ei', meal: 'fruehstueck', minutes: 12, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['vollkornbrot', 90, '2 Scheiben Vollkornbrot'], ['avocado', 75, '½ Avocado'], ['eier', 100, '2 Eier'], ['tomate', 60, '1 kleine Tomate']],
    steps: ['Eier 8 Minuten hart kochen, abschrecken und pellen.', 'Avocado mit der Gabel zerdrücken, salzen und auf das Brot streichen.', 'Mit Ei- und Tomatenscheiben belegen.'],
  },
  {
    id: 'milchreis-apfel', name: 'Haferbrei mit Apfel und Zimt', meal: 'fruehstueck', minutes: 10, tags: ['vegetarisch', 'schnell'],
    ingredients: [['haferflocken', 60, '60 g Haferflocken'], ['milch', 250, '250 ml Milch'], ['apfel', 150, '1 Apfel'], ['walnuesse', 10, '10 g Walnüsse'], ['honig', 10, '1 TL Honig']],
    steps: ['Apfel raspeln und mit Haferflocken und Milch aufkochen.', '3 Minuten unter Rühren köcheln, mit Zimt abschmecken.', 'Mit gehackten Walnüssen und Honig servieren.'],
  },
  {
    id: 'quark-brot', name: 'Vollkornbrot mit Frischkäse und Gurke', meal: 'fruehstueck', minutes: 5, tags: ['vegetarisch', 'schnell'],
    ingredients: [['vollkornbrot', 90, '2 Scheiben Vollkornbrot'], ['koerniger-frischkaese', 100, '100 g körniger Frischkäse'], ['gurke', 80, '¼ Gurke'], ['tomate', 60, '1 kleine Tomate']],
    steps: ['Brot mit dem Frischkäse bestreichen.', 'Gurke und Tomate in Scheiben schneiden und darauf legen.', 'Mit Salz und Pfeffer würzen.'],
  },
  {
    id: 'protein-porridge', name: 'Protein-Porridge mit Beeren', meal: 'fruehstueck', minutes: 8, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['haferflocken', 50, '50 g Haferflocken'], ['milch', 250, '250 ml Milch'], ['proteinpulver', 20, '1 Messlöffel Proteinpulver'], ['heidelbeeren', 80, '80 g Heidelbeeren']],
    steps: ['Haferflocken mit der Milch 3–4 Minuten köcheln.', 'Vom Herd nehmen, das Proteinpulver glatt einrühren.', 'Mit den Beeren servieren.'],
  },
  {
    id: 'spiegelei-bacon', name: 'Spiegeleier mit Bacon und Toast', meal: 'fruehstueck', minutes: 12, tags: ['eiweiss'],
    ingredients: [['eier', 100, '2 Eier'], ['bacon', 30, '3 Scheiben Bacon'], ['weissbrot', 60, '2 Scheiben Toast'], ['tomate', 60, '1 kleine Tomate']],
    steps: ['Bacon in einer Pfanne ohne Fett knusprig braten und herausnehmen.', 'Eier im Bratfett zu Spiegeleiern braten.', 'Toast rösten und alles mit der Tomate anrichten.'],
  },
  {
    id: 'bananen-pfannkuchen', name: 'Bananen-Pfannkuchen', meal: 'fruehstueck', minutes: 15, tags: ['vegetarisch'],
    ingredients: [['banane', 120, '1 Banane'], ['eier', 100, '2 Eier'], ['haferflocken', 40, '40 g Haferflocken'], ['milch', 50, '50 ml Milch'], ['olivenoel', 5, '1 TL Öl']],
    steps: ['Banane zerdrücken und mit Eiern, Haferflocken und Milch verrühren.', 'Öl in einer Pfanne erhitzen und kleine Pfannkuchen portionsweise goldbraun backen.', 'Mit Zimt oder frischem Obst servieren.'],
  },
  {
    id: 'muesli-joghurt', name: 'Müsli mit Joghurt und Apfel', meal: 'fruehstueck', minutes: 4, tags: ['vegetarisch', 'schnell'],
    ingredients: [['muesli', 50, '50 g Müsli'], ['joghurt', 200, '200 g Joghurt'], ['apfel', 120, '1 kleiner Apfel']],
    steps: ['Apfel in kleine Stücke schneiden.', 'Joghurt in eine Schüssel geben, Müsli und Apfel darüber verteilen.'],
  },
  {
    id: 'ruehrtofu', name: 'Rührtofu mit Gemüse', meal: 'fruehstueck', minutes: 15, tags: ['vegan', 'eiweiss'],
    ingredients: [['tofu', 150, '150 g Tofu'], ['paprika', 80, '½ Paprika'], ['zwiebel', 40, '½ Zwiebel'], ['olivenoel', 8, '2 TL Öl'], ['vollkornbrot', 45, '1 Scheibe Vollkornbrot']],
    steps: ['Zwiebel und Paprika klein würfeln und im Öl 3 Minuten anbraten.', 'Tofu mit der Gabel zerbröseln, dazugeben und 5 Minuten braten.', 'Mit Salz, Pfeffer, Kurkuma und etwas Sojasauce würzen, mit Brot servieren.'],
  },
  {
    id: 'smoothie-bowl', name: 'Beeren-Smoothie-Bowl', meal: 'fruehstueck', minutes: 7, tags: ['vegetarisch', 'schnell'],
    ingredients: [['erdbeeren', 120, '120 g Erdbeeren'], ['banane', 100, '1 Banane'], ['griechischer-joghurt', 150, '150 g griechischer Joghurt'], ['haferflocken', 25, '25 g Haferflocken']],
    steps: ['Erdbeeren, Banane und Joghurt im Mixer cremig pürieren.', 'In eine Schale füllen und mit den Haferflocken bestreuen.'],
  },
  {
    id: 'kaese-broetchen', name: 'Vollkornbrötchen mit Käse und Ei', meal: 'fruehstueck', minutes: 10, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['broetchen', 55, '1 Brötchen'], ['gouda', 40, '2 Scheiben Gouda'], ['eier', 50, '1 Ei'], ['gurke', 60, 'etwas Gurke'], ['butter', 5, '1 TL Butter']],
    steps: ['Ei 8 Minuten hart kochen.', 'Brötchen aufschneiden und mit Butter bestreichen.', 'Mit Käse, Ei-Scheiben und Gurke belegen.'],
  },
  // ---- Mittag ----
  {
    id: 'pute-quinoa', name: 'Putenbrust mit Quinoa und Gemüse', meal: 'mittag', minutes: 25, tags: ['eiweiss'],
    ingredients: [['putenbrust', 150, '150 g Putenbrust'], ['quinoa', 60, '60 g Quinoa (ungekocht)'], ['zucchini', 150, '½ Zucchini'], ['paprika', 100, '1 Paprika'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Quinoa nach Packungsanleitung kochen.', 'Pute würfeln und im Öl rundherum braten, würzen.', 'Gemüse in Stücken 5 Minuten mitbraten und mit der Quinoa servieren.'],
  },
  {
    id: 'wrap-haehnchen', name: 'Hähnchen-Wrap mit Salat', meal: 'mittag', minutes: 15, tags: ['schnell', 'eiweiss'],
    ingredients: [['wrap', 60, '1 großer Wrap'], ['haehnchenbrust', 120, '120 g Hähnchenbrust'], ['salat', 40, 'Salatblätter'], ['tomate', 80, '1 Tomate'], ['joghurt', 40, '2 EL Joghurt']],
    steps: ['Hähnchen in Streifen schneiden und 6 Minuten braten, würzen.', 'Wrap kurz erwärmen und mit Joghurt bestreichen.', 'Mit Salat, Tomate und Hähnchen füllen und einrollen.'],
  },
  {
    id: 'nudelsalat-thunfisch', name: 'Nudelsalat mit Thunfisch und Mais', meal: 'mittag', minutes: 20, tags: ['eiweiss'],
    ingredients: [['spaghetti', 80, '80 g Nudeln (ungekocht)'], ['thunfisch', 120, '1 Dose Thunfisch'], ['mais', 60, '60 g Mais'], ['gurke', 80, '¼ Gurke'], ['joghurt', 50, '50 g Joghurt'], ['olivenoel', 5, '1 TL Öl']],
    steps: ['Nudeln bissfest kochen, abschrecken.', 'Gurke würfeln, Thunfisch und Mais abtropfen.', 'Alles mit Joghurt, Öl, Salz und Pfeffer vermengen und kurz ziehen lassen.'],
  },
  {
    id: 'linsen-bowl', name: 'Linsen-Bowl mit Feta', meal: 'mittag', minutes: 25, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['linsen', 70, '70 g Linsen (ungekocht)'], ['feta', 40, '40 g Feta'], ['gurke', 100, '⅓ Gurke'], ['tomate', 100, '1 Tomate'], ['olivenoel', 8, '2 TL Olivenöl']],
    steps: ['Linsen in Wasser 15–20 Minuten weich kochen, abgießen und abkühlen lassen.', 'Gurke und Tomate würfeln, Feta zerbröseln.', 'Alles mit Öl, Salz, Pfeffer und etwas Zitronensaft mischen.'],
  },
  {
    id: 'kartoffel-quark', name: 'Pellkartoffeln mit Kräuterquark', meal: 'mittag', minutes: 25, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['kartoffel', 300, '300 g Kartoffeln'], ['magerquark', 200, '200 g Magerquark'], ['milch', 30, 'ein Schuss Milch'], ['gurke', 80, '¼ Gurke']],
    steps: ['Kartoffeln in der Schale 20 Minuten kochen.', 'Quark mit Milch glattrühren, Kräuter, Salz und Pfeffer unterrühren.', 'Gurke in Scheiben schneiden und alles zusammen servieren.'],
  },
  {
    id: 'gemuesesuppe', name: 'Gemüsesuppe mit Kichererbsen', meal: 'mittag', minutes: 30, tags: ['vegan', 'eiweiss'],
    ingredients: [['kichererbsen', 150, '150 g Kichererbsen (Dose)'], ['karotte', 100, '1 Karotte'], ['kartoffel', 150, '1 große Kartoffel'], ['zwiebel', 50, '1 kleine Zwiebel'], ['tomatensauce', 150, '150 g passierte Tomaten'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Zwiebel würfeln und im Öl glasig dünsten.', 'Karotte und Kartoffel klein schneiden, mit Tomaten und etwa 500 ml Brühe aufgießen.', '15 Minuten köcheln, Kichererbsen dazugeben und weitere 5 Minuten garen. Würzen.'],
  },
  {
    id: 'reis-pfanne-ei', name: 'Gebratener Reis mit Ei und Erbsen', meal: 'mittag', minutes: 20, tags: ['vegetarisch'],
    ingredients: [['reis-gekocht', 250, '250 g gekochter Reis'], ['eier', 100, '2 Eier'], ['erbsen', 80, '80 g Erbsen'], ['karotte', 60, '1 kleine Karotte'], ['sojasauce', 15, '1 EL Sojasauce'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Karotte klein würfeln und im Öl 3 Minuten braten.', 'Reis und Erbsen dazugeben und scharf anbraten.', 'Eier hineinschlagen, unterrühren und stocken lassen, mit Sojasauce würzen.'],
  },
  {
    id: 'burrito-bowl', name: 'Burrito-Bowl mit Bohnen und Mais', meal: 'mittag', minutes: 20, tags: ['vegan', 'eiweiss'],
    ingredients: [['reis-gekocht', 200, '200 g gekochter Reis'], ['kidneybohnen', 120, '120 g Kidneybohnen'], ['mais', 60, '60 g Mais'], ['avocado', 60, '½ Avocado'], ['tomate', 100, '1 Tomate'], ['paprika', 80, '½ Paprika']],
    steps: ['Reis erwärmen, Bohnen und Mais abtropfen und kurz mit erhitzen.', 'Tomate, Paprika und Avocado würfeln.', 'Alles in einer Schale anrichten, mit Salz, Pfeffer und Limettensaft würzen.'],
  },
  {
    id: 'lachs-nudeln', name: 'Lachs-Nudeln mit Spinat', meal: 'mittag', minutes: 25, tags: ['eiweiss'],
    ingredients: [['spaghetti', 80, '80 g Nudeln (ungekocht)'], ['lachs', 120, '120 g Lachsfilet'], ['spinat', 100, '100 g Spinat'], ['sahne', 40, '40 ml Sahne'], ['olivenoel', 5, '1 TL Öl']],
    steps: ['Nudeln bissfest kochen.', 'Lachs würfeln und im Öl 4 Minuten braten, Spinat dazugeben und zusammenfallen lassen.', 'Sahne einrühren, würzen, die Nudeln untermischen.'],
  },
  {
    id: 'hack-gemuese-reis', name: 'Hackfleisch-Gemüse-Pfanne mit Reis', meal: 'mittag', minutes: 25, tags: ['eiweiss'],
    ingredients: [['rinderhack', 120, '120 g Rinderhack'], ['reis', 60, '60 g Reis (ungekocht)'], ['paprika', 100, '1 Paprika'], ['zucchini', 100, '½ Zucchini'], ['tomatensauce', 100, '100 g passierte Tomaten']],
    steps: ['Reis nach Packungsanleitung kochen.', 'Hack in einer Pfanne krümelig anbraten, Gemüse würfeln und mitbraten.', 'Mit den Tomaten ablöschen, 5 Minuten köcheln, würzen und mit Reis servieren.'],
  },
  {
    id: 'caprese-salat', name: 'Caprese-Salat mit Vollkornbrot', meal: 'mittag', minutes: 10, tags: ['vegetarisch', 'schnell'],
    ingredients: [['mozzarella', 125, '1 Kugel Mozzarella'], ['tomate', 200, '2 Tomaten'], ['vollkornbrot', 45, '1 Scheibe Vollkornbrot'], ['olivenoel', 8, '2 TL Olivenöl'], ['pesto', 10, '2 TL Pesto']],
    steps: ['Mozzarella und Tomaten in Scheiben schneiden und abwechselnd anrichten.', 'Mit Öl, Pesto, Salz und Pfeffer würzen.', 'Mit dem Brot essen.'],
  },
  {
    id: 'couscous-salat', name: 'Couscous-Salat mit Hähnchen', meal: 'mittag', minutes: 20, tags: ['schnell', 'eiweiss'],
    ingredients: [['couscous', 60, '60 g Couscous'], ['haehnchenbrust', 120, '120 g Hähnchenbrust'], ['gurke', 100, '⅓ Gurke'], ['tomate', 100, '1 Tomate'], ['olivenoel', 8, '2 TL Olivenöl']],
    steps: ['Couscous mit heißem Wasser übergießen und 5 Minuten quellen lassen.', 'Hähnchen in Würfeln braten und würzen.', 'Gemüse würfeln, alles mit Öl, Zitronensaft und Salz mischen.'],
  },
  {
    id: 'kuerbis-suppe', name: 'Kürbissuppe mit Brot', meal: 'mittag', minutes: 30, tags: ['vegan'],
    ingredients: [['kuerbis', 300, '300 g Hokkaido-Kürbis'], ['kartoffel', 100, '1 kleine Kartoffel'], ['zwiebel', 50, '1 kleine Zwiebel'], ['olivenoel', 8, '2 TL Öl'], ['vollkornbrot', 90, '2 Scheiben Vollkornbrot'], ['kichererbsen', 60, '60 g Kichererbsen als Einlage']],
    steps: ['Zwiebel im Öl anschwitzen, Kürbis und Kartoffel würfeln und kurz mitbraten.', 'Mit etwa 500 ml Brühe aufgießen und 15 Minuten weich kochen.', 'Pürieren, würzen, die Kichererbsen einstreuen und mit Brot servieren.'],
  },
  {
    id: 'pizza-wrap', name: 'Schinken-Käse-Wrap aus der Pfanne', meal: 'mittag', minutes: 10, tags: ['schnell'],
    ingredients: [['wrap', 60, '1 großer Wrap'], ['schinken', 60, '3 Scheiben Kochschinken'], ['gouda', 40, '40 g Käse'], ['tomate', 80, '1 Tomate'], ['salat', 30, 'etwas Salat']],
    steps: ['Wrap mit Schinken, Käse, Tomate und Salat belegen und zusammenklappen.', 'In einer trockenen Pfanne von beiden Seiten 2 Minuten knusprig braten.'],
  },
  {
    id: 'thai-curry', name: 'Gemüse-Curry mit Tofu und Reis', meal: 'mittag', minutes: 25, tags: ['vegan', 'eiweiss'],
    ingredients: [['tofu', 150, '150 g Tofu'], ['reis', 60, '60 g Reis (ungekocht)'], ['blumenkohl', 150, '150 g Blumenkohl'], ['paprika', 80, '½ Paprika'], ['tomatensauce', 100, '100 g passierte Tomaten'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Reis kochen. Tofu würfeln und im Öl knusprig braten.', 'Gemüse klein schneiden, dazugeben und 4 Minuten braten.', 'Mit Tomaten, Currypulver, Salz und einem Schuss Wasser 8 Minuten köcheln, mit Reis servieren.'],
  },
  // ---- Abend ----
  {
    id: 'ofengemuese-feta', name: 'Ofengemüse mit Feta', meal: 'abend', minutes: 35, tags: ['vegetarisch'],
    ingredients: [['feta', 80, '80 g Feta'], ['zucchini', 150, '½ Zucchini'], ['paprika', 150, '1 Paprika'], ['kartoffel', 200, '2 Kartoffeln'], ['olivenoel', 10, '1 EL Olivenöl']],
    steps: ['Ofen auf 200 °C vorheizen. Gemüse in Stücke schneiden und mit Öl, Salz und Pfeffer auf einem Blech verteilen.', '20 Minuten backen, dann den Feta darauflegen.', 'Weitere 10 Minuten backen, bis alles gebräunt ist.'],
  },
  {
    id: 'haehnchen-ofen', name: 'Ofen-Hähnchen mit Süßkartoffeln', meal: 'abend', minutes: 40, tags: ['eiweiss'],
    ingredients: [['haehnchenbrust', 160, '160 g Hähnchenbrust'], ['suesskartoffel', 250, '1 Süßkartoffel'], ['brokkoli', 150, '150 g Brokkoli'], ['olivenoel', 10, '1 EL Öl']],
    steps: ['Ofen auf 200 °C heizen. Süßkartoffel in Spalten schneiden, mit der Hälfte des Öls mischen und 15 Minuten backen.', 'Hähnchen würzen, mit dem Brokkoli und dem restlichen Öl dazugeben.', 'Weitere 20 Minuten backen, bis das Hähnchen durch ist.'],
  },
  {
    id: 'kabeljau-gemuese', name: 'Kabeljau mit Gemüse und Kartoffeln', meal: 'abend', minutes: 30, tags: ['eiweiss'],
    ingredients: [['kabeljau', 180, '180 g Kabeljaufilet'], ['kartoffel', 250, '250 g Kartoffeln'], ['gruene-bohnen', 150, '150 g grüne Bohnen'], ['butter', 10, '2 TL Butter']],
    steps: ['Kartoffeln und Bohnen in Salzwasser garen.', 'Fisch würzen und in der Butter von jeder Seite 3–4 Minuten braten.', 'Alles zusammen anrichten und mit Zitrone beträufeln.'],
  },
  {
    id: 'chili-sin-carne', name: 'Chili sin Carne', meal: 'abend', minutes: 30, tags: ['vegan', 'eiweiss'],
    ingredients: [['kidneybohnen', 200, '200 g Kidneybohnen'], ['mais', 80, '80 g Mais'], ['paprika', 100, '1 Paprika'], ['zwiebel', 50, '1 kleine Zwiebel'], ['tomatensauce', 250, '250 g passierte Tomaten'], ['reis', 50, '50 g Reis (ungekocht)'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Zwiebel und Paprika würfeln und im Öl anbraten.', 'Bohnen, Mais und Tomaten dazugeben, mit Chili, Kreuzkümmel und Salz würzen und 15 Minuten köcheln.', 'Mit dem gekochten Reis servieren.'],
  },
  {
    id: 'gemuese-pasta', name: 'Pasta mit Gemüse und Mozzarella', meal: 'abend', minutes: 20, tags: ['vegetarisch'],
    ingredients: [['spaghetti', 90, '90 g Nudeln (ungekocht)'], ['zucchini', 120, '½ Zucchini'], ['tomate', 150, '2 Tomaten'], ['mozzarella', 60, '½ Kugel Mozzarella'], ['olivenoel', 8, '2 TL Olivenöl']],
    steps: ['Nudeln bissfest kochen.', 'Zucchini und Tomaten würfeln und im Öl 6 Minuten braten.', 'Nudeln untermischen, Mozzarella in Stücken daraufgeben und kurz schmelzen lassen.'],
  },
  {
    id: 'steak-salat', name: 'Rindersteak mit Salat und Brot', meal: 'abend', minutes: 20, tags: ['eiweiss'],
    ingredients: [['rindersteak', 150, '150 g Rindersteak'], ['salat', 80, 'gemischter Salat'], ['tomate', 100, '1 Tomate'], ['vollkornbrot', 45, '1 Scheibe Brot'], ['olivenoel', 10, '2 TL Öl']],
    steps: ['Steak 30 Minuten vor dem Braten aus dem Kühlschrank nehmen und salzen.', 'In einer heißen Pfanne mit etwas Öl je Seite 2–3 Minuten braten, 3 Minuten ruhen lassen.', 'Salat und Tomate mit dem restlichen Öl anmachen und mit Brot servieren.'],
  },
  {
    id: 'garnelen-pfanne', name: 'Garnelen-Gemüse-Pfanne', meal: 'abend', minutes: 20, tags: ['schnell', 'eiweiss'],
    ingredients: [['garnelen', 150, '150 g Garnelen'], ['reis', 60, '60 g Reis (ungekocht)'], ['zucchini', 120, '½ Zucchini'], ['paprika', 100, '1 Paprika'], ['olivenoel', 8, '2 TL Öl'], ['sojasauce', 10, '2 TL Sojasauce']],
    steps: ['Reis kochen.', 'Gemüse in Streifen im Öl 4 Minuten braten.', 'Garnelen dazugeben, 3 Minuten mitbraten, mit Sojasauce würzen und mit Reis servieren.'],
  },
  {
    id: 'gefuellte-paprika', name: 'Gefüllte Paprika mit Reis und Hack', meal: 'abend', minutes: 40, tags: ['eiweiss'],
    ingredients: [['paprika', 300, '2 Paprika'], ['rinderhack', 100, '100 g Rinderhack'], ['reis-gekocht', 150, '150 g gekochter Reis'], ['tomatensauce', 100, '100 g passierte Tomaten'], ['gouda', 30, '30 g Käse']],
    steps: ['Ofen auf 190 °C heizen. Paprika halbieren und entkernen.', 'Hack anbraten, mit Reis und der Hälfte der Tomaten mischen, würzen und in die Paprika füllen.', 'Restliche Tomaten in die Form geben, Käse darüberstreuen und 25 Minuten backen.'],
  },
  {
    id: 'kartoffel-gratin', name: 'Kartoffel-Brokkoli-Auflauf', meal: 'abend', minutes: 45, tags: ['vegetarisch'],
    ingredients: [['kartoffel', 300, '300 g Kartoffeln'], ['brokkoli', 200, '200 g Brokkoli'], ['gouda', 50, '50 g Käse'], ['milch', 100, '100 ml Milch'], ['eier', 50, '1 Ei']],
    steps: ['Kartoffeln in Scheiben schneiden und 8 Minuten vorkochen, Brokkoli 3 Minuten blanchieren.', 'In eine Form schichten. Milch und Ei verquirlen, würzen und darübergießen.', 'Mit Käse bestreuen und bei 190 °C 25 Minuten backen.'],
  },
  {
    id: 'falafel-teller', name: 'Hummus-Teller mit Gemüse und Brot', meal: 'abend', minutes: 10, tags: ['vegan', 'schnell'],
    ingredients: [['hummus', 100, '100 g Hummus'], ['vollkornbrot', 90, '2 Scheiben Vollkornbrot'], ['gurke', 100, '⅓ Gurke'], ['karotte', 80, '1 Karotte'], ['kichererbsen', 80, '80 g Kichererbsen']],
    steps: ['Gurke und Karotte in Stifte schneiden.', 'Hummus und Kichererbsen auf einem Teller anrichten.', 'Mit Gemüse und Brot essen.'],
  },
  {
    id: 'tomaten-eier', name: 'Shakshuka (Eier in Tomatensoße)', meal: 'abend', minutes: 20, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['eier', 150, '3 Eier'], ['tomatensauce', 250, '250 g passierte Tomaten'], ['paprika', 100, '1 Paprika'], ['zwiebel', 50, '1 kleine Zwiebel'], ['vollkornbrot', 45, '1 Scheibe Brot'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Zwiebel und Paprika im Öl 5 Minuten anbraten.', 'Tomaten dazugeben, würzen (Paprikapulver, Kreuzkümmel) und 8 Minuten köcheln.', 'Mulden formen, Eier hineingleiten lassen und zugedeckt stocken lassen. Mit Brot servieren.'],
  },
  {
    id: 'forelle-kartoffel', name: 'Forelle mit Kartoffeln und Gurkensalat', meal: 'abend', minutes: 30, tags: ['eiweiss'],
    ingredients: [['forelle', 180, '180 g Forellenfilet'], ['kartoffel', 250, '250 g Kartoffeln'], ['gurke', 150, '½ Gurke'], ['butter', 10, '2 TL Butter'], ['joghurt', 50, '50 g Joghurt']],
    steps: ['Kartoffeln kochen.', 'Gurke hobeln und mit Joghurt, Salz und Dill anmachen.', 'Forelle in der Butter 3 Minuten je Seite braten und mit den Kartoffeln servieren.'],
  },
  {
    id: 'rote-linsen-dal', name: 'Rotes Linsen-Dal mit Reis', meal: 'abend', minutes: 30, tags: ['vegan', 'eiweiss'],
    ingredients: [['linsen', 80, '80 g rote Linsen'], ['reis', 50, '50 g Reis (ungekocht)'], ['tomatensauce', 150, '150 g passierte Tomaten'], ['zwiebel', 50, '1 kleine Zwiebel'], ['spinat', 80, '80 g Spinat'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Reis kochen. Zwiebel im Öl anschwitzen und mit Curry anrösten.', 'Linsen, Tomaten und 300 ml Wasser dazugeben und 15 Minuten köcheln.', 'Spinat unterrühren, würzen und mit Reis servieren.'],
  },
  {
    id: 'pute-nudelpfanne', name: 'Puten-Nudel-Pfanne mit Champignons', meal: 'abend', minutes: 25, tags: ['eiweiss'],
    ingredients: [['putenbrust', 140, '140 g Putenbrust'], ['spaghetti', 80, '80 g Nudeln (ungekocht)'], ['champignons', 150, '150 g Champignons'], ['sahne', 30, '30 ml Sahne'], ['olivenoel', 8, '2 TL Öl']],
    steps: ['Nudeln kochen.', 'Pute in Streifen und Champignons in Scheiben im Öl 7 Minuten braten.', 'Sahne einrühren, würzen und die Nudeln untermischen.'],
  },
  // ---- Snacks ----
  {
    id: 'apfel-erdnuss', name: 'Apfel mit Erdnussbutter', meal: 'snack', minutes: 3, tags: ['vegan', 'schnell'],
    ingredients: [['apfel', 180, '1 Apfel'], ['erdnussbutter', 30, '2 EL Erdnussbutter'], ['haferflocken', 20, '2 EL Haferflocken']],
    steps: ['Apfel in Spalten schneiden.', 'Erdnussbutter dazu reichen, Haferflocken darüberstreuen.'],
  },
  {
    id: 'proteinshake', name: 'Protein-Shake mit Banane', meal: 'snack', minutes: 3, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['proteinpulver', 30, '1 Messlöffel Proteinpulver'], ['milch', 300, '300 ml Milch'], ['banane', 100, '1 Banane']],
    steps: ['Alle Zutaten in einen Mixer geben.', '30 Sekunden mixen und sofort trinken.'],
  },
  {
    id: 'hummus-gemuese', name: 'Gemüsesticks mit Hummus', meal: 'snack', minutes: 5, tags: ['vegan', 'schnell'],
    ingredients: [['hummus', 80, '80 g Hummus'], ['karotte', 100, '1 große Karotte'], ['gurke', 100, '⅓ Gurke'], ['paprika', 100, '1 Paprika'], ['vollkornbrot', 45, '1 Scheibe Brot']],
    steps: ['Gemüse in Stifte schneiden.', 'Mit Hummus und Brot servieren.'],
  },
  {
    id: 'nuss-joghurt', name: 'Joghurt mit Nüssen und Honig', meal: 'snack', minutes: 2, tags: ['vegetarisch', 'schnell'],
    ingredients: [['griechischer-joghurt', 200, '200 g griechischer Joghurt'], ['walnuesse', 20, '20 g Walnüsse'], ['honig', 10, '1 TL Honig'], ['heidelbeeren', 50, '50 g Heidelbeeren']],
    steps: ['Joghurt in eine Schale geben.', 'Mit gehackten Nüssen, Beeren und Honig toppen.'],
  },
  {
    id: 'frischkaese-toast', name: 'Vollkorntoast mit Frischkäse und Banane', meal: 'snack', minutes: 4, tags: ['vegetarisch', 'schnell'],
    ingredients: [['vollkornbrot', 90, '2 Scheiben Vollkornbrot'], ['frischkaese', 40, '2 EL Frischkäse'], ['banane', 100, '1 Banane'], ['honig', 5, '1 TL Honig']],
    steps: ['Brot toasten und mit Frischkäse bestreichen.', 'Banane in Scheiben darauflegen und mit Honig beträufeln.'],
  },
  {
    id: 'ei-snack', name: 'Hartgekochte Eier mit Tomaten', meal: 'snack', minutes: 10, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['eier', 100, '2 Eier'], ['tomate', 150, '1–2 Tomaten'], ['vollkornbrot', 45, '1 Scheibe Brot']],
    steps: ['Eier 8–9 Minuten hart kochen und abschrecken.', 'Tomaten in Scheiben schneiden, salzen und mit den halbierten Eiern und Brot essen.'],
  },
  {
    id: 'cottage-obst', name: 'Cottage Cheese mit Ananas', meal: 'snack', minutes: 3, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['koerniger-frischkaese', 200, '200 g körniger Frischkäse'], ['ananas', 120, '120 g Ananas'], ['mandeln', 15, '15 g Mandeln']],
    steps: ['Frischkäse in eine Schale geben.', 'Ananas würfeln, mit gehackten Mandeln darauf verteilen.'],
  },
  {
    id: 'thunfisch-brot', name: 'Thunfisch-Brot mit Gurke', meal: 'snack', minutes: 5, tags: ['schnell', 'eiweiss'],
    ingredients: [['vollkornbrot', 90, '2 Scheiben Vollkornbrot'], ['thunfisch', 100, '100 g Thunfisch'], ['frischkaese', 30, '1 EL Frischkäse'], ['gurke', 80, '¼ Gurke']],
    steps: ['Thunfisch abtropfen und mit dem Frischkäse, Salz und Pfeffer verrühren.', 'Auf das Brot streichen und mit Gurkenscheiben belegen.'],
  },
  {
    id: 'bananen-eis', name: 'Bananen-Quark-Eis', meal: 'snack', minutes: 5, tags: ['vegetarisch', 'eiweiss'],
    ingredients: [['banane', 150, '1 große Banane (gefroren)'], ['magerquark', 150, '150 g Magerquark'], ['erdbeeren', 80, '80 g Erdbeeren (gefroren)']],
    steps: ['Gefrorene Banane und Erdbeeren mit dem Quark im Mixer cremig pürieren.', 'Sofort essen oder 30 Minuten ins Gefrierfach stellen.'],
  },
  {
    id: 'reiswaffel-snack', name: 'Quark-Dip mit Gemüse und Knäckebrot', meal: 'snack', minutes: 8, tags: ['vegetarisch', 'schnell', 'eiweiss'],
    ingredients: [['magerquark', 150, '150 g Magerquark'], ['knaeckebrot', 30, '3 Scheiben Knäckebrot'], ['gurke', 100, '⅓ Gurke'], ['paprika', 80, '½ Paprika']],
    steps: ['Quark mit Salz, Pfeffer und Kräutern zum Dip verrühren.', 'Gemüse in Stifte schneiden und mit Knäckebrot und Dip essen.'],
  },
];
