import { createClient as rawClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Public client for static pages & ISR data fetching.
 * Does NOT call cookies(), allowing Next.js to cache static HTML on Vercel CDN.
 */
export function createPublicClient() {
  return rawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
