import { StoreView } from "@/components/store-view";
import { getDashboardData } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/rbac";

export default async function StorePage() {
  const { stores, employees, archivedEmployees, certificationsByEmployee, usingDemoData } = await getDashboardData();
  let isCompanyAdmin = true;
  let initialStoreId = stores[0]?.id ?? "";

  if (hasSupabaseEnv()) {
    const profile = await getCurrentUserProfile();
    isCompanyAdmin = profile?.appRole === "company_admin";
    initialStoreId = isCompanyAdmin
      ? stores[0]?.id ?? ""
      : stores.find((store) => store.id === profile?.primaryStoreId)?.id ?? stores[0]?.id ?? "";
  }

  return (
    <StoreView
      stores={stores}
      employees={employees}
      archivedEmployees={archivedEmployees}
      certificationsByEmployee={certificationsByEmployee}
      isCompanyAdmin={isCompanyAdmin}
      initialStoreId={initialStoreId}
      usingDemoData={usingDemoData}
    />
  );
}
