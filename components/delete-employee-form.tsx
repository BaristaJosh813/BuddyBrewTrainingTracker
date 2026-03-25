"use client";

import { setEmployeeArchivedAction } from "@/app/admin/actions";

export function ArchiveEmployeeForm({
  employeeId,
  employeeName,
  archived,
  redirectTo,
  compact = false
}: {
  employeeId: string;
  employeeName: string;
  archived: boolean;
  redirectTo?: string;
  compact?: boolean;
}) {
  return (
    <form
      action={setEmployeeArchivedAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          archived
            ? `Restore ${employeeName} to the active cafe roster?`
            : `Archive ${employeeName}? They will be removed from the current cafe employee list but kept in past employee records.`
        );
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input name="employee_id" type="hidden" value={employeeId} />
      <input name="archive" type="hidden" value={archived ? "false" : "true"} />
      {redirectTo ? <input name="redirect_to" type="hidden" value={redirectTo} /> : null}
      <button className={`button danger${compact ? " compact" : ""}`} type="submit">
        {archived ? "Restore employee" : "Archive employee"}
      </button>
    </form>
  );
}
