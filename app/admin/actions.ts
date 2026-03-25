"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseEmployeeCsv } from "@/lib/csv";
import { hasSupabaseEnv, isLocalAdminBypassEnabled } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/rbac";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { buildEmployeeRoadmap } from "@/lib/training";
import type { CertificationRow, Employee } from "@/lib/types";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeStoreCode(value: string) {
  return value.trim().toUpperCase();
}

function assertStartingPosition(value: string) {
  if (value !== "boh" && value !== "cashier") {
    throw new Error("Starting position must be boh or cashier.");
  }
}

function getOptionalDateString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

async function assertCompanyAdmin() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are required before admin actions can run.");
  }
  if (isLocalAdminBypassEnabled()) {
    return;
  }
  const profile = await getCurrentUserProfile();
  if (!profile || profile.appRole !== "company_admin") {
    throw new Error("Only company admins can perform this action.");
  }
}

async function assertAuthenticatedOperator() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are required before authenticated actions can run.");
  }

  if (isLocalAdminBypassEnabled()) {
    return {
      id: "local-dev-admin",
      appRole: "company_admin" as const,
      primaryStoreId: null,
      fullName: "Local Dev Admin"
    };
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("You must be signed in to perform this action.");
  }

  return profile;
}

async function createScopedActionClient() {
  return isLocalAdminBypassEnabled() ? createSupabaseAdminClient() : await createSupabaseServerClient();
}

export async function createStoreAction(formData: FormData) {
  await assertCompanyAdmin();
  const supabase = createSupabaseAdminClient();
  const payload = {
    name: getString(formData, "name"),
    code: normalizeStoreCode(getString(formData, "code")),
    region: getString(formData, "region"),
    active: getString(formData, "status") !== "inactive"
  };

  if (!payload.name || !payload.code || !payload.region) {
    throw new Error("Store name, code, and region are required.");
  }

  const { error } = await supabase.from("stores").insert(payload);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createUserAccessAction(formData: FormData) {
  await assertCompanyAdmin();

  const adminClient = createSupabaseAdminClient();
  const email = getString(formData, "email").toLowerCase();
  const fullName = getString(formData, "full_name");
  const password = getString(formData, "password");
  const isCompanyAdmin = getString(formData, "is_company_admin") === "true";
  const requestedPrimaryStoreId = getString(formData, "primary_store_id");
  const storeIds = Array.from(new Set(formData.getAll("store_ids").map((value) => String(value)).filter(Boolean)));

  if (!email || !fullName || !password) {
    throw new Error("Email, full name, and temporary password are required.");
  }

  if (!isCompanyAdmin && storeIds.length === 0) {
    throw new Error("Assign at least one cafe to this manager.");
  }

  const primaryStoreId = isCompanyAdmin
    ? null
    : requestedPrimaryStoreId && storeIds.includes(requestedPrimaryStoreId)
      ? requestedPrimaryStoreId
      : storeIds[0];

  const { data: authUserData, error: authUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authUserError || !authUserData.user) {
    throw new Error(authUserError?.message ?? "Unable to create manager login.");
  }

  const managerId = authUserData.user.id;

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: managerId,
    full_name: fullName,
    app_role: isCompanyAdmin ? "company_admin" : "store_manager",
    primary_store_id: primaryStoreId
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(managerId);
    throw new Error(profileError.message);
  }

  let assignmentError: { message: string } | null = null;

  if (!isCompanyAdmin) {
    const assignmentResult = await adminClient.from("manager_store_assignments").insert(
      storeIds.map((storeId) => ({
        manager_id: managerId,
        store_id: storeId
      }))
    );
    assignmentError = assignmentResult.error;
  }

  if (assignmentError) {
    await adminClient.from("profiles").delete().eq("id", managerId);
    await adminClient.auth.admin.deleteUser(managerId);
    throw new Error(assignmentError.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

export async function updateUserStoreAccessAction(formData: FormData) {
  await assertCompanyAdmin();

  const adminClient = createSupabaseAdminClient();
  const userId = getString(formData, "user_id");
  const requestedPrimaryStoreId = getString(formData, "primary_store_id");
  const storeIds = Array.from(new Set(formData.getAll("store_ids").map((value) => String(value)).filter(Boolean)));

  if (!userId) {
    throw new Error("User is required.");
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, app_role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "User profile not found.");
  }

  const appRole = String(profile.app_role) as "company_admin" | "store_manager";

  if (appRole === "company_admin") {
    revalidatePath("/admin");
    return;
  }

  if (storeIds.length === 0) {
    throw new Error("Assign at least one cafe to this manager.");
  }

  const primaryStoreId = requestedPrimaryStoreId && storeIds.includes(requestedPrimaryStoreId) ? requestedPrimaryStoreId : storeIds[0];

  const { error: updateProfileError } = await adminClient.from("profiles").update({ primary_store_id: primaryStoreId }).eq("id", userId);

  if (updateProfileError) {
    throw new Error(updateProfileError.message);
  }

  const { error: deleteAssignmentsError } = await adminClient.from("manager_store_assignments").delete().eq("manager_id", userId);

  if (deleteAssignmentsError) {
    throw new Error(deleteAssignmentsError.message);
  }

  const { error: insertAssignmentsError } = await adminClient.from("manager_store_assignments").insert(
    storeIds.map((storeId) => ({
      manager_id: userId,
      store_id: storeId
    }))
  );

  if (insertAssignmentsError) {
    throw new Error(insertAssignmentsError.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

export async function setUserAccessArchivedAction(formData: FormData) {
  const operator = await assertAuthenticatedOperator();
  if (operator.appRole !== "company_admin") {
    throw new Error("Only company admins can perform this action.");
  }

  const adminClient = createSupabaseAdminClient();
  const userId = getString(formData, "user_id");
  const archive = getString(formData, "archive") !== "false";

  if (!userId) {
    throw new Error("User is required.");
  }

  if (userId === operator.id) {
    throw new Error("You can't archive your own login.");
  }

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: archive ? "876000h" : "none"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin");
}

export async function createEmployeeAction(formData: FormData) {
  await assertCompanyAdmin();
  const supabase = createSupabaseAdminClient();
  const payload = {
    first_name: getString(formData, "first_name"),
    last_name: getString(formData, "last_name"),
    hire_date: getString(formData, "hire_date"),
    primary_store_id: getString(formData, "primary_store_id"),
    role_title: "Barista Trainee",
    starting_position: "boh"
  };

  if (!payload.first_name || !payload.last_name || !payload.hire_date || !payload.primary_store_id) {
    throw new Error("First name, last name, hire date, and primary cafe are required.");
  }

  const { error } = await supabase.from("employees").insert(payload);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
}

export async function updateEmployeeStartingPositionAction(formData: FormData) {
  await assertAuthenticatedOperator();

  const employeeId = getString(formData, "employee_id");
  const startingPosition = getString(formData, "starting_position");

  if (!employeeId || !startingPosition) {
    throw new Error("Employee and starting role are required.");
  }

  assertStartingPosition(startingPosition);

  const supabase = await createScopedActionClient();
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("id, primary_store_id, first_name, last_name, role_title, hire_date")
    .eq("id", employeeId)
    .single();

  if (employeeError || !employeeRow) {
    throw new Error(employeeError?.message ?? "Employee not found.");
  }

  const { data: certificationRows, error: certificationsError } = await supabase
    .from("certifications")
    .select("id, employee_id, milestone_key, due_date, completed_at, scheduled, scheduled_for, waiting_for_academy")
    .eq("employee_id", employeeId);

  if (certificationsError) {
    throw new Error(certificationsError.message);
  }

  const employee: Employee = {
    id: String(employeeRow.id),
    firstName: String(employeeRow.first_name),
    lastName: String(employeeRow.last_name),
    roleTitle: String(employeeRow.role_title),
    hireDate: String(employeeRow.hire_date),
    primaryStoreId: String(employeeRow.primary_store_id),
    active: true,
    startingPosition: startingPosition as Employee["startingPosition"],
    trainerStatus: "on_track",
    latteArt: { heart: false, rosetta: false, tulip: false },
    milkTypes: { whole: false, skim: false, almond: false, oat: false }
  };

  const certifications: CertificationRow[] = ((certificationRows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    employeeId: String(row.employee_id),
    milestoneKey: row.milestone_key as CertificationRow["milestoneKey"],
    dueDate: String(row.due_date),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    scheduled: Boolean(row.scheduled),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
    waitingForAcademy: Boolean(row.waiting_for_academy)
  }));

  const roadmapByKey = new Map(buildEmployeeRoadmap(employee).map((row) => [row.milestoneKey, row]));

  const { error: updateEmployeeError } = await supabase
    .from("employees")
    .update({ starting_position: startingPosition })
    .eq("id", employeeId);

  if (updateEmployeeError) {
    throw new Error(updateEmployeeError.message);
  }

  for (const certification of certifications) {
    if (certification.completedAt) {
      continue;
    }

    const nextDefinition = roadmapByKey.get(certification.milestoneKey);
    if (!nextDefinition) {
      continue;
    }

    const { error: updateCertificationError } = await supabase
      .from("certifications")
      .update({
        due_date: nextDefinition.dueDate,
        waiting_for_academy: nextDefinition.waitingForAcademy
      })
      .eq("id", certification.id);

    if (updateCertificationError) {
      throw new Error(updateCertificationError.message);
    }
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
  revalidatePath(`/employees/${employeeId}`);
}

export async function updateEmployeeHireDateAction(formData: FormData) {
  await assertAuthenticatedOperator();

  const employeeId = getString(formData, "employee_id");
  const hireDate = getString(formData, "hire_date");

  if (!employeeId || !hireDate) {
    throw new Error("Employee and hire date are required.");
  }

  const supabase = await createScopedActionClient();
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select(
      "id, primary_store_id, first_name, last_name, role_title, hire_date, active, starting_position, latte_heart, latte_rosetta, latte_tulip, milk_whole, milk_skim, milk_almond, milk_oat"
    )
    .eq("id", employeeId)
    .single();

  if (employeeError || !employeeRow) {
    throw new Error(employeeError?.message ?? "Employee not found.");
  }

  const { data: certificationRows, error: certificationsError } = await supabase
    .from("certifications")
    .select("id, employee_id, milestone_key, due_date, completed_at, scheduled, scheduled_for, waiting_for_academy")
    .eq("employee_id", employeeId);

  if (certificationsError) {
    throw new Error(certificationsError.message);
  }

  const employee: Employee = {
    id: String(employeeRow.id),
    firstName: String(employeeRow.first_name),
    lastName: String(employeeRow.last_name),
    roleTitle: String(employeeRow.role_title),
    hireDate,
    primaryStoreId: String(employeeRow.primary_store_id),
    active: true,
    startingPosition: String(employeeRow.starting_position ?? "boh") as Employee["startingPosition"],
    trainerStatus: "on_track",
    latteArt: {
      heart: Boolean(employeeRow.latte_heart),
      rosetta: Boolean(employeeRow.latte_rosetta),
      tulip: Boolean(employeeRow.latte_tulip)
    },
    milkTypes: {
      whole: Boolean(employeeRow.milk_whole),
      skim: Boolean(employeeRow.milk_skim),
      almond: Boolean(employeeRow.milk_almond),
      oat: Boolean(employeeRow.milk_oat)
    }
  };

  const certifications: CertificationRow[] = ((certificationRows ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    employeeId: String(row.employee_id),
    milestoneKey: row.milestone_key as CertificationRow["milestoneKey"],
    dueDate: String(row.due_date),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    scheduled: Boolean(row.scheduled),
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
    waitingForAcademy: Boolean(row.waiting_for_academy)
  }));

  const roadmapByKey = new Map(buildEmployeeRoadmap(employee).map((row) => [row.milestoneKey, row]));

  const { error: updateEmployeeError } = await supabase.from("employees").update({ hire_date: hireDate }).eq("id", employeeId);

  if (updateEmployeeError) {
    throw new Error(updateEmployeeError.message);
  }

  for (const certification of certifications) {
    const nextDefinition = roadmapByKey.get(certification.milestoneKey);
    if (!nextDefinition) {
      continue;
    }

    const payload =
      certification.milestoneKey === "orientation"
        ? {
            due_date: hireDate,
            completed_at: hireDate,
            scheduled: certification.scheduled,
            scheduled_for: certification.scheduledFor,
            waiting_for_academy: false
          }
        : {
            due_date: nextDefinition.dueDate,
            completed_at: certification.completedAt,
            scheduled: certification.scheduled,
            scheduled_for: certification.scheduledFor,
            waiting_for_academy: nextDefinition.waitingForAcademy && !certification.completedAt
          };

    const { error: updateCertificationError } = await supabase.from("certifications").update(payload).eq("id", certification.id);

    if (updateCertificationError) {
      throw new Error(updateCertificationError.message);
    }
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
  revalidatePath(`/employees/${employeeId}`);
}

export async function updateEmployeeMilestoneCompletionAction(formData: FormData) {
  await assertAuthenticatedOperator();

  const employeeId = getString(formData, "employee_id");
  const milestoneKey = getString(formData, "milestone_key");
  const completed = getString(formData, "completed") === "true";
  const completedAt = getOptionalDateString(formData, "completed_at");
  const scheduled = getString(formData, "scheduled") === "true";
  const scheduledFor = getOptionalDateString(formData, "scheduled_for");

  if (!employeeId || !milestoneKey) {
    throw new Error("Employee and training module are required.");
  }

  if (scheduled && !scheduledFor) {
    throw new Error("A scheduled date is required when marking a module as scheduled.");
  }

  if (completed && !completedAt) {
    throw new Error("A completion date is required when marking a module complete.");
  }

  const supabase = await createScopedActionClient();
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select(
      "id, primary_store_id, first_name, last_name, role_title, hire_date, active, starting_position, latte_heart, latte_rosetta, latte_tulip, milk_whole, milk_skim, milk_almond, milk_oat"
    )
    .eq("id", employeeId)
    .single();

  if (employeeError || !employeeRow) {
    throw new Error(employeeError?.message ?? "Employee not found.");
  }

  const employee: Employee = {
    id: String(employeeRow.id),
    firstName: String(employeeRow.first_name),
    lastName: String(employeeRow.last_name),
    roleTitle: String(employeeRow.role_title),
    hireDate: String(employeeRow.hire_date),
    primaryStoreId: String(employeeRow.primary_store_id),
    active: Boolean(employeeRow.active ?? true),
    startingPosition: String(employeeRow.starting_position ?? "boh") as Employee["startingPosition"],
    trainerStatus: "on_track",
    latteArt: {
      heart: Boolean(employeeRow.latte_heart),
      rosetta: Boolean(employeeRow.latte_rosetta),
      tulip: Boolean(employeeRow.latte_tulip)
    },
    milkTypes: {
      whole: Boolean(employeeRow.milk_whole),
      skim: Boolean(employeeRow.milk_skim),
      almond: Boolean(employeeRow.milk_almond),
      oat: Boolean(employeeRow.milk_oat)
    }
  };

  const roadmapByKey = new Map(buildEmployeeRoadmap(employee).map((row) => [row.milestoneKey, row]));
  const roadmapRow = roadmapByKey.get(milestoneKey as CertificationRow["milestoneKey"]);

  if (!roadmapRow) {
    throw new Error("Training module not found.");
  }

  const { data: certification, error: certificationError } = await supabase
    .from("certifications")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("milestone_key", milestoneKey)
    .maybeSingle();

  if (certificationError) {
    throw new Error(certificationError.message);
  }

  const payload = {
    employee_id: employeeId,
    milestone_key: milestoneKey,
    due_date: milestoneKey === "orientation" ? employee.hireDate : roadmapRow.dueDate,
    scheduled,
    scheduled_for: scheduled ? scheduledFor : null,
    completed_at: milestoneKey === "orientation" ? employee.hireDate : completed ? completedAt : null,
    waiting_for_academy: milestoneKey === "orientation" ? false : roadmapRow.waitingForAcademy && !completed
  };

  if (certification?.id) {
    const { error: updateError } = await supabase.from("certifications").update(payload).eq("id", certification.id);
    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase.from("certifications").insert(payload);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
  revalidatePath(`/employees/${employeeId}`);
}

export async function validateEmployeeCsvAction(formData: FormData) {
  await assertCompanyAdmin();
  const csv = getString(formData, "csv");
  const parsed = parseEmployeeCsv(csv);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.join(" "));
  }

  const supabase = createSupabaseAdminClient();
  const { data: stores, error: storeError } = await supabase.from("stores").select("id, code");
  if (storeError) {
    throw new Error(storeError.message);
  }

  const storeCodeMap = new Map((stores ?? []).map((store) => [normalizeStoreCode(String(store.code)), store.id]));
  const payload = parsed.rows.map((row) => {
    const primaryStoreId = storeCodeMap.get(normalizeStoreCode(row.primary_store_code));
    if (!primaryStoreId) {
      throw new Error(`Unknown store code: ${row.primary_store_code}`);
    }

    return {
      first_name: row.first_name,
      last_name: row.last_name,
      role_title: row.role_title,
      hire_date: row.hire_date,
      primary_store_id: primaryStoreId,
      starting_position: row.starting_position
    };
  });

  const { error } = await supabase.from("employees").insert(payload);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
}

export async function setEmployeeArchivedAction(formData: FormData) {
  await assertAuthenticatedOperator();

  const employeeId = getString(formData, "employee_id");
  const archive = getString(formData, "archive") !== "false";
  const redirectTo = getString(formData, "redirect_to");

  if (!employeeId) {
    throw new Error("Employee is required.");
  }

  const supabase = await createScopedActionClient();
  const { error } = await supabase.from("employees").update({ active: !archive }).eq("id", employeeId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
  revalidatePath(`/employees/${employeeId}`);

  if (redirectTo === "/store") {
    redirect("/store");
  }
}

export async function saveMilestoneAdjustmentAction(formData: FormData) {
  const useLocalAdminBypass = isLocalAdminBypassEnabled();
  const supabase = useLocalAdminBypass ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const certificationId = getString(formData, "certification_id");
  const employeeId = getString(formData, "employee_id");
  const milestoneKey = getString(formData, "milestone_key");
  const adjustedDueDate = getString(formData, "adjusted_due_date");
  const reason = getString(formData, "reason");

  if ((!certificationId && (!employeeId || !milestoneKey)) || !adjustedDueDate || !reason) {
    throw new Error("Employee, training module, adjusted date, and reason are required.");
  }

  let userId: string | null = null;

  if (!useLocalAdminBypass) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be signed in to adjust milestones.");
    }

    userId = user.id;
  }

  const certificationQuery = supabase.from("certifications").select("id, due_date, completed_at");
  const { data: certification, error: certificationError } = certificationId
    ? await certificationQuery.eq("id", certificationId).single()
    : await certificationQuery.eq("employee_id", employeeId).eq("milestone_key", milestoneKey).single();

  if (certificationError || !certification) {
    throw new Error(certificationError?.message ?? "Certification not found.");
  }

  if (certification.completed_at) {
    throw new Error("Completed training modules cannot be adjusted.");
  }

  if (userId) {
    const { error: adjustmentError } = await supabase.from("milestone_adjustments").insert({
      certification_id: certification.id,
      adjusted_by: userId,
      previous_due_date: certification.due_date,
      adjusted_due_date: adjustedDueDate,
      reason
    });

    if (adjustmentError) {
      throw new Error(adjustmentError.message);
    }
  }

  const { error: updateError } = await supabase
    .from("certifications")
    .update({ due_date: adjustedDueDate })
    .eq("id", certification.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/");
  revalidatePath("/store");
  revalidatePath("/admin");
}
