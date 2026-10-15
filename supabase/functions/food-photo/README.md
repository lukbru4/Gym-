# Foto-KI fürs Essen (Edge Function `food-photo`)

Schätzt aus einem Foto Gericht, Menge und Nährwerte. Nur mit Pro, höchstens 20 Fotos pro Tag und Nutzer.
Der KI-Schlüssel steht **nur** hier auf dem Server (Secret), nie in der App.

## Einrichten (einmalig, im Browser bei Supabase)

1. **SQL-Update einspielen** (SQL Editor → `supabase/schema.sql` einfügen → Run). Es muss Version 45 oder neuer sein.
2. **Funktion anlegen:** Edge Functions → *Deploy a new function* → *Via Editor* → Name genau `food-photo` →
   den gesamten Inhalt von `index.ts` einfügen → *Deploy*. (Die Datei ist in sich vollständig; `parse.ts` ist nur die getestete Vorlage für den eingefügten Teil.)
3. **Geheimnisse eintragen:** Edge Functions → *Secrets* → hinzufügen:
   - `ANTHROPIC_API_KEY` – dein Schlüssel von console.anthropic.com (Zahlungsmethode dort hinterlegen)
   - `FOOD_MODEL` – der Name des KI-Modells (günstig und für Bilder geeignet; siehe die Modellliste bei Anthropic)
   - optional `FOOD_AI_DAILY_LIMIT` – Fotos pro Nutzer und Tag (Standard 20)
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase der Funktion selbst bereit – die musst du nirgends eintragen oder weitergeben.
4. **Testen:** In der App als Admin oder Pro-Nutzer: Profil → Essen → Hinzufügen → Foto.

## Kosten und Datenschutz

- Jedes Foto kostet eine kleine Gebühr bei Anthropic (abhängig vom Modell). Das Tageslimit begrenzt die Kosten pro Nutzer.
- Das Foto wird in der App auf höchstens 1024 Pixel verkleinert, nur zur Auswertung übertragen und **nicht gespeichert**. In der Datenschutzerklärung muss der KI-Dienst stehen.
