import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization for server-side routes
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Check both VITE_ and NEXT_PUBLIC_ prefixes for compatibility
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Faltan variables SUPABASE_URL / SUPABASE_ANON_KEY (con prefijo NEXT_PUBLIC_ o VITE_)');
  }

  supabaseInstance = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

// Export a getter function instead of direct instance
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
