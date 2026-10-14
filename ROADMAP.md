# Level Up – Roadmap zum App Store & Google Play

Ziel: Level Up als iOS- und Android-App veröffentlichen – mit Konten, Freunden, Shop und Gamification.

## Phase 1 – Konten & Credits auf dem Server
- [x] Konto löschen in der App (Apple-Pflicht) – `delete_my_account()` in `supabase/schema.sql`
- [x] Credits serverseitig berechnen – `credits_earned()` / `my_credits()`, gleiche Regeln wie `js/xp.js`
- [x] Lokale Daten ins Konto übertragen (abbruchsicher, keine Doppelten)
- [x] Lokaler Modus: „Alle Daten löschen“
- [x] Menü ☰ oben rechts: Konto & Einstellungen (Konto, Stil, App-Update), Backup, Abmelden
- [x] Supabase-Projekt anlegen und `js/config.js` eintragen
- [x] Entscheidung: Anmeldung nur mit E-Mail + Passwort (kein Apple-/Google-Login nötig)

## Zwischendurch – Gamification (nach Vorbild deiner Screenshots)
- [x] Ränge pro Übung (Bronze → Titan, III → I) mit eigenen Abzeichen, Gesamt-Rang
- [x] Neue Navigation: Workout · Home · Ränge · Freunde · Profil; Kopfzeile mit Level, Serie, Credits
- [x] Ränge-Reiter: Rang, Körpergraph, Rekorde, Analyse
- [x] Profil mit Avatar, Kacheln und Trainings-Kalender
- [x] Aufgaben (täglich/wöchentlich) mit Credits – auch serverseitig berechnet
- [x] Medaillen für Meilensteine
- [x] Eigenes Design statt Liftoff-Look: Neon-Körpergraph, Muskel-Radar, Schild-Abzeichen, Neon-Avatar
- [ ] Fotos im Kalender (braucht Datei-Upload)

## Phase 2 – Code-Umbau
- [x] TypeScript + React, Build mit Vite (Ordner `web/`), alle Seiten portiert
- [x] Tests ausgebaut: 40 Unit-Tests (Vitest) + automatische Prüfung bei jedem Push (GitHub Actions)
- [x] Veröffentlichungs-Ablauf für GitHub Pages (`.github/workflows/pages.yml`)
- [x] Pages auf „GitHub Actions“ umgestellt – die React-Version ist live
- [x] Alte App im Hauptordner entfernt, README neu
- [ ] Browser-Tests (Playwright) ins Repo übernehmen

## Phase 3 – Freunde & Community
- [x] Profile für Freunde (Name, Avatar, Level, Rang, Serie, Körpergraph, Bestwerte)
- [x] Freunde per Code oder Einladungslink hinzufügen, Freundschaftsanfragen annehmen/ablehnen
- [x] Freunde-Feed auf Home mit „Anfeuern“
- [x] Rangliste mit Freunden (Credits vom Server berechnet, Trainings pro Woche)
- [x] Sichtbarkeit (Freunde/privat), Melden & Blockieren (Apple-Pflicht bei Nutzerinhalten)
- [x] Neues SQL in Supabase ausgeführt
- [x] Ranglisten pro Woche (Trainings, Sätze, Volumen) und pro Übung (bestes 1RM)
- [x] Kommentare unter Trainings mit Wortfilter, Melden und Löschen
- [x] Challenges: 7 Tage, Trainings/Sätze/Volumen, Gewinner +50 Credits
- [x] Neues SQL (Challenges + Kommentare) in Supabase ausgeführt
- [ ] Meldungen regelmäßig prüfen (jetzt im Admin-Menü) (**Lukas**)

## Phase 4 – Shop
- [x] Körpergraph-Looks, Farbschemata, Avatar-Accessoires und Titel mit Credits kaufen
- [x] Server prüft jeden Kauf (`buy_item`: Guthaben, doppelt, unbekannt) und jedes Ausrüsten (`equip_item`)
- [x] Guthaben = verdiente Credits − ausgegeben; Level zählt weiter alle verdienten Credits
- [x] Freunde sehen deine Ausrüstung (Titel, Avatar, Körpergraph-Look)
- [ ] SQL im Supabase-Projekt erneut ausführen (**Lukas**)

## Phase 5 – Native Apps (Capacitor)
- [x] iOS- und Android-Projekt mit Capacitor (`web/ios`, `web/android`, App-ID `com.lukbru4.levelup`)
- [x] Cloud-Builds über GitHub Actions (`native.yml`): Android-Test-APK, iOS-Simulator-Build
- [x] App-Icon und Startbildschirm, Hochformat, Statusleiste passend zu Hell/Dunkel, Android-Zurück-Taste
- [x] Pause-Timer: Benachrichtigung auch bei gesperrtem Handy, Vibration am Pausenende
- [x] Links in E-Mails/Einladungen zeigen aus der App auf die Web-Adresse
- [ ] App auf echtem iPhone testen: braucht Apple-Developer-Konto + TestFlight (**Lukas**, siehe Phase 6)
- [ ] Push-Nachrichten (Apple-Schlüssel bzw. Firebase nötig), Apple Health / Health Connect
- [ ] Einladungs- und Passwort-Links direkt in der App öffnen (Universal Links / App Links)

## Phase 6 – Veröffentlichung vorbereiten
- [ ] Apple Developer Program (99 USD/Jahr) und Google Play Console (25 USD einmalig) (**Lukas**)
- [x] Entwürfe: Datenschutzerklärung, Impressum, Nutzungsbedingungen (`web/public/*.html`), in der App verlinkt
- [x] Registrierung nur mit Zustimmung (inkl. Einwilligung Gesundheitsdaten), Version + Zeitpunkt im Konto
- [ ] Platzhalter ausfüllen (Name, Anschrift, Kontakt, Supabase-Region) und Texte rechtlich prüfen lassen (**Lukas**)
- [ ] Auftragsverarbeitungsvertrag (DPA) mit Supabase bestätigen (**Lukas**)
- [x] Entwurf Store-Einträge, Datenschutz-Angaben, Altersfreigabe (`store/listing-de.md`), Screenshots (`store/screenshots/`)
- [ ] Store-Einträge in App Store Connect / Play Console eintragen (nach Konto-Anmeldung)
- [ ] Testphase: TestFlight bzw. geschlossener Test (Google: 12 Tester, 14 Tage für neue private Konten)

## Zwischendurch – Wünsche
- [x] Begrüßung auf Home mit Wochen-/Monatsrückblick
- [x] Dunkel-Zeiten selbst wählen
- [x] Vorlage nach dem Training per Häkchen aktualisieren / freies Training als Vorlage speichern
- [x] 11 Farbschemata im Shop mit 👁-Vorschau; alle anderen haben „Standard (Blau)“
- [x] Admin-Menü (nur Admin, vom Server geprüft): alle Farben + Akzentfarbe, Farbschema-Designer mit Shop-Angebot, Meldungen bearbeiten
- [ ] Admin eintragen: einrichten-Seite → „Dich als Admin eintragen“ (**Lukas**)
- [x] App zeigt dem Admin „Datenbank-Update nötig“, wenn das SQL älter ist als die App (`schema_version()`)
- [x] Serie in Tagen mit Wochenziel (1–7× pro Woche, im Konto gespeichert, Freunde sehen es)
- [x] Eigene Bestätigungs-Kästen statt weißer System-Popups
- [x] Wisch-Leiste für Gewicht, Wiederholungen, Minuten und km
- [x] Einseitige Übungen: Schalter „L/R“ pro Übung → Sätze 1L/1R, „Vorherig“ je Seite (SQL-Version 39)
- [x] Standard-Design schwarz mit roten Akzenten, wahlweise weiß mit roten Akzenten
- [x] Home: Statistik umschaltbar Woche/Monat/Jahr (Start: Jahr), „Letztes Training“ antippbar, Credits-Regeln ganz unten
- [x] Aufgaben-Credits erhöht (täglich 25/15/30, wöchentlich 75/60), Muskelname über dem Körpergraphen
- [x] Eigene Auswahl-Liste statt Apple-Auswahl (Analyse, Rangliste, Challenge), Battle-Button, Shop ohne Avatar-Artikel
- [x] Neue Schriften (Inter, Barlow Condensed kursiv), Rekorde-Seite entfernt, Körpergewicht per Wisch-Leiste, Übungsauswahl als senkrechte Wisch-Liste mit Pfeil
- [x] Freunde-Design (Liste mit Avatar-Kreisen zuerst, Einladung kompakt), Profil mit eigenen Symbolen, Essen/Shop als eigene Zeile
- [ ] Offen aus dem Feedback: Körper noch realistischer, Fragebogen/Trainingsplan in den Einstellungen, Profilfoto, Freunde-Design, Wochenplan, Einstellungen für Trainingsende
- [x] Einstellungen → Fragen: bis zu 20 Fragen → persönlicher Trainingsplan (Vorlagen „Plan · …“, Wochenplan, Wochenziel)
- [x] Pro-Grundlage: Status nur vom Server (SQL-Version 42), Bezahlseite (9,99 €/Monat, 64,99 €/Jahr), Plan nur mit Pro, Admin hat immer Pro
- [ ] Echte Käufe: Apple-/Google-Konto (**Lukas**), RevenueCat, Server-Eintrag in `subscriptions`
- [x] Essen tracken (nur Pro, SQL-Version 43): Tag/Mahlzeiten, Tagesziel, Suche + Barcode (Open Food Facts), Kamera-Scan, manuell – Server prüft Pro beim Hinzufügen
- [ ] Barcode-Kamera auf dem echten Handy prüfen (Kamera-Erlaubnis in iOS/Android eingetragen, nicht getestet)
- [x] Training beenden: „Vorlage wie vorher lassen“ oder „Vorlage speichern“ (Standard: lassen)
- [x] Kalorienziel-Vorschlag aus den Fragen (Größe, Gewicht, Alter, Ziel)
- [x] Profilbild (SQL-Version 44): privater Speicher, nur Freunde sehen es, Foto wird auf 256 px verkleinert
- [x] Foto-KI für Essen (SQL-Version 45): Edge Function `food-photo` (supabase/functions/food-photo), Pro + Tageslimit auf dem Server, Mengen korrigieren
- [x] Rezepte mit Anleitung + Zusatz-Abo „Essen+“ 2,99 €/Monat (zusätzlich zu Pro, SQL-Version 46): 12 Rezepte, Vorschläge passend zu den Kalorien für heute, ins Tagebuch eintragen
- [ ] Rezepte nur auf dem Server ausliefern (jetzt stecken sie in der App; nur die Anzeige ist gesperrt) und mehr Rezepte; Idee: nach Zutaten zuhause filtern
- [x] Essen in der unteren Leiste (nur mit Konto); Foto-Tab beim Essen ausgeblendet, bis `FOOD_PHOTO_ENABLED` in web/src/data/config.ts auf true steht
- [x] Profilbild vor dem Speichern verschieben und vergrößern (Finger, Zwei-Finger-Zoom, Regler)
- [x] Körpergraph plastischer: weiches Licht (Wölbung), Gesichtszüge, Schlüsselbein, Brustwarzen, Nabel, Hinterkopf, Kniekehlen; weitere Schritte: Hände/Füße, Beine
- [x] Essens-Assistent (Chat, SQL-Version 47): die KI fragt nach, was gegessen wurde, und schlägt Einträge vor; Edge Function `food-chat`, Pro + Tageslimit auf dem Server; ausgeschaltet bis `FOOD_CHAT_ENABLED` (web/src/data/config.ts)
- [x] Körper: Beine 16 % länger, Kopf 24 % größer; Verlauf neu: Monatsgruppen mit Summe, Karten mit Datum, Übungen und Kennzahlen, Gesamtzahlen oben
- [x] Essen: Kalorienring (übrig in der Mitte, gegessen/Ziel an der Seite) und Nährwert-Score (4 Stufen, einfache Schätzung); Empfehlung (Tagesziel-Vorschlag) und Makro-Kacheln entfernt
- [x] Pro: Hinweis-Karte im Profil (nur ohne Pro, nur mit Konto); Körpergraph und Muskel-Radar nur mit Pro (Körpergewicht bleibt frei)
- [x] Einstellungen: Karte „Ziele“ (Trainings pro Woche + Zielgewicht, nur auf dem Gerät); Essen: eine Liste mit einem „Hinzufügen“ statt Mahlzeiten
- [x] Essen: drei Nährwert-Ringe (Kohlenhydrate, Eiweiß, Fett; Richtwert 50/25/25 %) und „+“-Knopf unter dem Kalorienring
- [x] Einstellungen → Ziele: Training pro Woche, Zielgewicht, Kalorien pro Tag und eigene abhakbare Ziele
- [x] Essen: Tab „Beschreiben“ (Satz → Zutaten mit Gramm und Nährwerten, eingebaute Tabelle mit ~140 Lebensmitteln, Online-Rückfall); Rezepte von 12 auf 63, mit Suche
- [x] Übungskatalog: 207 vorgegebene Übungen (Gerät/Kurzhantel/Kabel/Smith getrennt) mit umgangssprachlichen und englischen Stichwörtern für die Suche; Datenbank-Version 48
- [x] Essen: Tabelle auf 307 Lebensmittel mit Varianten (Joghurt, Käse, Brot, Fast Food …); Suche zeigt sofort Standardwerte (offline) plus Open Food Facts; „Beschreiben“ speichert standardmäßig EINE Mahlzeit
- [x] Übungsauswahl: Filter nach Art (Kraft/Cardio) und mehreren Muskelgruppen, kombinierbar mit Suche und Kategorie
- [x] Plan: Karte „Dein Kalorienbedarf“ (Grundumsatz + Alltag + Training + Ziel, Makros) mit Auswahl Training pro Woche/Alltag direkt im Plan, Übernahme als Tagesziel; neue Frage „Alltag“
- [x] Fragen: Sport außerhalb vom Gym (Feldhockey, Tennis, … mit Häufigkeit und Dauer) fließt in den Kalorienbedarf ein; im Plan direkt einstellbar
- [x] Trainingsplan statt „Fragen“: nach dem ersten Anmelden direkt dorthin; Antworten im Konto (DB 49); Zielgewicht-Frage; neuer Plan mit Sätzen/Wiederholungsbereichen/Pausen je Ziel, Wochenvolumen, Maschinen-Varianten, Dauer-Anpassung, Progression/Entlastung
- [x] 3D-Animationen: eigene Figur (ohne fremde Modelle) mit 57 Bewegungsmustern, drehbar, Muskel hervorgehoben, Hinweise zu Ausführung und Fehlern; Übungsseite über ▶ in Auswahl, Training und Plan; Katalog 317 Übungen inkl. Sportarten (DB 50)
- [x] Muskeln sichtbar: Körpergraph mit Namen und klaren Farben, „Heute trainierst du“ im Training (Haupt-/Hilfsmuskeln), Muskelkarte auf der Übungsseite, schattierte Figur mit leuchtenden Muskelbäuchen
- [x] Schritt 74: Gewichtsvorschläge im Training (Doppelte Progression: alle Sätze im Zielbereich → nächstes Mal mehr Gewicht), Muskeltextur (Verlauf + Fasern) im Körpergraph
- [x] Schritt 75: Körpergraph-Farben umgekehrt (untrainiert hell, trainiert dunkel; Beschriftung angepasst)
- [x] Schritt 76: Übungskatalog auf 1.118 Übungen (Varianten nach Gerät/Griff/Haltung, mehr Cardio und Sport), beliebte Übungen zuerst, Bewegungsmuster-Zuordnung korrigiert (z. B. Reverse Butterfly, Kettlebell-Varianten, Schrägbank), Test „Muster passt zum Muskel“. Datenbank-Version 51 (neues SQL nötig)
- [x] Schritt 77: neue Körperfigur (Anatomie-Zeichnung hellgrau, Muskeln rot; MIT-Datensatz, THIRD_PARTY.md), Muskelgruppen-Leiste mit Mini-Figuren und Übungskarten mit Standbild in der Übungsauswahl, „Zielmuskeln“ im Detail
- [x] Schritt 78: Figur breiter/muskulöser, Muskelgruppen-Kacheln mit herangezoomtem Ausschnitt (nur eine Gruppe gleichzeitig, zuletzt gewählte gilt), Geräte-Chips (Maschine, Kabelturm, …) ganz oben statt Kategorie-Zeile, „Zurücksetzen“/Filter-Zeile entfernt
- [x] Schritt 79: Körperfigur im Lehrbuch-Look (weißer Hintergrund, nicht beanspruchte Muskeln weiß, beanspruchte in Muskelrot mit Verlauf), auch in den Muskel-Kacheln
- [x] Schritt 80: Übungskarten zeigen die Anatomie-Figur mit den beanspruchten Muskeln, Animation weiß/Muskelrot, Maschinen und Kabelzug zuerst in der Liste, Muskelgruppen-Filter nur nach Hauptmuskel
- [x] Schritt 81: Beschriftung auf der Körperfigur entfernt, kräftigere Muskelfarben (Stufen 1–5 klar unterscheidbar), Muskel-Radar mit mehr Deckkraft auf weißem Grund, Legende angepasst
- [x] Schritt 82: Animation mit Kabelturm (Rahmen, Umlenkrolle, Gewichtsblock) und Maschinen (Gewichtsblock, Hebel); Karten im hellen Design lesbar (Kartenfarbe aus dem Theme)
- [x] Schritt 83: Übungsseite wie eine Fitness-Bibliothek: Reiter Über/Statistiken/Verlauf, „Wie protokollieren?“, Trainierte Muskeln mit Primär/Sekundär, Ausrüstung, nummerierte Anleitungen
- [x] Schritt 84: Übungsfotos – Bildplätze in der App (Training, Karten, Detail; Start-/Endbild im Wechsel, sonst Animation), Bild-Aufträge für die 100 beliebtesten Übungen in docs/bild-auftraege.md
- [x] Schritt 85: Animationsfigur kräftiger (breitere Schultern, dickere Arme/Beine, kurze dunkle Haare, dunkle Shorts, graue Haut, hellgrauer Grund); Animation zeichnet nur noch, wenn sichtbar (spart Akku)
- [x] Schritt 86: Maschinen in der Animation korrigiert: Gewichtsblock steht auf der richtigen Seite (Latziehen/Rudern/Kabelzug vorn, Brustpresse/Beinstrecker hinten), schwarze Polster, Beinrolle am Beinstrecker/-beuger, Knierolle am Latzug
- [x] Schritt 87: Einstellungen als Menüliste mit Symbolen und Unterseiten (Profil, Konto, Pro, Ziele, Themen, Daten, App, FAQ, Neuigkeiten, Rechtliches)
- [x] Schritt 88: Profil mit Stärkeziel (Ring, selbst gesetztes 1RM-Ziel), Letzte 7 Tage (Körperfigur + Balken Volumen/Wdh./Cardio), Serien (Wochenkreise), Level-Karte
- [x] Schritt 89: Ränge-Reiter Galerie (Rang je Übung mit Suche) und Rechner (geschätztes 1RM aus Gewicht und Wiederholungen, Gewicht nach Prozent)
- [x] Schritt 90: Beinpresse mit Schienen, Fußplatte und Gewichtsscheiben; Butterfly als Maschine (Armpolster mit Drehachse, Gewichtsblock)
- [x] Schritt 91: Körperfigur neu gezeichnet (glatte Silhouette, eine Fläche je Muskelgruppe, nur der Kopf bleibt); Maschinen mit Führungsstangen, Abdeckplatte, Bodenschienen und Stützholm
- [x] Schritt 92: Körpergraph wieder wie vorher (Anatomie-Zeichnung); die Geräte-Verbesserungen aus Schritt 91 bleiben
- [x] Schritt 93: Essen komplett ersetzt: Ernährungscoach (Interview mit 11 Fragen, Plan nach Mifflin-St-Jeor mit Methodik) und neuer Tracker (Kalorienring, Makroringe, Wasser, 7 Tage, Tagebuch); Rezepte, Barcode, Foto-KI und Essens-Chat entfernt
- [x] Schritt 94: Gerichte mit Zutaten beim Essen: über 220 Gerichte (Frühstück, Warme Küche, Pasta, Imbiss, Suppen, Salate, Snacks) mit Zutatenliste, anpassbarer Portion und Zutaten; Nährwerte aus den Zutaten berechnet
- [x] Schritt 95: Rückmeldung nach jeder Übung („Zu leicht / Passt / Zu schwer“); der nächste Gewichtsvorschlag passt sich an (zu leicht → größerer Schritt, zu schwer → weniger); gerätelokal gespeichert
- [x] Schritt 96: Wochen-Zyklus („Woche 3 von 6“, 4–6 Wochen je Erfahrung) mit Entlastungswoche: ca. 10 % weniger Gewicht, ein Satz weniger; Zyklus-Start wird mit den Plan-Antworten im Konto gespeichert
- [x] Schritt 97: Trainingsplan-Fragebogen: „Welche Art von Übungen?“ (nur Maschinen / keine Maschinen / ohne Langhantel) und „Welche Übungen willst du nicht machen?“ (Gruppen wie alle Bankdrück-Varianten, Suchfeld); Ausschluss schlägt Wunschübung
- [x] Schritt 98: Analyse, Rechner und Bestenliste zeigen nur Übungen, die man schon gemacht hat; im Trainingsplan-Fragebogen gibt es bei jeder Auswahlfrage „Sonstiges …“ mit eigenem Text (Pflicht), Hinweise im Plan, Freitext bei Wunsch-/Ausschluss-Übungen wirkt direkt
- [x] Schritt 99: Trainings im Plan selbst zusammenstellen (Übung tauschen mit ★ oft empfohlenen Alternativen, entfernen, hinzufügen nach Muskelgruppe, zurücksetzen); Ausschlüsse/Geräte/Beschwerden gelten auch dort; „Sonstiges“ immer als letzte volle Zeile
- [x] Schritt 100: Aufklappbare Übungslisten (Trainings im Plan, Muskelgruppen beim Hinzufügen/Tauschen und im Fragebogen) und Stichwortsuche nach Körperstellen („hintere Schulter“, „Po“, „breiter Rücken“) in Training, Plan und Fragebogen
- [x] Schritt 101: Übung im laufenden Training tauschen (⇄): Alternativen für dieselbe Muskelgruppe, ★ oft empfohlen, Stichwortsuche, ausgeschlossene Übungen nicht angeboten; erledigte Sätze bleiben bei der alten Übung. Suche mit mehreren Wörtern sucht den zusammenhängenden Begriff
- [x] Schritt 102: Plan-Ansicht (Tauschen/Hinzufügen) nutzt den ganzen Katalog statt ~60 Plan-Übungen; „kein Bankdrücken“ usw. sperrt alle Varianten; „Plan übernehmen“ legt fehlende Übungen an und prüft, dass jedes Training angelegt wurde; Muskelgruppe Schultern ausgebaut (+39 Übungen: hintere, seitliche, vordere Schulter, Rotatorenmanschette), DB 52
- [x] Schritt 103: Erholungsabfrage vor dem Training (Schlaf, Energie, Muskelkater → Tagesform); bei niedriger Tagesform ein Satz weniger und ca. 10 % weniger Gewicht; überspringbar, Verlauf gerätelokal
- [x] Schritt 104: Mehrere Admins – nur der Besitzer (ältester Admin) kann im Admin-Menü beliebig viele Admins per E-Mail oder Freundescode hinzufügen und entfernen; Server prüft alles (Datenbank-Update 53)
- [x] Schritt 105: Weitere Admins haben alles aus Pro und Essen+, aber kein Admin-Menü; Admin-Menü, Shop-Freischaltung und Admin-Werkzeuge nur für den Besitzer (Datenbank-Update 54)
- [x] Schritt 106: Barcode beim Essen wieder da – Tab „Barcode“: mit der Kamera scannen oder Nummer eintippen, Nährwerte von Open Food Facts, Menge wählen
- [x] Schritt 107: Brust aufgeräumt – doppelte Übungen zusammengeführt und Namen vereinheitlicht (Verlauf bleibt), 29 neue Brust-Varianten, Geräte-Stichwörter, Suche „obere/untere Brust“ genauer, Burpees/Calisthenics nicht mehr unter Brust, Geräte-Erkennung mit Umlauten repariert (Datenbank-Update 55)
- [x] Schritt 108: Suche versteht Gerät + Muskel für alle Muskelgruppen („Maschine Brust“, „Brustmaschine“, „Kabel Rücken“, „Bauch ohne Geräte“); Rücken aufgeräumt (21 Doppel zusammengeführt, 7 umbenannt) und um 27 Übungen erweitert; Clean/Farmers Walk nicht mehr unter Rücken (Datenbank-Update 56)
- [x] Schritt 109: Foto beim Essen – Gratis-Erkennung direkt auf dem Handy (MobileCLIP, 3 Vorschläge aus Gerichten/Lebensmitteln, Foto bleibt auf dem Gerät) und genaue KI-Analyse mit Mengen für Pro (Server-Funktion food-photo)
- [x] Schritt 110: Arme aufgeräumt – 25 Doppel zusammengeführt, 14 Namen vereinheitlicht (Reverse Curls, Liegestütze enger Griff …), 23 neue Übungen (Bayesian Curls, Unterarmroller, Überkopf-Trizeps über Kreuz …), Suche Griffkraft/Brachialis/langer Trizepskopf genauer (Datenbank-Update 57)
- [x] Schritt 111: Freunde-Seite im Aufbau der Home-Seite – Wochen-Zusammenfassung oben, 4 Kacheln (Freunde, Platz, Trainings, Anfragen), Anfragen-Karte, großer Knopf „Freunde einladen“, Abschnitte Rangliste → Challenges → Deine Freunde
- [x] Schritt 112: Beine, Po, Waden und Bauch aufgeräumt – 38 Doppel zusammengeführt, 21 Namen vereinheitlicht (Schlittenschieben, Toes to Bar, Cable Crunches …), 28 neue Übungen (Pendulum/Belt Squat, Glute Ham Raise, Copenhagen Plank …), Hauptmuskeln korrigiert, Suche „unterer Bauch“ genauer (Datenbank-Update 58)
- [x] Schritt 113: Übungsanimationen realistischer – Maschinen als echte Studiogeräte (Rahmen aus Stahlrohr, Polster, Gewichtsblock mit Führungsstangen, Rollen und Kabel), 17 neue Geräte (Smith-Maschine, Hackenschmidt, Wadenmaschine, Abduktoren, Bauchmaschine …), Figur mit Haut, Shirt, Shorts und Schuhen, Langhantel mit echten Scheiben; die Übungskarten zeigen die Übung schon als bewegtes Bild (Standbild bei „Bewegung reduzieren“)
- [x] Schritt 114: Bilder für alle 225 Gerichte – gezeichnete Teller aus den Zutaten (Reis, Nudeln, Brokkoli, Hähnchen …), eigene Formen für Pizza, Burger, Suppen, Wraps, Getränke und Süßes; im Admin-Menü kann der Besitzer echte Fotos hochladen, die dann alle sehen (Datenbank-Update 59)
- [ ] Foto-KI einrichten (**Lukas**): Funktion anlegen, Secrets `ANTHROPIC_API_KEY` und `FOOD_MODEL` eintragen (siehe supabase/functions/food-photo/README.md)
- [ ] Onboarding nach der Registrierung + Pro-Abo/Bezahlseite (Demo zur Abstimmung)
- [x] Nach der Registrierung: Seite „Schau in dein Postfach“ mit „E-Mail erneut senden“
- [ ] Eigene Domain + E-Mail-Versand (SMTP) in Supabase, deutsche E-Mail-Vorlagen (**Lukas**: Domain kaufen)

## Phase 7 – Veröffentlichung

## Phase 8 – Einnahmen
- [ ] Belohnte Werbung (AdMob) mit Einwilligung (DSGVO) und ATT auf iOS
- [ ] **Pro-Abo** (In-App-Kauf über Apple/Google, verwaltet z. B. mit RevenueCat)
  - Grundsatz: Trainieren, Statistiken und Freunde bleiben kostenlos – Pro ist ein Extra
  - Ideen für Pro: exklusive Looks/Farbschemata/Titel, Pro-Abzeichen, erweiterte Statistiken
    (Monats-/Jahresberichte, Export), mehr gleichzeitige Challenges, keine Werbung (sobald es Werbung gibt)
  - Preis-Idee (zu entscheiden): ca. 2,99–4,99 €/Monat, Jahresabo mit Rabatt, kostenlose Testwoche
  - Technik: Kauf in der App → RevenueCat → Webhook an Supabase setzt `pro_until`; Server prüft Pro-Funktionen
  - Pflichten: „Käufe wiederherstellen“-Knopf, Abo-Bedingungen in Nutzungsbedingungen/Store, Kündigung über Apple/Google
  - Voraussetzung: Entwickler-Konten, Steuer- und Bankdaten bei Apple/Google hinterlegt (**Lukas**)
