import { createClient } from "@supabase/supabase-js";

// An unauthenticated client for public profile pages.
// Uses only the publishable key: Row Level Security still applies.
// No owner session cookies are sent to the database.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
