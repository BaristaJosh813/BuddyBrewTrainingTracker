"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";

type StoreRosterOption = {
  id: string;
  label: string;
};

export function StoreRosterSwitcher({
  currentEmployeeId,
  options
}: {
  currentEmployeeId: string;
  options: StoreRosterOption[];
}) {
  const router = useRouter();

  return (
    <label className="field profile-roster-switcher">
      <span>Switch team member</span>
      <select
        aria-label="Select another employee from this store"
        value={currentEmployeeId}
        onChange={(event) => {
          const nextEmployeeId = event.target.value;
          if (!nextEmployeeId || nextEmployeeId === currentEmployeeId) {
            return;
          }

          router.push(`/employees/${nextEmployeeId}` as Route);
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
