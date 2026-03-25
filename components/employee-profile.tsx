import { notFound } from "next/navigation";

import {
  updateEmployeeHireDateAction,
  updateEmployeeMilestoneCompletionAction,
  updateEmployeeStartingPositionAction
} from "@/app/admin/actions";
import { ArchiveEmployeeForm } from "@/components/delete-employee-form";
import { StoreRosterSwitcher } from "@/components/store-roster-switcher";
import { TrainingModuleControls } from "@/components/training-module-controls";
import { buildEmployeeRoadmap, formatDate, formatStartingPosition, getMilestoneLabel, statusFromDueDate } from "@/lib/training";
import type { CertificationRow, Employee, Store } from "@/lib/types";

export function EmployeeProfile({
  employee,
  employees,
  archivedEmployees,
  stores,
  certifications,
  usingDemoData,
  isCompanyAdmin
}: {
  employee: Employee | null;
  employees: Employee[];
  archivedEmployees: Employee[];
  stores: Store[];
  certifications: CertificationRow[];
  usingDemoData: boolean;
  isCompanyAdmin: boolean;
}) {
  if (!employee) {
    notFound();
  }

  const store = stores.find((item) => item.id === employee.primaryStoreId);
  const rosterSource = employee.active ? employees : archivedEmployees;
  const roadmap = buildEmployeeRoadmap(employee, certifications);
  const storeRosterOptions = rosterSource
    .filter((item) => item.primaryStoreId === employee.primaryStoreId)
    .sort((left, right) => left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName))
    .map((item) => ({
      id: item.id,
      label: `${item.firstName} ${item.lastName} · ${item.roleTitle}`
    }));

  return (
    <div className="grid">
      <div className="page-header">
        <div className="page-copy">
          <div className="eyebrow" style={{ color: "#6b6259" }}>
            Buddy Brew Team Member
          </div>
          <div className="profile-identity-row">
            <h1>
              {employee.firstName} {employee.lastName}
            </h1>
            {!employee.active ? <span className="status-pill archived">Archived employee</span> : null}
            {storeRosterOptions.length > 1 ? (
              <StoreRosterSwitcher currentEmployeeId={employee.id} options={storeRosterOptions} />
            ) : null}
          </div>
          <p>
            {employee.roleTitle} · {store?.name ?? "Unknown cafe"} · Starts in {formatStartingPosition(employee.startingPosition)} · Hired{" "}
            {formatDate(employee.hireDate)}
          </p>
          {!employee.active ? (
            <p className="muted" style={{ marginTop: 10 }}>
              This team member is archived and no longer appears in the active cafe roster.
            </p>
          ) : null}
        </div>
        {isCompanyAdmin && !usingDemoData ? (
          <ArchiveEmployeeForm
            employeeId={employee.id}
            employeeName={`${employee.firstName} ${employee.lastName}`}
            archived={!employee.active}
            redirectTo={employee.active ? "/store" : undefined}
          />
        ) : null}
      </div>

      <article className="card training-card">
        <div className="training-card-header">
          <div>
            <h2 style={{ margin: 0 }}>Buddy Brew Training Card</h2>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Mark each training module complete and record the finish date. The employee&apos;s active training path
              updates from these completions automatically.
            </p>
          </div>
          <div className="training-card-summary">
            <strong>
              {roadmap.filter((item) => item.completedAt).length}/{roadmap.length}
            </strong>
            <span>modules complete</span>
          </div>
        </div>

        <div className="profile-setting">
          <div>
            <h3 style={{ margin: 0 }}>Hire Date</h3>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Correct the official hire date here if this team member was entered with the wrong start date.
              Pending training dates will re-sync automatically.
            </p>
          </div>
          {usingDemoData ? (
            <div className="pipeline-empty" style={{ minHeight: 0 }}>
              Hire date updates are available once Supabase is connected.
            </div>
          ) : (
            <form action={updateEmployeeHireDateAction} className="profile-setting-form">
              <input name="employee_id" type="hidden" value={employee.id} />
              <label className="field">
                <span>Hire Date</span>
                <input defaultValue={employee.hireDate} name="hire_date" type="date" />
              </label>
              <div className="button-row">
                <button className="button primary" type="submit">
                  Save hire date
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-setting">
          <div>
            <h3 style={{ margin: 0 }}>Starting Role</h3>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Set whether this team member begins in BOH or Cashier. Pending milestone dates will re-sync to match
              that training path.
            </p>
          </div>
          {usingDemoData ? (
            <div className="pipeline-empty" style={{ minHeight: 0 }}>
              Starting role and completion updates are available once Supabase is connected.
            </div>
          ) : (
            <form action={updateEmployeeStartingPositionAction} className="profile-setting-form">
              <input name="employee_id" type="hidden" value={employee.id} />
              <label className="field">
                <span>Starting Role</span>
                <select name="starting_position" defaultValue={employee.startingPosition}>
                  <option value="boh">BOH</option>
                  <option value="cashier">Cashier</option>
                </select>
              </label>
              <div className="button-row">
                <button className="button primary" type="submit">
                  Save starting role
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="training-module-list">
          {roadmap.map((item, index) => {
            const status = statusFromDueDate(item.dueDate, item.completedAt);
            const defaultCompletedAt = item.completedAt ?? item.dueDate;
            const scheduledLabel = item.scheduled && item.scheduledFor ? `Scheduled for ${formatDate(item.scheduledFor)}` : "Not scheduled yet";
            const moduleFormKey = `${item.id}-${item.dueDate}-${item.completedAt ?? "pending"}-${item.scheduledFor ?? "unscheduled"}`;

            return (
              <form key={moduleFormKey} action={updateEmployeeMilestoneCompletionAction} className="training-module-card">
                <input name="employee_id" type="hidden" value={employee.id} />
                <input name="milestone_key" type="hidden" value={item.milestoneKey} />

                <div className="training-module-main">
                  <div className="training-module-copy">
                    <div className="eyebrow" style={{ color: "#6b6259" }}>
                      Module {index + 1}
                    </div>
                    <h3>{getMilestoneLabel(item.milestoneKey)}</h3>
                    <div className="training-module-dates">
                      <p className="muted">Due {formatDate(item.dueDate)}</p>
                      <p className="muted">{scheduledLabel}</p>
                    </div>
                  </div>
                  <span className={`status-pill ${status}`}>{item.completedAt ? "Completed" : status.replace("_", " ")}</span>
                </div>

                {usingDemoData ? (
                  <div className="pipeline-empty" style={{ minHeight: 0 }}>
                    Completion controls are available once Supabase is connected.
                  </div>
                ) : (
                  <TrainingModuleControls
                    initialScheduled={item.scheduled}
                    initialScheduledFor={item.scheduledFor ?? ""}
                    initialCompleted={Boolean(item.completedAt)}
                    initialCompletedAt={defaultCompletedAt}
                  />
                )}
              </form>
            );
          })}
        </div>
      </article>
    </div>
  );
}
