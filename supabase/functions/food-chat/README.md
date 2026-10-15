# Essens-Assistent (Edge Function `food-chat`)

Der Nutzer schreibt, was er gegessen hat; die KI fragt nach (Menge, Größe, Zubereitung …) und schlägt am Ende Einträge mit Kalorien und Nährwerten vor.
Nur mit Pro, höchstens 60 Nachrichten pro Tag und Nutzer. Der KI-Schlüssel steht nur als Secret auf dem Server.

## Einrichten (einmalig, im Browser bei Supabase) – ist ausgeschaltet, bis du das machst

1. **SQL-Update einspielen** (SQL Editor → `supabase/schema.sql` → Run). Version 47 oder neuer.
2. **Funktion anlegen:** Edge Functions → *Deploy a new function* → *Via Editor* → Name genau `food-chat` → den gesamten Inhalt von `index.ts` einfügen → *Deploy*.
3. **Secrets:** Es gelten dieselben wie bei `food-photo` (`ANTHROPIC_API_KEY`, `FOOD_MODEL`). Optional `FOOD_CHAT_DAILY_LIMIT` (Standard 60).
4. **In der App einschalten:** In `web/src/data/config.ts` `FOOD_CHAT_ENABLED` auf `true` setzen und eine neue App-Version veröffentlichen.
   Zum Ausprobieren ohne neue Version: im Browser `localStorage` „gym-tracker-food-chat“ auf „1“ setzen.

## Kosten und Datenschutz

- Jede Nachricht kostet eine kleine Gebühr bei Anthropic (abhängig vom Modell; Text ist günstiger als Fotos). Das Tageslimit begrenzt die Kosten pro Nutzer.
- Der Chattext wird nur zur Auswertung übertragen und nicht bei uns gespeichert. Die App fragt vor dem ersten Mal um Einverständnis. In der Datenschutzerklärung muss der KI-Dienst stehen.
