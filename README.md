# 🏋️ Level Up – Gym Tracker

Trainings-App mit Spiel-Elementen und Freunden: Trainings erfassen, Fortschritt sehen, Level, Ränge,
Aufgaben, Credits, Shop, Challenges und Ranglisten mit Freunden.

- **Web-App (zum Installieren auf dem Handy):** https://lukbru4.github.io/Gym-/
- **Native Apps:** iOS und Android über Capacitor (Ordner `web/ios`, `web/android`)
- **Plan bis zum App Store / Google Play:** [ROADMAP.md](ROADMAP.md)

## Funktionen (Auswahl)

- **Training:** Vorlagen (z. B. Push/Pull), Live-Training mit Abhaken, „Vorherig“-Werten, Aufwärmsätzen, Pause-Timer
  (in der App auch als Benachrichtigung bei gesperrtem Handy), Kraft und Cardio, Notizen.
- **Auswertung:** Begrüßung mit Wochen-/Monatsrückblick, Wochenstatistik, Fortschritt pro Übung (geschätztes 1RM),
  Rekorde, Körpergewicht, Neon-Körpergraph und Muskel-Radar.
- **Spiel:** Credits und Level, Ränge pro Übung (Bronze → Titan), tägliche/wöchentliche Aufgaben, Medaillen, Serie.
- **Freunde:** Freundescode/Einladungslink, Feed mit Anfeuern und Kommentaren, Ranglisten (gesamt, Woche, pro Übung),
  7-Tage-Challenges, Melden und Blockieren, Sichtbarkeit privat/Freunde.
- **Shop:** Körpergraph-Looks, Avatar-Accessoires, Titel und Farbschemata gegen Credits – jeder Kauf wird auf dem Server geprüft.
- **Stil:** Farbschemata, eigene Akzentfarbe, Hell/Dunkel nach eigener Uhrzeit, wie Gerät oder fest.
- **Konto:** Anmeldung nur mit E-Mail und Passwort; Konto löschen in der App; ohne Konto lokaler Modus mit Backup.

## Aufbau

| Ordner / Datei | Inhalt |
|---|---|
| `web/` | Die App: React + TypeScript + Vite |
| `web/src/pages/` | Seiten (Home, Training, Ränge, Freunde, Profil, Shop, Konto …) |
| `web/src/lib/` | Rechenlogik ohne Oberfläche (Statistik, Credits, Ränge, Rückblick, Farben …) – mit Unit-Tests in `web/tests/` |
| `web/src/data/` | Speicher: lokal (Browser) oder Supabase (Cloud), Freunde-/Shop-Funktionen |
| `web/public/` | Icons, Service Worker, Rechtstexte (`datenschutz.html`, `nutzungsbedingungen.html`, `impressum.html`) |
| `web/ios`, `web/android` | Native Projekte (Capacitor) |
| `supabase/schema.sql` | Datenbank: Tabellen, Zugriffsregeln, Server-Funktionen (wiederholt ausführbar) |
| `supabase/einrichten.html` | Seite zum bequemen Kopieren des SQL (auch vom Handy) |
| `.github/workflows/` | `ci.yml` (Prüfungen), `pages.yml` (Web-App veröffentlichen), `native.yml` (iOS-/Android-Builds) |

## Datenbank aktualisieren (Supabase)

Nach Änderungen an `supabase/schema.sql` das Skript einmal im Supabase-Dashboard ausführen:

1. https://lukbru4.github.io/Gym-/supabase/einrichten.html öffnen und den Code kopieren.
2. Supabase → Projekt → **SQL Editor** → **New query** → einfügen → **Run**.

Das Skript löscht keine vorhandenen Daten. In die App gehört nur der **anon public** Key –
niemals der service_role-/Secret-Key oder das Datenbank-Passwort.

## Entwickeln

```bash
cd web
npm install
npm run dev        # Entwicklungsserver
npm test           # Unit-Tests (Vitest)
npm run typecheck  # TypeScript prüfen
npm run build      # Produktions-Build nach web/dist
VITE_BACKEND=local npx vite build   # Variante ohne Konto (nur Browser-Speicher)
```

Native Apps: `npx vite build && npx cap sync` – gebaut wird in der Cloud über `native.yml`
(Android-Test-APK als Download unter Actions → Lauf → Artifacts; iOS als Simulator-Build).

## Technik

React 19, TypeScript, Vite, Chart.js, Supabase (Postgres mit Row Level Security und Server-Funktionen), Capacitor 8.
