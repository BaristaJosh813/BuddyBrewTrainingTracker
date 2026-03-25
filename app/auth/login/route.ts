import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

import { env } from "@/lib/env";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function POST(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    loginUrl.searchParams.set("error", "Supabase auth is not configured.");
    return NextResponse.redirect(loginUrl);
  }

  const formData = await request.formData();
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    loginUrl.searchParams.set("error", "Email and password are required.");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.redirect(new URL("/", request.url));

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
