import { redirect } from "next/navigation";

import type { AppRole, UserProfile } from "@/lib/types";
import { isLocalAdminBypassEnabled } from "@/lib/env";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUserProfile() {
  if (isLocalAdminBypassEnabled()) {
    return {
      id: "local-dev-admin",
      appRole: "company_admin" as const,
      companyId: "local-dev-company",
      primaryStoreId: null,
      fullName: "Local Dev Admin"
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, app_role, company_id, primary_store_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as {
    id: string;
    app_role: AppRole;
    company_id: string;
    primary_store_id: string | null;
    full_name: string | null;
  };

  return {
    id: row.id,
    appRole: row.app_role,
    companyId: row.company_id,
    primaryStoreId: row.primary_store_id,
    fullName: row.full_name
  } satisfies UserProfile;
}

export async function getCurrentViewer() {
  if (isLocalAdminBypassEnabled()) {
    return {
      email: "local-admin@example.com",
      profile: {
        id: "local-dev-admin",
        appRole: "company_admin" as const,
        companyId: "local-dev-company",
        primaryStoreId: null,
        fullName: "Local Dev Admin"
      }
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    email: user.email ?? null,
    profile: await getCurrentUserProfile()
  };
}

export async function requireRole(role: AppRole) {
  if (isLocalAdminBypassEnabled()) {
    return {
      id: "local-dev-admin",
      appRole: "company_admin" as const,
      companyId: "local-dev-company",
      primaryStoreId: null,
      fullName: "Local Dev Admin"
    };
  }

  const profile = await getCurrentUserProfile();
  if (!profile || profile.appRole !== role) {
    redirect("/");
  }
  return profile;
}
