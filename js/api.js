import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Sind Supabase-Zugangsdaten eingetragen, speichert die App in der Cloud (mit Login),
// sonst lokal im Browser.
export const isCloudConfigured =
  !SUPABASE_URL.includes('DEIN-PROJEKT') && !SUPABASE_ANON_KEY.includes('DEIN-ANON-KEY');

export async function createBackend() {
  if (isCloudConfigured) {
    const { create } = await import('./backend-supabase.js');
    return create(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  const { create } = await import('./backend-local.js');
  return create();
}
