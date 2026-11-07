import type { Backend } from './backend';
import { SUPABASE_ANON_KEY, SUPABASE_URL, USE_CLOUD } from './config';

/** Cloud (Supabase, mit Login) oder lokal im Browser – je nach Build-Einstellung. */
export async function createBackend(): Promise<Backend> {
  if (USE_CLOUD) {
    const { create } = await import('./supabase');
    return create(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  const { create } = await import('./local');
  return create();
}
