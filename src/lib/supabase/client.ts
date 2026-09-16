import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export const getSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

export const getSupabaseAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured = () =>
  getSupabaseUrl().length > 0 && getSupabaseAnonKey().length > 0;

/** Browser/anon client. Demo backend allows requests without user login. */
export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return browserClient;
};
