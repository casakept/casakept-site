import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Anon-key Supabase client for reading public catalog data (services,
 * membership_plans, cocina_menu_items, etc.) from Server Components that
 * must stay statically prerenderable. Deliberately does not read
 * cookies()/headers() like the cookie-based server client in server.ts --
 * using that here would make the whole route dynamic even though this
 * data has no per-user auth dependency.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
