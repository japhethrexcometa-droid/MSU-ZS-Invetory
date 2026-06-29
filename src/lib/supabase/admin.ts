import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// This client uses the service_role key and should ONLY be used in server-side code
// (API routes, server actions, etc.) — NEVER on the client/browser.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. " +
      "Get it from Supabase Dashboard → Project Settings → API → service_role key"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
