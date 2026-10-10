// Supabase-Projekt „Level-up“ (Dashboard → Project Settings → API Keys).
//   SUPABASE_URL      = "Project URL"
//   SUPABASE_ANON_KEY = "anon public" Key (darf öffentlich sein, die Daten schützt Row Level Security)
// Niemals den service_role-/Secret-Key hier eintragen!
// Mit VITE_BACKEND=local wird ohne Konto im Browser gespeichert (z. B. für Tests).
export const SUPABASE_URL = 'https://msyudbdzsmajdhbptfxw.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeXVkYmR6c21hamRoYnB0Znh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODI4MTYsImV4cCI6MjEwNjM1ODgxNn0.Pr_p3PPOSApSzm_xw3L5T-RmUZTNMDZLheEuiPjidBs';
export const USE_CLOUD = import.meta.env.VITE_BACKEND !== 'local';

/** Muss zu public.schema_version() am Ende von supabase/schema.sql passen (ein Test prüft das).
 *  Ist die Datenbank älter, zeigt die App dem Admin „Datenbank-Update nötig“. */
export const SCHEMA_VERSION = 51;

/** Foto-Auswertung beim Essen (KI): erst einschalten (true), wenn die Server-Funktion „food-photo“ eingerichtet ist
 *  (supabase/functions/food-photo/README.md). Zum Ausprobieren ohne neue App-Version: im Browser
 *  localStorage „gym-tracker-food-photo“ auf „1“ setzen. */
export const FOOD_PHOTO_ENABLED = false;
export function foodPhotoEnabled(): boolean {
  if (FOOD_PHOTO_ENABLED) return true;
  try {
    return localStorage.getItem('gym-tracker-food-photo') === '1';
  } catch {
    return false;
  }
}

/** Essens-Chat (KI fragt nach, was gegessen wurde): erst einschalten (true), wenn die Server-Funktion „food-chat“ eingerichtet ist
 *  (supabase/functions/food-chat/README.md). Zum Ausprobieren: localStorage „gym-tracker-food-chat“ auf „1“ setzen. */
export const FOOD_CHAT_ENABLED = false;
export function foodChatEnabled(): boolean {
  if (FOOD_CHAT_ENABLED) return true;
  try {
    return localStorage.getItem('gym-tracker-food-chat') === '1';
  } catch {
    return false;
  }
}
