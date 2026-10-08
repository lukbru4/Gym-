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
