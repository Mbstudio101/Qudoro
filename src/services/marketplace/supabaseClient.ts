import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseSingleton: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseSingleton) return supabaseSingleton;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

  if (!url || !publishableKey) {
    return null;
  }

  supabaseSingleton = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseSingleton;
};
