"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";

import {
  formatDate,
  getLastCompletedMilestone,
  getMilestoneLabel,
  getNextMilestone,
  getStoreHealth,
  isCertifiedBarista,
  statusFromDueDate
} from "@/lib/training";
import type { CertificationRow, Employee, MilestoneKey, Store } from "@/lib/types";

type PipelineSection = {
  title: string;
  keys: MilestoneKey[];
  defaultKey: MilestoneKey;
};

type TileAssignment = Record<string, MilestoneKey | null>;

const pipelineSections: PipelineSection[] = [
  {
    title: "Cashier Training",
    keys: ["cashier_training"],
    defaultKey: "cashier_training"
  },
  {
    title: "BOH Training",
    keys: ["boh_training"],
    defaultKey: "boh_training"
  },
  {
    title: "Floor Support / Slow Bar Training",
    keys: ["academy_session_1", "floor_support_proficiency"],
    defaultKey: "academy_session_1"
  },
  {
    title: "Dial In Training",
    keys: ["academy_session_2"],
    defaultKey: "academy_session_2"
  },
  {
    title: "Certified Barista Training",
    keys: ["academy_session_3", "barista_graduation"],
    defaultKey: "academy_session_3"
  }
];

function buildInitialAssignments(
  employees: Employee[],
  certificationsByEmployee: Record<string, CertificationRow[]>
): TileAssignment {
  return employees.reduce<TileAssignment>((acc, employee) => {
    const nextMilestone = getNextMilestone(employee, certificationsByEmployee[employee.id]);
    if (!nextMilestone) {
      acc[employee.id] = null;
      return acc;
    }

    const status = statusFromDueDate(nextMilestone.dueDate, nextMilestone.completedAt);
    const section = pipelineSections.find((item) => item.keys.includes(nextMilestone.milestoneKey));

    acc[employee.id] = section && (status === "due" || status === "overdue") ? section.defaultKey : null;
    return acc;
  }, {});
}

export function DashboardView({
  stores,
  employees,
  certificationsByEmployee
}: {
  stores: Store[];
  employees: Employee[];
  certificationsByEmployee: Record<string, CertificationRow[]>;
}) {
  const employeeHref = (employeeId: string) => `/employees/${employeeId}` as Route;
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? "");
  const [assignments, setAssignments] = useState<TileAssignment>(() => buildInitialAssignments(employees, certificationsByEmployee));
  const [activeDropKey, setActiveDropKey] = useState<MilestoneKey | null>(null);

  const health = useMemo(
    () => getStoreHealth(stores, employees, certificationsByEmployee),
    [stores, employees, certificationsByEmployee]
  );

  const employeeSummaries = useMemo(
    () =>
      employees.map((employee) => {
        const certifications = certificationsByEmployee[employee.id];
        const store = stores.find((item) => item.id === employee.primaryStoreId);
        const nextMilestone = getNextMilestone(employee, certifications);
        const lastCompletedMilestone = getLastCompletedMilestone(employee, certifications);
        const status = nextMilestone ? statusFromDueDate(nextMilestone.dueDate, nextMilestone.completedAt) : "completed";

        return {
          employee,
          store,
          nextMilestone,
          lastCompletedMilestone,
          status,
          isCertified: isCertifiedBarista(employee, certifications)
        };
      }),
    [employees, certificationsByEmployee, stores]
  );

  const certifiedCount = employeeSummaries.filter((item) => item.isCertified).length;
  const certifiedPercent = employees.length === 0 ? 0 : Math.round((certifiedCount / employees.length) * 100);

  const nextMilestones = employeeSummaries.filter(
    (item): item is (typeof employeeSummaries)[number] & { nextMilestone: NonNullable<(typeof item)["nextMilestone"]> } =>
      item.nextMilestone !== null
  );

  const storeEmployees = employeeSummaries
    .filter((item) => item.employee.primaryStoreId === selectedStoreId)
    .sort((left, right) => left.employee.lastName.localeCompare(right.employee.lastName));

  const assignEmployeeToTile = (employeeId: string, milestoneKey: MilestoneKey) => {
    setAssignments((current) => ({
      ...current,
      [employeeId]: milestoneKey
    }));
    setActiveDropKey(null);
  };

  return (
    <div className="grid">
      <div className="page-header">
        <div className="page-copy">
          <div className="eyebrow" style={{ color: "#6b6259" }}>
            Buddy Brew Coffee
          </div>
          <h1>Training readiness across every cafe</h1>
          <p>
            Track onboarding progress across the Buddy Brew cafe team, spot coaching gaps early, and keep each location
            aligned on barista development milestones.
          </p>
        </div>
      </div>

      <section className="card certification-hero">
        <div>
          <div className="eyebrow" style={{ color: "#6b6259" }}>
            Buddy Brew Progress
          </div>
          <h2 style={{ margin: "8px 0 10px" }}>Cafe team members progressing toward Buddy Brew barista certification</h2>
          <p className="muted" style={{ maxWidth: 640 }}>
            Use this company-wide snapshot to see how much of the Buddy Brew roster has completed the full training
            pathway and where additional coaching may be needed.
          </p>
        </div>

        <div className="certification-hero-metrics">
          <div className="certification-total">{employees.length}</div>
          <div className="certification-copy">
            <strong>
              {certifiedCount} of {employees.length} certified
            </strong>
            <div className="table-meta">{employees.length - certifiedCount} still moving through the Buddy Brew path</div>
          </div>
        </div>

        <div className="progress certification-progress">
          <span style={{ width: `${certifiedPercent}%` }} />
        </div>

        <div className="certification-foot">
          <span className="pipeline-count">{certifiedPercent}% certified</span>
        </div>
      </section>

      <section className="dashboard-hero">
        <div className="grid cols-3">
          {pipelineSections.map((section) => {
            const employeesInStage = nextMilestones
              .filter((item) => assignments[item.employee.id] && section.keys.includes(assignments[item.employee.id] as MilestoneKey))
              .sort((left, right) => left.nextMilestone.dueDate.localeCompare(right.nextMilestone.dueDate));

            return (
              <article
                key={section.title}
                className={`pipeline-card pipeline-dropzone ${activeDropKey === section.defaultKey ? "active" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setActiveDropKey(section.defaultKey);
                }}
                onDragLeave={() => {
                  setActiveDropKey((current) => (current === section.defaultKey ? null : current));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const employeeId = event.dataTransfer.getData("text/plain");
                  if (employeeId) {
                    assignEmployeeToTile(employeeId, section.defaultKey);
                  }
                }}
              >
                <div className="pipeline-card-header">
                  <div>
                    <div className="eyebrow" style={{ color: "#6b6259" }}>
                      Upcoming Buddy Brew Training
                    </div>
                    <h2 style={{ margin: "4px 0 8px" }}>{section.title}</h2>
                  </div>
                  <div className="pipeline-count">{employeesInStage.length} scheduled</div>
                </div>
                <div className="pipeline-list">
                  {employeesInStage.length > 0 ? (
                    employeesInStage.map((item) => (
                      <div
                        key={`${section.title}-${item.employee.id}`}
                        className="pipeline-person draggable-card"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", item.employee.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setActiveDropKey(null);
                        }}
                      >
                        <div>
                          <strong>
                            {item.employee.firstName} {item.employee.lastName}
                          </strong>
                          <div className="table-meta">
                            {item.store?.name ?? "Unknown store"} · {item.employee.roleTitle}
                          </div>
                        </div>
                        <div className="pipeline-person-meta">
                          <span className={`status-pill ${item.status}`}>{item.status.replace("_", " ")}</span>
                          <span className="table-meta">
                            {item.nextMilestone.scheduled && item.nextMilestone.scheduledFor
                              ? `Scheduled ${formatDate(item.nextMilestone.scheduledFor)}`
                              : `Due ${formatDate(item.nextMilestone.dueDate)}`}
                          </span>
                          <Link className="button secondary compact pipeline-profile-link" draggable={false} href={employeeHref(item.employee.id)}>
                            View profile
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="pipeline-empty">Drop team members here to build this upcoming Buddy Brew training group.</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Company Heat Map</h2>
            <p className="muted">Health score is based on the ratio of on-track versus overdue employees for the next milestone.</p>
          </div>
        </div>

        <div className="grid cols-4">
          {health.map((item) => {
            const tone = item.score >= 80 ? "good" : item.score >= 60 ? "warn" : "bad";
            return (
              <article key={item.store.id} className="heat-card">
                <div>
                  <div className={`score-pill ${tone}`}>{item.score}% healthy</div>
                  <h3 style={{ marginBottom: 6 }}>{item.store.name}</h3>
                  <p className="muted" style={{ marginTop: 0 }}>
                    {item.store.code} · {item.store.region}
                  </p>
                </div>
                <div className="grid" style={{ gap: 10 }}>
                  <div className="progress">
                    <span style={{ width: `${item.score}%` }} />
                  </div>
                  <div className="table-meta">
                    {item.onTrack} on track · {item.overdue} overdue · {item.total} total
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card roster-board">
        <div className="page-header" style={{ marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Cafe Training Board</h2>
            <p className="muted">
              Toggle between Buddy Brew cafes to review each roster, then drag team members into the training queues above.
            </p>
          </div>
        </div>

        <div className="store-toggle-row">
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              className={`store-toggle ${selectedStoreId === store.id ? "active" : ""}`}
              onClick={() => setSelectedStoreId(store.id)}
            >
              <strong>{store.name}</strong>
              <span>
                {store.code} · {store.region}
              </span>
            </button>
          ))}
        </div>

        <div className="store-employee-list">
          {storeEmployees.map((item) => (
            <div
              key={item.employee.id}
              className="store-employee-card"
            >
              <div className="store-employee-main">
                <div>
                  <div className="store-employee-title">
                    <strong>
                      {item.employee.firstName} {item.employee.lastName}
                    </strong>
                    <span className={`status-pill ${item.status}`}>{item.status.replace("_", " ")}</span>
                  </div>
                  <div className="table-meta">
                    {item.employee.roleTitle} · {item.store?.name ?? "Unknown store"}
                  </div>
                </div>
                <Link className="button secondary" href={employeeHref(item.employee.id)}>
                  Open profile
                </Link>
              </div>

              <div className="store-employee-grid">
                <div className="store-employee-meta">
                  <span className="eyebrow" style={{ color: "#6b6259" }}>
                    Last Training
                  </span>
                  <strong>{item.lastCompletedMilestone ? getMilestoneLabel(item.lastCompletedMilestone.milestoneKey) : "Not started yet"}</strong>
                </div>
                <div className="store-employee-meta">
                  <span className="eyebrow" style={{ color: "#6b6259" }}>
                    Next Course
                  </span>
                  <strong>{item.nextMilestone ? getMilestoneLabel(item.nextMilestone.milestoneKey) : "Certified barista"}</strong>
                </div>
                <div className="store-employee-meta">
                  <span className="eyebrow" style={{ color: "#6b6259" }}>
                    Scheduled For
                  </span>
                  <strong>
                    {item.nextMilestone?.scheduled && item.nextMilestone.scheduledFor
                      ? formatDate(item.nextMilestone.scheduledFor)
                      : item.nextMilestone
                        ? "Not scheduled"
                        : "Completed"}
                  </strong>
                </div>
                <div className="store-employee-meta">
                  <span className="eyebrow" style={{ color: "#6b6259" }}>
                    Due Date
                  </span>
                  <strong>{item.nextMilestone ? formatDate(item.nextMilestone.dueDate) : "Completed"}</strong>
                </div>
              </div>
            </div>
          ))}

          {storeEmployees.length === 0 ? <div className="pipeline-empty">No employees are assigned to this store yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
