# Level Up – Roadmap zum App Store & Google Play

Ziel: Level Up als iOS- und Android-App veröffentlichen – mit Konten, Freunden, Shop und Gamification.

## Phase 1 – Konten & Credits auf dem Server
- [x] Konto löschen in der App (Apple-Pflicht) – `delete_my_account()` in `supabase/schema.sql`
- [x] Credits serverseitig berechnen – `credits_earned()` / `my_credits()`, gleiche Regeln wie `js/xp.js`
- [x] Lokale Daten ins Konto übertragen (abbruchsicher, keine Doppelten)
- [x] Lokaler Modus: „Alle Daten löschen“
- [x] Menü ☰ oben rechts: Konto & Einstellungen (Konto, Stil, App-Update), Backup, Abmelden
- [x] Supabase-Projekt anlegen und `js/config.js` eintragen
- [ ] Anmelden mit Apple & Google (braucht Apple-Developer-Konto bzw. Google-Cloud-Projekt)

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
- [ ] Pages auf „GitHub Actions“ umstellen (**Lukas**, Anleitung im Chat) – danach ist die React-Version live
- [ ] Alte App im Hauptordner entfernen, sobald die React-Version live läuft
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
- [ ] Neues SQL (Challenges + Kommentare) in Supabase ausführen (**Lukas**)
- [ ] Meldungen regelmäßig prüfen (Supabase → Table Editor → reports) (**Lukas**)

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
- [ ] Datenschutzerklärung, Impressum, Nutzungsbedingungen
- [ ] Store-Einträge, Screenshots, Datenschutz-Angaben, Altersfreigabe
- [ ] Testphase: TestFlight bzw. geschlossener Test (Google: 12 Tester, 14 Tage für neue private Konten)

## Phase 7 – Veröffentlichung

## Phase 8 – Einnahmen
- [ ] Belohnte Werbung (AdMob) mit Einwilligung (DSGVO) und ATT auf iOS
- [ ] Premium-Abo (In-App-Kauf, z. B. über RevenueCat)
