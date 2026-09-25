# 🏋️ Gym Tracker

Eine Web-App, mit der du deine Trainings im Gym erfassen und auswerten kannst. Sie ist fürs Handy gebaut und lässt sich dort auch wie eine App installieren.

## Schnellstart: eine einzige HTML-Datei

Lade [`gym-tracker.html`](gym-tracker.html) herunter und öffne sie im Browser. Mehr ist nicht nötig.
Die Datei enthält die komplette App. Beim ersten Öffnen braucht sie Internet, um die Diagramm-Bibliothek zu laden.

## Zwei Speicher-Modi

| | **Lokal** (Standard) | **Cloud** (Supabase) |
|---|---|---|
| Einrichtung | keine | Supabase-Projekt anlegen, 2 Werte eintragen |
| Login | nein | ja, E-Mail und Passwort, mehrere Nutzer |
| Daten liegen | nur in diesem Browser | in deiner Supabase-Datenbank |
| Sync Handy ↔ PC | nur per Backup-Datei | automatisch |
| Sicherung | **Backup** oben rechts: als JSON exportieren und importieren | übernimmt Supabase |

Die App wählt den Modus selbst. Sind Supabase-Zugangsdaten eingetragen, speichert sie in der Cloud, sonst lokal.
Hinweis: Lokale Daten werden beim Umstieg auf die Cloud nicht automatisch übernommen.

**Funktionen**

- **Workouts (Vorlagen).** Speichere Workouts wie „Push“ und „Pull“ und starte sie mit einem Tipp. Die Startvorlagen Push & Pull lassen sich auf der Seite „Workouts“ mit einem Klick anlegen.
- **Live-Training.** Sätze abhaken (✓), Spalte „Vorherig“ mit den Werten vom letzten Mal und Aufwärmsätze („A“, antippen zum Umschalten).
- **Werte übernehmen.** Leere Felder übernehmen beim Abhaken den Vorschlag. Nach dem Training kann die Vorlage die Werte von heute übernehmen.
- **Pause-Timer.** Nach jedem abgehakten Satz startet die Pause, mit Ton und Vibration am Ende. Die Standard-Pause stellst du auf der Seite „Workouts“ ein, eine eigene Pause pro Übung in der Vorlage oder im Training.
- **Körpergraph.** Die Körper-Silhouette von vorne und hinten zeigt pro Muskel eine Kraft-Stufe von 1 bis 5. Die Stufe gibt an, wie stark dein geschätztes 1RM seit dem ersten Training gestiegen ist. Die Formel steht in der App.
- **Ohne Einrichtung nutzbar.** Im lokalen Modus liegen die Daten im Browser, mit Backup-Export und -Import.
- **Login im Cloud-Modus.** Mehrere Personen können sich registrieren. Jede Person sieht nur ihre eigenen Daten.
- **Krafttraining.** Pro Übung trägst du Sätze mit Wiederholungen und Gewicht ein. Komma und Punkt funktionieren beide, z. B. `62,5`.
- **Cardio.** Pro Eintrag gibst du Dauer in Minuten und Distanz in km an.
- **Übungsliste.** Gängige Übungen sind vorgegeben, eigene legst du direkt beim Eintragen an.
- **Notizen.** Zu jedem Training kannst du einen Freitext speichern.
- **Entwurf.** Ein angefangenes Training bleibt erhalten, wenn du die Seite neu lädst oder schließt.
- **Wochenübersicht.** Trainings, Volumen, Cardio-Minuten und aktuelles Körpergewicht, dazu Diagramme der letzten 8 Wochen.
- **Verlauf.** Alle Trainings mit Detailansicht. Du kannst sie bearbeiten und löschen.
- **Fortschritt pro Übung.** Das Diagramm zeigt das geschätzte 1RM nach der Epley-Formel und den schwersten Satz, bei Cardio Dauer und Distanz. Alle Werte gibt es auch als Tabelle.
- **Persönliche Rekorde.** Pro Übung: schwerster Satz, bestes geschätztes 1RM und meistes Volumen in einem Training. Bei Cardio: längste Dauer und weiteste Distanz.
- **Körpergewicht.** Ein Eintrag pro Tag, mit Verlaufsdiagramm.
- **Hell- und Dunkelmodus.** Richtet sich nach der Einstellung deines Geräts.

**Technik:** HTML, CSS und JavaScript ohne Build-Schritt. Für Login und Datenbank nutzt die App [Supabase](https://supabase.com), für die Diagramme [Chart.js](https://www.chartjs.org).

## Einrichtung des Cloud-Modus (optional)

> **Update von einer älteren Version:** Führe `supabase/schema.sql` einfach erneut aus. Das Skript ergänzt die neuen Spalten und Tabellen (Vorlagen, Muskeln, Aufwärmsätze), ohne vorhandene Daten zu löschen.

### 1. Supabase-Projekt anlegen

1. Registriere dich kostenlos auf [supabase.com](https://supabase.com) und lege ein neues Projekt an.
2. Öffne im Dashboard den **SQL Editor**. Kopiere den gesamten Inhalt von [`supabase/schema.sql`](supabase/schema.sql) hinein und klicke auf **Run**.
   Damit entstehen die Tabellen, die Zugriffsregeln (Row Level Security) und die vorgegebenen Übungen.
3. Öffne **Project Settings → API** und kopiere zwei Werte: die **Project URL** und den **anon public** Key.

### 2. App konfigurieren

Trage die beiden Werte in [`js/config.js`](js/config.js) ein und führe danach `npm run build` aus, damit auch `gym-tracker.html` sie enthält.
Wenn du nur die Einzeldatei nutzt, kannst du die Werte stattdessen direkt in `gym-tracker.html` ändern. Suche dort nach `SUPABASE_URL`.

```js
export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Der `anon`-Key darf öffentlich im Code stehen. Deine Daten schützen die Row Level Security-Regeln aus `schema.sql`.
Den **`service_role`-Key** darfst du dagegen **niemals** eintragen.

### 3. Online stellen mit GitHub Pages

1. Öffne auf GitHub im Repository **Settings → Pages** und wähle unter **Source** den Eintrag **GitHub Actions**.
2. Pushe auf den Branch `main`. Der Workflow `.github/workflows/pages.yml` führt dann zuerst die Tests aus und veröffentlicht danach die Seite.
3. Die Adresse der Seite steht anschließend in **Settings → Pages**.

### 4. Login-Weiterleitung in Supabase eintragen

Supabase verschickt nach der Registrierung standardmäßig eine Bestätigungs-E-Mail. Damit der Link darin zu deiner Seite führt:
Öffne **Authentication → URL Configuration** und trage die Adresse deiner GitHub-Pages-Seite als **Site URL** ein. Zusätzlich gehört sie unter **Redirect URLs**.

### Auf dem Handy installieren

Öffne die Seite im Browser. Auf dem iPhone wählst du in Safari **Teilen → Zum Home-Bildschirm**, auf Android in Chrome **Menü → App installieren** bzw. **Zum Startbildschirm hinzufügen**.

> Die App-Oberfläche lädt auch offline. Zum Laden und Speichern der Trainings braucht die App aber Internet.
> Ein angefangenes Training bleibt trotzdem als Entwurf auf dem Gerät gespeichert.

## Lokal starten

```bash
npm start      # startet einen lokalen Webserver (npx serve)
npm test       # testet Rechenlogik und lokalen Speicher
npm run build  # erzeugt gym-tracker.html neu (vorher einmal: npm install)
```

Alternativ geht auch `python3 -m http.server`. Die Seite muss über einen Webserver laufen, nicht per `file://`, weil sie ES-Module nutzt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, Navigation |
| `css/style.css` | Styles (mobile-first, Hell/Dunkel) |
| `js/app.js` | Routing und alle Ansichten |
| `js/api.js` | Wählt den Speicher: lokal oder Cloud |
| `js/backend-local.js` | Lokaler Speicher im Browser inkl. Backup |
| `js/backend-supabase.js` | Cloud-Speicher über Supabase (Login, Datenbank) |
| `js/stats.js` | Reine Rechenfunktionen (getestet in `tests/`) |
| `js/muscles.js` | Muskelgruppen, Kraft-Stufe, Körpergraph (SVG) |
| `js/timer.js` | Pause-Timer und Standard-Pause |
| `js/starter-templates.js` | Startvorlagen Push & Pull |
| `js/config.js` | Supabase-Zugangsdaten |
| `supabase/schema.sql` | Datenbankschema, Zugriffsregeln, Standardübungen |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Installierbare App (PWA) |
| `gym-tracker.html` | Einzeldatei-Version, erzeugt von `scripts/build-single.mjs` |
