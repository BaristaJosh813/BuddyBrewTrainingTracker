import { AdminView } from "@/components/admin-view";
import { getAdminAccessUsers, getDashboardData } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { requireRole } from "@/lib/rbac";

export default async function AdminPage() {
  if (hasSupabaseEnv()) {
    await requireRole("company_admin");
  }
  const [{ stores, employees, certificationsByEmployee }, accessUsers] = await Promise.all([
    getDashboardData(),
    getAdminAccessUsers()
  ]);

  return (
    <AdminView
      stores={stores}
      employees={employees}
      certificationsByEmployee={certificationsByEmployee}
      accessUsers={accessUsers}
    />
  );
}
