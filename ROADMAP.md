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
- [ ] Profile (Name, Avatar, Level, Serie, Körpergraph, Rekorde)
- [ ] Freunde per Link/Code einladen, Freundschaftsanfragen
- [ ] Feed, Likes, Kommentare
- [ ] Ranglisten (Freunde, pro Übung, pro Woche), Challenges
- [ ] Privatsphäre-Einstellungen, Melden & Blockieren (Apple-Pflicht bei Nutzerinhalten)

## Phase 4 – Shop
- [ ] Designs, Körpergraph-Skins, Avatar-Items mit Credits kaufen (serverseitig geprüft)

## Phase 5 – Native Apps (Capacitor)
- [ ] iOS- und Android-Projekt, Builds (iOS über Cloud-Mac, z. B. GitHub Actions oder Codemagic)
- [ ] Push-Nachrichten, Pause-Timer-Benachrichtigung, Apple Health / Health Connect

## Phase 6 – Veröffentlichung vorbereiten
- [ ] Apple Developer Program (99 USD/Jahr) und Google Play Console (25 USD einmalig) (**Lukas**)
- [ ] Datenschutzerklärung, Impressum, Nutzungsbedingungen
- [ ] Store-Einträge, Screenshots, Datenschutz-Angaben, Altersfreigabe
- [ ] Testphase: TestFlight bzw. geschlossener Test (Google: 12 Tester, 14 Tage für neue private Konten)

## Phase 7 – Veröffentlichung

## Phase 8 – Einnahmen
- [ ] Belohnte Werbung (AdMob) mit Einwilligung (DSGVO) und ATT auf iOS
- [ ] Premium-Abo (In-App-Kauf, z. B. über RevenueCat)
