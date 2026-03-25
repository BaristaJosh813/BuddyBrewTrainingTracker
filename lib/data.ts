import { demoEmployees, demoStores } from "@/lib/demo-data";
import { hasSupabaseEnv, isLocalAdminBypassEnabled } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { buildEmployeeRoadmap } from "@/lib/training";
import type { AdminAccessUser, CertificationRow, Employee, MilestoneKey, StartingPosition, Store, UserProfile } from "@/lib/types";

type DashboardData = {
  stores: Store[];
  employees: Employee[];
  archivedEmployees: Employee[];
  certificationsByEmployee: Record<string, CertificationRow[]>;
  usingDemoData: boolean;
};

function mapEmployee(row: Record<string, unknown>): Employee {
  const startingPosition = String(row.starting_position ?? "boh") as StartingPosition;

  return {
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    roleTitle: String(row.role_title),
    hireDate: String(row.hire_date),
    primaryStoreId: String(row.primary_store_id),
    active: Boolean(row.active ?? true),
    startingPosition,
    trainerStatus: "on_track",
    latteArt: {
      heart: Boolean(row.latte_heart),
      rosetta: Boolean(row.latte_rosetta),
      tulip: Boolean(row.latte_tulip)
    },
    milkTypes: {
      whole: Boolean(row.milk_whole),
      skim: Boolean(row.milk_skim),
      almond: Boolean(row.milk_almond),
      oat: Boolean(row.milk_oat)
    }
  };
}

function mapCertification(row: Record<string, unknown>): CertificationRow {
  return {
    id: String(row.id),
    employeeId: String(row.employee_id),
    milestoneKey: String(row.milestone_key) as MilestoneKey,
    dueDate: String(row.due_date),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    scheduled: Boolean(row.scheduled),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
    waitingForAcademy: Boolean(row.waiting_for_academy)
  };
}

function buildDemoCertificationsByEmployee(): Record<string, CertificationRow[]> {
  return demoEmployees.reduce<Record<string, CertificationRow[]>>((acc, employee) => {
    acc[employee.id] = buildEmployeeRoadmap(employee);
    return acc;
  }, {});
}

async function getScopedDashboardRows(profile: UserProfile) {
  const supabase = createSupabaseAdminClient();

  if (profile.appRole === "company_admin") {
    const [{ data: stores }, { data: employees }, { data: certifications }] = await Promise.all([
      supabase.from("stores").select("id, name, code, region, active").eq("company_id", profile.companyId).order("name"),
      supabase
        .from("employees")
        .select(
          "id, primary_store_id, first_name, last_name, role_title, hire_date, active, starting_position, latte_heart, latte_rosetta, latte_tulip, milk_whole, milk_skim, milk_almond, milk_oat"
        )
        .eq("company_id", profile.companyId)
        .order("hire_date", { ascending: false }),
      supabase
        .from("certifications")
        .select("id, employee_id, milestone_key, due_date, completed_at, scheduled, scheduled_for, waiting_for_academy, employees!inner(company_id)")
        .eq("employees.company_id", profile.companyId)
        .order("due_date", { ascending: true })
    ]);

    return { stores, employees, certifications };
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("manager_store_assignments")
    .select("store_id")
    .eq("company_id", profile.companyId)
    .eq("manager_id", profile.id);

  if (assignmentsError) {
    throw new Error(assignmentsError.message);
  }

  const storeIds = Array.from(new Set(((assignments ?? []) as Record<string, unknown>[]).map((row) => String(row.store_id))));

  if (storeIds.length === 0) {
    return {
      stores: [],
      employees: [],
      certifications: []
    };
  }

  const [{ data: stores }, { data: employees }] = await Promise.all([
    supabase.from("stores").select("id, name, code, region, active").in("id", storeIds).order("name"),
    supabase
      .from("employees")
      .select(
        "id, primary_store_id, first_name, last_name, role_title, hire_date, active, starting_position, latte_heart, latte_rosetta, latte_tulip, milk_whole, milk_skim, milk_almond, milk_oat"
      )
      .eq("company_id", profile.companyId)
      .in("primary_store_id", storeIds)
      .order("hire_date", { ascending: false })
  ]);

  const employeeIds = ((employees ?? []) as Record<string, unknown>[]).map((row) => String(row.id));

  const { data: certifications } =
    employeeIds.length > 0
      ? await supabase
          .from("certifications")
          .select("id, employee_id, milestone_key, due_date, completed_at, scheduled, scheduled_for, waiting_for_academy")
          .in("employee_id", employeeIds)
          .order("due_date", { ascending: true })
      : { data: [] };

  return { stores, employees, certifications };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasSupabaseEnv()) {
    return {
      stores: demoStores,
      employees: demoEmployees,
      archivedEmployees: [],
      certificationsByEmployee: buildDemoCertificationsByEmployee(),
      usingDemoData: true
    };
  }

  try {
    if (isLocalAdminBypassEnabled()) {
      const supabase = createSupabaseAdminClient();
      const [{ data: stores }, { data: employees }, { data: certifications }] = await Promise.all([
        supabase.from("stores").select("id, name, code, region, active").order("name"),
        supabase
          .from("employees")
          .select(
            "id, primary_store_id, first_name, last_name, role_title, hire_date, active, starting_position, latte_heart, latte_rosetta, latte_tulip, milk_whole, milk_skim, milk_almond, milk_oat"
          )
          .order("hire_date", { ascending: false }),
        supabase
          .from("certifications")
          .select("id, employee_id, milestone_key, due_date, completed_at, scheduled, scheduled_for, waiting_for_academy")
          .order("due_date", { ascending: true })
      ]);

      const mappedStores = ((stores ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        code: String(row.code),
        region: String(row.region),
        active: Boolean(row.active)
      }));
      const mappedEmployees = ((employees ?? []) as Record<string, unknown>[]).map(mapEmployee);
      const activeEmployees = mappedEmployees.filter((employee) => employee.active);
      const archivedEmployees = mappedEmployees.filter((employee) => !employee.active);
      const mappedCertifications = ((certifications ?? []) as Record<string, unknown>[]).map(mapCertification);

      const certificationsByEmployee = mappedCertifications.reduce<Record<string, CertificationRow[]>>((acc, certification) => {
        acc[certification.employeeId] ??= [];
        acc[certification.employeeId].push(certification);
        return acc;
      }, {});

      return {
        stores: mappedStores,
        employees: activeEmployees,
        archivedEmployees,
        certificationsByEmployee,
        usingDemoData: false
      };
    }

    const profile = await getCurrentUserProfile();

    if (!profile) {
      return {
        stores: [],
        employees: [],
        archivedEmployees: [],
        certificationsByEmployee: {},
        usingDemoData: false
      };
    }

    const { stores, employees, certifications } = await getScopedDashboardRows(profile);

    const mappedStores = ((stores ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      code: String(row.code),
      region: String(row.region),
      active: Boolean(row.active)
    }));
    const mappedEmployees = ((employees ?? []) as Record<string, unknown>[]).map(mapEmployee);
    const activeEmployees = mappedEmployees.filter((employee) => employee.active);
    const archivedEmployees = mappedEmployees.filter((employee) => !employee.active);
    const mappedCertifications = ((certifications ?? []) as Record<string, unknown>[]).map(mapCertification);

    const certificationsByEmployee = mappedCertifications.reduce<Record<string, CertificationRow[]>>((acc, certification) => {
      acc[certification.employeeId] ??= [];
      acc[certification.employeeId].push(certification);
      return acc;
    }, {});

    return {
      stores: mappedStores,
      employees: activeEmployees,
      archivedEmployees,
      certificationsByEmployee,
      usingDemoData: false
    };
  } catch {
    return {
      stores: demoStores,
      employees: demoEmployees,
      archivedEmployees: [],
      certificationsByEmployee: buildDemoCertificationsByEmployee(),
      usingDemoData: true
    };
  }
}

export async function getEmployeeProfileData(employeeId: string) {
  const data = await getDashboardData();
  const employee = data.employees.find((item) => item.id === employeeId) ?? data.archivedEmployees.find((item) => item.id === employeeId) ?? null;
  return {
    ...data,
    employee,
    certifications: employee ? data.certificationsByEmployee[employee.id] ?? [] : []
  };
}

export async function getAdminAccessUsers(): Promise<AdminAccessUser[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.appRole !== "company_admin") {
      return [];
    }

    const supabase = createSupabaseAdminClient();
    const [{ data: profiles }, { data: assignments }, { data: authUsersData, error: authUsersError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, app_role, company_id, primary_store_id")
        .eq("company_id", profile.companyId)
        .order("full_name"),
      supabase.from("manager_store_assignments").select("manager_id, store_id").eq("company_id", profile.companyId),
      supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    ]);

    if (authUsersError) {
      throw new Error(authUsersError.message);
    }

    const assignmentsByManager = new Map<string, string[]>();

    for (const row of (assignments ?? []) as Record<string, unknown>[]) {
      const managerId = String(row.manager_id);
      const storeId = String(row.store_id);
      assignmentsByManager.set(managerId, [...(assignmentsByManager.get(managerId) ?? []), storeId]);
    }

    const authUsersById = new Map(
      (authUsersData?.users ?? []).map((user) => [
        user.id,
        {
          email: user.email ?? null,
          archived: Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now())
        }
      ])
    );

    return ((profiles ?? []) as Record<string, unknown>[])
      .map((row) => {
        const id = String(row.id);
        const authUser = authUsersById.get(id);

        return {
          id,
          fullName: row.full_name ? String(row.full_name) : null,
          email: authUser?.email ?? null,
          appRole: String(row.app_role) as AdminAccessUser["appRole"],
          companyId: String(row.company_id),
          primaryStoreId: row.primary_store_id ? String(row.primary_store_id) : null,
          assignedStoreIds: assignmentsByManager.get(id) ?? [],
          archived: authUser?.archived ?? false
        } satisfies AdminAccessUser;
      })
      .sort((left, right) => {
        if (left.archived !== right.archived) {
          return left.archived ? 1 : -1;
        }
        if (left.appRole !== right.appRole) {
          return left.appRole === "company_admin" ? -1 : 1;
        }
        return (left.fullName ?? left.email ?? "").localeCompare(right.fullName ?? right.email ?? "");
      });
  } catch {
    return [];
  }
}
