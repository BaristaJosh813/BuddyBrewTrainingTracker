import { buildEmployeeRoadmap, milestoneDefinitions } from "@/lib/training";
import type { AdminAccessUser, CertificationRow, Employee, Store } from "@/lib/types";
import { EmployeeCsvUpload } from "@/components/employee-csv-upload";
import { StoreMultiSelect } from "@/components/store-multi-select";

import {
  createEmployeeAction,
  createUserAccessAction,
  createStoreAction,
  saveMilestoneAdjustmentAction,
  setUserAccessArchivedAction,
  updateUserStoreAccessAction
} from "@/app/admin/actions";

export function AdminView({
  stores,
  employees,
  certificationsByEmployee,
  accessUsers
}: {
  stores: Store[];
  employees: Employee[];
  certificationsByEmployee: Record<string, CertificationRow[]>;
  accessUsers: AdminAccessUser[];
}) {
  const adjustmentEmployeeOptions = employees
    .filter((employee) =>
      buildEmployeeRoadmap(employee, certificationsByEmployee[employee.id]).some((row) => row.completedAt === null)
    )
    .sort((left, right) => {
      const nameCompare = left.lastName.localeCompare(right.lastName);
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return left.firstName.localeCompare(right.firstName);
    });

  const adjustmentMilestoneOptions = milestoneDefinitions.filter((definition) => !definition.autoComplete);
  const activeAccessUsers = accessUsers.filter((user) => !user.archived);
  const archivedAccessUsers = accessUsers.filter((user) => user.archived);
  const storeMap = new Map(stores.map((store) => [store.id, store]));

  return (
    <div className="grid">
      <div className="page-header">
        <div className="page-copy">
          <div className="eyebrow" style={{ color: "#6b6259" }}>
            Buddy Brew Admin
          </div>
          <h1>Training operations and roster controls</h1>
          <p>
            Buddy Brew admins can manage cafe rosters, onboard new hires, and adjust milestone schedules while keeping
            sensitive employee data out of manager-facing views.
          </p>
        </div>
      </div>

      <section className="admin-actions-row">
        <article className="card">
          <h2 style={{ marginTop: 0 }}>Add Team Member</h2>
          <p className="muted">
            New hires are created as `Barista Trainee` and default to a BOH starting role until you update their
            employee profile later.
          </p>
          <form action={createEmployeeAction}>
            <div className="input-grid">
              <label className="field">
                <span>First Name</span>
                <input name="first_name" placeholder="Maya" />
              </label>
              <label className="field">
                <span>Last Name</span>
                <input name="last_name" placeholder="Chen" />
              </label>
              <label className="field">
                <span>Primary Cafe</span>
                <select name="primary_store_id" defaultValue={stores[0]?.id}>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full">
                <span>Hire Date</span>
                <input name="hire_date" type="date" />
              </label>
            </div>
            <div className="button-row" style={{ marginTop: 16 }}>
              <button className="button primary" type="submit">
                Create team member
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <h2 style={{ marginTop: 0 }}>Add New Cafe</h2>
          <form action={createStoreAction}>
            <div className="input-grid">
              <label className="field">
                <span>Cafe Name</span>
                <input name="name" placeholder="Hyde Park Cafe" />
              </label>
              <label className="field">
                <span>Cafe Code</span>
                <input name="code" placeholder="HP01" />
              </label>
              <label className="field">
                <span>Region</span>
                <input name="region" placeholder="New York" />
              </label>
              <label className="field">
                <span>Status</span>
                <select name="status" defaultValue="active">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <div className="button-row" style={{ marginTop: 16 }}>
              <button className="button primary" type="submit">
                Create cafe
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <h2 style={{ marginTop: 0 }}>Create Admin or Manager Login</h2>
          <p className="muted">
            Create either a store manager or a company-wide admin. Managers only see assigned cafes, while company
            admins can access the full system.
          </p>
          <form action={createUserAccessAction}>
            <div className="input-grid">
              <label className="field">
                <span>Full Name</span>
                <input name="full_name" placeholder="Jordan Alvarez" />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" placeholder="jordan@buddybrew.com" />
              </label>
              <label className="field">
                <span>Temporary Password</span>
                <input name="password" type="text" placeholder="Set an initial password" />
              </label>
              <div className="field">
                <span>Access Level</span>
                <label className="checkbox-card" htmlFor="is_company_admin">
                  <input id="is_company_admin" name="is_company_admin" type="checkbox" value="true" />
                  <span className="checkbox-card-box" aria-hidden="true" />
                  <span className="checkbox-card-copy">
                    <strong>Company-wide admin</strong>
                    <span>Enable full access across every Buddy Brew cafe.</span>
                  </span>
                </label>
              </div>
              <label className="field">
                <span>Default Cafe</span>
                <select name="primary_store_id" defaultValue={stores[0]?.id}>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field full">
                <span>Assigned Cafes</span>
                <StoreMultiSelect
                  stores={stores}
                  name="store_ids"
                  defaultSelectedIds={stores[0] ? [stores[0].id] : []}
                  emptyLabel="Choose one or more cafes"
                  helperText="Managers should only be assigned to the cafes they oversee. Company admins can leave this as-is."
                />
                <span className="muted">Leave the checkbox off for store managers. Company admins ignore cafe assignments.</span>
              </label>
            </div>
            <div className="button-row" style={{ marginTop: 16 }}>
              <button className="button primary" type="submit">
                Create login
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <h2 style={{ marginTop: 0 }}>Bulk Upload Team Members</h2>
          <p>CSV columns: `first_name,last_name,role_title,hire_date,primary_store_code,starting_position`.</p>
          <EmployeeCsvUpload />
        </article>
      </section>

      <section className="card">
        <div className="admin-access-header">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Manage Admin and Manager Access</h2>
            <p style={{ margin: 0 }}>
              Review the current roster of managers and company admins, archive a login, or update which cafes a
              manager can oversee.
            </p>
          </div>
          <div className="admin-access-metrics">
            <div className="stat-card compact">
              <span className="muted">Active Logins</span>
              <strong>{activeAccessUsers.length}</strong>
            </div>
            <div className="stat-card compact">
              <span className="muted">Archived Logins</span>
              <strong>{archivedAccessUsers.length}</strong>
            </div>
          </div>
        </div>

        <div className="admin-access-list">
          {accessUsers.map((user) => {
            const assignedStores = user.assignedStoreIds
              .map((storeId) => storeMap.get(storeId))
              .filter((store): store is Store => Boolean(store));
            const primaryStore = user.primaryStoreId ? storeMap.get(user.primaryStoreId) ?? null : null;
            const isManager = user.appRole === "store_manager";

            return (
              <article key={user.id} className={`admin-access-card ${user.archived ? "is-archived" : ""}`}>
                <div className="admin-access-card-head">
                  <div>
                    <h3 style={{ margin: 0 }}>{user.fullName ?? user.email ?? "Unnamed user"}</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      {user.email ?? "No email on file"}
                    </p>
                  </div>
                  <div className="admin-access-badges">
                    <span className="status-pill">{isManager ? "Store Manager" : "Company Admin"}</span>
                    <span className={`status-pill ${user.archived ? "archived" : ""}`}>{user.archived ? "Archived" : "Active"}</span>
                  </div>
                </div>

                <div className="admin-access-summary">
                  <span>
                    <strong>Default cafe:</strong> {primaryStore ? `${primaryStore.name} (${primaryStore.code})` : "None"}
                  </span>
                  <span>
                    <strong>Assigned cafes:</strong>{" "}
                    {assignedStores.length > 0
                      ? assignedStores.map((store) => `${store.name} (${store.code})`).join(", ")
                      : isManager
                        ? "None"
                        : "All cafes"}
                  </span>
                </div>

                {isManager ? (
                  <form action={updateUserStoreAccessAction}>
                    <input name="user_id" type="hidden" value={user.id} />
                    <div className="input-grid">
                      <label className="field">
                        <span>Default Cafe</span>
                        <select name="primary_store_id" defaultValue={user.primaryStoreId ?? user.assignedStoreIds[0] ?? stores[0]?.id}>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field full">
                        <span>Assigned Cafes</span>
                        <StoreMultiSelect
                          stores={stores}
                          name="store_ids"
                          defaultSelectedIds={user.assignedStoreIds}
                          emptyLabel="Choose assigned cafes"
                          helperText="Open the dropdown, scroll through the cafe list, and check each location this manager should access."
                        />
                      </label>
                    </div>
                    <div className="button-row" style={{ marginTop: 16 }}>
                      <button className="button primary" type="submit" disabled={user.archived}>
                        Save store access
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="muted" style={{ marginBottom: 0 }}>
                    Company admins keep full-system access, so cafe assignments are not required here.
                  </p>
                )}

                <form action={setUserAccessArchivedAction}>
                  <input name="user_id" type="hidden" value={user.id} />
                  <input name="archive" type="hidden" value={user.archived ? "false" : "true"} />
                  <div className="button-row" style={{ marginTop: 16 }}>
                    <button className="button" type="submit">
                      {user.archived ? "Restore login" : "Archive login"}
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Milestone Reschedule / Fast Track</h2>
        <p>
          Buddy Brew leaders can move a milestone date forward or backward, but every adjustment must include a reason
          for audit review.
        </p>
        <form action={saveMilestoneAdjustmentAction}>
          <div className="input-grid">
            <label className="field">
              <span>Employee</span>
              <select name="employee_id" defaultValue={adjustmentEmployeeOptions[0]?.id}>
                {adjustmentEmployeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Training Module</span>
              <select name="milestone_key" defaultValue={adjustmentMilestoneOptions[0]?.key}>
                {adjustmentMilestoneOptions.map((definition) => (
                  <option key={definition.key} value={definition.key}>
                    {definition.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Adjusted Due Date</span>
              <input name="adjusted_due_date" type="date" />
            </label>
            <label className="field full">
              <span>Reason</span>
              <input name="reason" placeholder="Coverage gap / PTO / accelerated readiness" />
            </label>
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="button primary" type="submit">
              Save adjustment
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
