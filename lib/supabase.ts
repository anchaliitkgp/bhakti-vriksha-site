// SERVER-ONLY: never import from client components.
// This module uses the Supabase service-role key, which bypasses RLS and
// must never be shipped to the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.startsWith("REPLACE_ME")) {
    throw new Error(
      "supabaseServer: NEXT_PUBLIC_SUPABASE_URL is not set or is still a placeholder. " +
        "Fill it in .env.dev.local (for local dev) or Vercel env vars (for prod)."
    );
  }
  if (!serviceKey || serviceKey.startsWith("REPLACE_ME")) {
    throw new Error(
      "supabaseServer: SUPABASE_SERVICE_ROLE_KEY is not set or is still a placeholder. " +
        "Fill it in .env.dev.local (for local dev) or Vercel env vars (for prod)."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
