import { DashboardView } from "@/components/dashboard";
import { getDashboardData } from "@/lib/data";
import { hasSupabaseEnv, isLocalAdminBypassEnabled } from "@/lib/env";
import { getCurrentViewer } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (hasSupabaseEnv() && !isLocalAdminBypassEnabled()) {
    const viewer = await getCurrentViewer();
    if (!viewer) {
      redirect("/login");
    }
  }

  const { stores, employees, certificationsByEmployee, usingDemoData } = await getDashboardData();
  return (
    <>
      {usingDemoData ? (
        <div className="banner">
          Buddy Brew is currently running in demo mode until `NEXT_PUBLIC_SUPABASE_URL` and the Supabase keys are
          configured. The production data model and RLS migration files are included in `supabase/`.
        </div>
      ) : null}
      <DashboardView stores={stores} employees={employees} certificationsByEmployee={certificationsByEmployee} />
    </>
  );
}
