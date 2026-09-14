import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client — bypasses RLS entirely. Never import this
 * from client code or expose the key to the browser.
 *
 * Per the RLS convention documented in
 * supabase/migrations/20260914015515_rls_policies.sql, tables that record
 * money/entitlements (subscriptions, entitlement_usage, payments) are
 * normally written by trusted backend code rather than the end user's own
 * session, since the correct values (price, coverage, period dates) must be
 * computed server-side and are not something the customer's RLS-scoped
 * session should be able to write directly. Use this client only after the
 * calling Server Action has already authenticated the user and validated
 * ownership of whatever it's about to write.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
