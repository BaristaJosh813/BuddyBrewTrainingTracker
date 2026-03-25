import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";

import { env } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase server client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component renders can read cookies but cannot mutate them.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Server Component renders can read cookies but cannot mutate them.
        }
      }
    }
  });
}

export function createSupabaseAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
