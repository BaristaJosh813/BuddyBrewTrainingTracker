import { EmployeeProfile } from "@/components/employee-profile";
import { getEmployeeProfileData } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/rbac";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { employee, employees, archivedEmployees, stores, certifications, usingDemoData } = await getEmployeeProfileData(id);
  let isCompanyAdmin = true;

  if (hasSupabaseEnv()) {
    const profile = await getCurrentUserProfile();
    isCompanyAdmin = profile?.appRole === "company_admin";
  }

  return (
    <EmployeeProfile
      employee={employee}
      employees={employees}
      archivedEmployees={archivedEmployees}
      stores={stores}
      certifications={certifications}
      usingDemoData={usingDemoData}
      isCompanyAdmin={isCompanyAdmin}
    />
  );
}
