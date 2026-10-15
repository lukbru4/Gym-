# Store-Einträge (Entwurf, Deutsch)

> Entwurf zum Kopieren in App Store Connect bzw. Google Play Console. Zeichenlimits stehen dabei.
> Vor dem Einreichen prüfen: Preise/Abo erst erwähnen, wenn es sie gibt. Alles in [Klammern] ausfüllen.

## Grunddaten
| Feld | Wert |
|---|---|
| App-Name (Apple ≤ 30, Google ≤ 30) | **Level Up – Gym Tracker** |
| Untertitel (nur Apple, ≤ 30) | **Trainieren, leveln, gewinnen** |
| Kurzbeschreibung (nur Google, ≤ 80) | **Trainingstagebuch mit Leveln, Rängen und Freunden – Fortschritt, der Spaß macht.** |
| Kategorie | Gesundheit & Fitness (zweite: Sport) |
| Bundle-ID / Paketname | com.lukbru4.levelup |
| Support-URL | https://lukbru4.github.io/Gym-/ (später eigene Domain) |
| Datenschutz-URL | https://lukbru4.github.io/Gym-/datenschutz.html |
| Kontakt-E-Mail | [Kontakt-E-Mail] |
| Preis | Kostenlos |

## Werbetext (nur Apple, ≤ 170, jederzeit änderbar)
Jedes Training zählt: Sammle Credits, steig im Level auf und miss dich mit deinen Freunden – in Challenges und Ranglisten.

## Beschreibung (≤ 4000)
Level Up macht dein Training zum Spiel – ohne dass du auf ein ordentliches Trainingstagebuch verzichten musst.

TRAINIEREN
• Vorlagen wie „Push“, „Pull“ und „Beine“ mit einem Tipp starten
• Sätze abhaken, Werte vom letzten Mal direkt daneben sehen
• Pause-Timer mit Benachrichtigung – auch bei gesperrtem Handy
• Kraft und Cardio, Aufwärmsätze, Notizen

FORTSCHRITT SEHEN
• Begrüßung mit deinem Wochen- und Monatsrückblick: Trainings, bewegtes Gewicht, neue Bestwerte
• Körpergraph: Deine trainierten Muskeln leuchten – je stärker du wirst, desto heller
• Fortschritt pro Übung mit geschätztem Maximalgewicht (1RM), Rekorde, Körpergewicht

LEVELN
• Credits für jedes Training, jeden Satz und jeden Rekord
• Ränge pro Übung von Bronze bis Titan
• Tägliche und wöchentliche Aufgaben, Medaillen und Wochenserie

MIT FREUNDEN
• Freunde per Code oder Einladungslink hinzufügen
• Feed mit „Anfeuern“ und Kommentaren
• Ranglisten: gesamt, pro Woche und pro Übung
• 7-Tage-Challenges: Wer schafft mehr Trainings, Sätze oder Volumen?
• Du bestimmst, was deine Freunde sehen. Melden und Blockieren jederzeit möglich.

SHOP
• Tausch deine Credits gegen Farbschemata, Looks für den Körpergraph, Avatar-Accessoires und Titel
• Farbschemata vorher mit 👁 in der ganzen App ansehen

DATENSCHUTZ
• Keine Werbung, kein Tracking, kein Verkauf von Daten
• Konto und alle Daten jederzeit in der App löschbar

Level Up ersetzt keine ärztliche Beratung. Werte wie das geschätzte 1RM sind Schätzungen.

## Schlüsselwörter (nur Apple, ≤ 100 Zeichen, kommagetrennt, ohne Leerzeichen)
gym,fitness,krafttraining,trainingsplan,workout,tracker,fitnessstudio,1rm,muskel,freunde,challenge

## Screenshots
Liegen in `store/screenshots/` (mit Beispieldaten):
- `ios-6.9/` – 1320 × 2868 px (App Store, iPhone 6,9")
- `android/` – 1080 × 2340 px (Google Play, Telefon)

Reihenfolge: 1 Home mit Rückblick · 2 Training · 3 Körpergraph · 4 Ränge · 5 Freunde & Challenges · 6 Feed · 7 Shop.
Hinweis: Welche iPhone-Größen Apple genau verlangt, ändert sich gelegentlich – beim Hochladen in App Store Connect prüfen.

## Altersfreigabe (Fragebogen – voraussichtliche Antworten)
- Gewalt, Sex, Drogen, Glücksspiel: **keine**
- **Nutzer-generierte Inhalte**: ja (Namen, Kommentare unter Freunden) → Melden, Blockieren, Wortfilter vorhanden
- Unbeschränkter Internetzugang (Browser): nein
- Ergebnis voraussichtlich: Apple 12+ (wegen Nutzerinhalten), Google: „USK ab 12“ bzw. IARC-Fragebogen ausfüllen
- Mindestalter laut Nutzungsbedingungen: 16

## Datenschutz-Angaben
### Apple „App Privacy“ (Datenschutz-Etiketten)
Tracking: **Nein**. Mit der Identität verknüpfte Daten, nur für App-Funktionen:
- Kontaktinformationen: E-Mail-Adresse
- Gesundheit & Fitness: Fitness (Trainings), Gesundheit (Körpergewicht)
- Nutzerinhalte: andere Nutzerinhalte (Kommentare, Anzeigename)
- Kennungen: Benutzer-ID
Nicht erhoben: Standort, Kontakte, Zahlungsdaten, Browserverlauf, Werbedaten, Diagnosedaten.

### Google „Datensicherheit“
- Daten erhoben: E-Mail-Adresse; Gesundheits- und Fitnessdaten; Nutzerinhalte (Kommentare); Nutzer-IDs
- Daten geteilt: **Nein** (Dienstleister wie Supabase gelten als Auftragsverarbeiter, nicht als „Teilen“)
- Verschlüsselt übertragen: Ja
- Löschung möglich: Ja, in der App (Konto löschen) – zusätzlich Lösch-URL angeben: [URL, z. B. Seite mit Anleitung]

## Prüfer-Hinweise (App Review)
- Test-Konto anlegen und hier eintragen: E-Mail [Test-Konto] / Passwort [Test-Passwort] (mit ein paar Trainings und einem Freund)
- „Konto löschen“: ☰ → Konto & Einstellungen → Konto löschen
- Nutzerinhalte: Melden/Blockieren im Freundesprofil und bei Kommentaren, Moderation im Admin-Menü
