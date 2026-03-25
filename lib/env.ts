function readEnv(name: string) {
  return process.env[name]?.trim();
}

export const env = {
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  devLocalAdminBypass: readEnv("DEV_LOCAL_ADMIN_BYPASS")
};

export function hasSupabaseEnv() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasSupabaseServiceRoleEnv() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isLocalAdminBypassEnabled() {
  return process.env.NODE_ENV !== "production" && env.devLocalAdminBypass === "true";
}
