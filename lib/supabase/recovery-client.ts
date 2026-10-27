"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Password recovery uses a dedicated PKCE storage key in localStorage. The
// SSR browser client stores auth state in cookies; using a separate client here
// keeps the one-time PKCE verifier available when the email link returns.
let recoveryClient: SupabaseClient | null = null;

export function createRecoveryClient() {
  if (typeof window === "undefined") {
    throw new Error("The recovery client can only be created in a browser.");
  }

  if (!recoveryClient) {
    recoveryClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          flowType: "pkce",
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: true,
          storageKey: "dt-recovery-auth",
        },
      },
    );
  }

  return recoveryClient;
}
