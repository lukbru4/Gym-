// Supabase-Projekt „Level-up“ (Dashboard → Project Settings → API Keys).
//   SUPABASE_URL      = "Project URL"
//   SUPABASE_ANON_KEY = "anon public" Key (darf öffentlich sein, die Daten schützt Row Level Security)
// Niemals den service_role-/Secret-Key hier eintragen!
// Mit VITE_BACKEND=local wird ohne Konto im Browser gespeichert (z. B. für Tests).
export const SUPABASE_URL = 'https://msyudbdzsmajdhbptfxw.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeXVkYmR6c21hamRoYnB0Znh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODI4MTYsImV4cCI6MjEwNjM1ODgxNn0.Pr_p3PPOSApSzm_xw3L5T-RmUZTNMDZLheEuiPjidBs';
export const USE_CLOUD = import.meta.env.VITE_BACKEND !== 'local';
