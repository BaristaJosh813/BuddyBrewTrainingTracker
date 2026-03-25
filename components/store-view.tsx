"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";

import { buildEmployeeRoadmap, formatDate, getMilestoneLabel, getNextMilestone, statusFromDueDate } from "@/lib/training";
import type { CertificationRow, Employee, Store } from "@/lib/types";

export function StoreView({
  stores,
  employees,
  archivedEmployees,
  certificationsByEmployee,
  isCompanyAdmin,
  initialStoreId,
  usingDemoData
}: {
  stores: Store[];
  employees: Employee[];
  archivedEmployees: Employee[];
  certificationsByEmployee: Record<string, CertificationRow[]>;
  isCompanyAdmin: boolean;
  initialStoreId: string;
  usingDemoData: boolean;
}) {
  const employeeHref = (employeeId: string) => `/employees/${employeeId}` as Route;
  const [storeQuery, setStoreQuery] = useState("");
  const deferredStoreQuery = useDeferredValue(storeQuery);
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId || stores[0]?.id || "");
  const [rosterFilter, setRosterFilter] = useState<"active" | "archived">("active");

  const visibleStores = useMemo(() => {
    if (!isCompanyAdmin) {
      return stores;
    }

    const normalizedQuery = deferredStoreQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return stores;
    }

    return stores.filter((store) => {
      const searchText = `${store.name} ${store.code} ${store.region}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
  }, [deferredStoreQuery, isCompanyAdmin, selectedStoreId, stores]);

  const focusStore = stores.find((store) => store.id === selectedStoreId) ?? visibleStores[0] ?? stores[0];
  const activeStoreEmployees = employees.filter((employee) => employee.primaryStoreId === focusStore?.id);
  const archivedStoreEmployees = archivedEmployees.filter((employee) => employee.primaryStoreId === focusStore?.id);
  const storeEmployees = rosterFilter === "active" ? activeStoreEmployees : archivedStoreEmployees;

  if (!focusStore) {
    return <div className="card">No store is available for this user yet.</div>;
  }

  return (
    <div className="grid">
      <div className="page-header">
        <div className="page-copy">
          <div className="eyebrow" style={{ color: "#6b6259" }}>
            Buddy Brew Cafe View
          </div>
          <h1>{focusStore.name} training roster</h1>
          <p>
            {isCompanyAdmin
              ? "Operations leaders can search across every Buddy Brew cafe to quickly inspect onboarding and development progress."
              : "Cafe leaders only see the cafes assigned to them, and every employee list here is limited to those locations."}
          </p>
        </div>
      </div>

      {isCompanyAdmin || stores.length > 1 ? (
        <section className="card roster-board">
          <div className="page-header" style={{ marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0 }}>{isCompanyAdmin ? "Cafe Switcher" : "Assigned Cafes"}</h2>
              <p className="muted">
                {isCompanyAdmin
                  ? "Search by cafe name, code, or region, then jump straight into that location&apos;s training roster."
                  : "Switch between the cafes assigned to your account."}
              </p>
            </div>
          </div>

          {isCompanyAdmin ? (
            <label className="field store-search-field">
              <span>Find a cafe</span>
              <input
                type="search"
                value={storeQuery}
                onChange={(event) => setStoreQuery(event.target.value)}
                placeholder="Search Hyde Park, HP01, Tampa..."
              />
            </label>
          ) : null}

          <div className="store-toggle-row">
            {visibleStores.map((store) => (
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

          {visibleStores.length === 0 ? (
            <div className="pipeline-empty">No cafes matched that search. Try a different name, code, or region.</div>
          ) : null}
        </section>
      ) : null}

      <section className="card table-card">
        <div className="page-header" style={{ marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0 }}>{rosterFilter === "active" ? "Cafe Roster" : "Archived Employees"}</h2>
            <p className="muted">
              {rosterFilter === "active"
                ? "Quickly review Buddy Brew onboarding progress and open each team member&apos;s digital training card."
                : "Review past team members without mixing them into the live cafe roster."}
            </p>
          </div>
        </div>
        <div className="roster-filter-row">
          <button
            type="button"
            className={`roster-filter-card ${rosterFilter === "active" ? "active" : ""}`}
            onClick={() => setRosterFilter("active")}
          >
            <strong>Current Employees</strong>
            <span>{activeStoreEmployees.length} in this cafe</span>
          </button>
          <button
            type="button"
            className={`roster-filter-card roster-filter-card-secondary ${rosterFilter === "archived" ? "active" : ""}`}
            onClick={() => setRosterFilter("archived")}
          >
            <strong>Archived Employees</strong>
            <span>{archivedStoreEmployees.length} past team members</span>
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Hire Date</th>
                <th>Next Milestone</th>
                <th>Scheduled For</th>
                <th>Roadmap Status</th>
                <th>Progress</th>
                {isCompanyAdmin && !usingDemoData ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {storeEmployees.length === 0 ? (
                <tr>
                  <td colSpan={isCompanyAdmin && !usingDemoData ? 7 : 6}>
                    <div className="pipeline-empty" style={{ minHeight: 0 }}>
                      {rosterFilter === "active"
                        ? "No active employees are assigned to this cafe right now."
                        : "No archived employees are recorded for this cafe yet."}
                    </div>
                  </td>
                </tr>
              ) : null}
              {storeEmployees.map((employee) => {
                const roadmap = buildEmployeeRoadmap(employee, certificationsByEmployee[employee.id]);
                const completeCount = roadmap.filter((row) => row.completedAt).length;
                const progress = Math.round((completeCount / roadmap.length) * 100);
                const nextMilestone = getNextMilestone(employee, certificationsByEmployee[employee.id]);
                const status = nextMilestone ? statusFromDueDate(nextMilestone.dueDate, nextMilestone.completedAt) : "completed";

                return (
                  <tr key={employee.id}>
                    <td>
                      <Link href={employeeHref(employee.id)}>
                        {employee.firstName} {employee.lastName}
                      </Link>
                    </td>
                    <td>{formatDate(employee.hireDate)}</td>
                    <td>{nextMilestone ? getMilestoneLabel(nextMilestone.milestoneKey) : "Completed"}</td>
                    <td>{nextMilestone?.scheduled && nextMilestone.scheduledFor ? formatDate(nextMilestone.scheduledFor) : "Not scheduled"}</td>
                    <td>
                      <span className={`status-pill ${status}`}>{status.replace("_", " ")}</span>
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <div className="progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                    </td>
                    {isCompanyAdmin && !usingDemoData ? (
                      <td>
                        <Link className="button secondary compact" href={employeeHref(employee.id)}>
                          View profile
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
