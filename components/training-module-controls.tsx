"use client";

import { useState } from "react";

export function TrainingModuleControls({
  initialScheduled,
  initialScheduledFor,
  initialCompleted,
  initialCompletedAt
}: {
  initialScheduled: boolean;
  initialScheduledFor: string;
  initialCompleted: boolean;
  initialCompletedAt: string;
}) {
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [scheduledFor, setScheduledFor] = useState(initialScheduledFor);
  const [completed, setCompleted] = useState(initialCompleted);
  const [completedAt, setCompletedAt] = useState(initialCompletedAt);

  const syncCompletedAtFromSchedule = (nextScheduledFor: string) => {
    if (!nextScheduledFor) {
      return;
    }

    if (!completed || !completedAt || completedAt === scheduledFor) {
      setCompletedAt(nextScheduledFor);
    }
  };

  return (
    <div className="training-module-controls">
      <label className="training-toggle">
        <input
          checked={scheduled}
          name="scheduled"
          type="checkbox"
          value="true"
          onChange={(event) => {
            const isChecked = event.target.checked;
            setScheduled(isChecked);

            if (isChecked) {
              syncCompletedAtFromSchedule(scheduledFor);
            }
          }}
        />
        <span>Scheduled</span>
      </label>
      <label className="field">
        <span>Scheduled For</span>
        <input
          name="scheduled_for"
          type="date"
          value={scheduledFor}
          onChange={(event) => {
            const nextScheduledFor = event.target.value;
            setScheduledFor(nextScheduledFor);

            if (scheduled) {
              syncCompletedAtFromSchedule(nextScheduledFor);
            }
          }}
        />
      </label>
      <label className="training-toggle">
        <input
          checked={completed}
          name="completed"
          type="checkbox"
          value="true"
          onChange={(event) => {
            setCompleted(event.target.checked);
          }}
        />
        <span>Completed</span>
      </label>
      <label className="field">
        <span>Finished On</span>
        <input
          name="completed_at"
          type="date"
          value={completedAt}
          onChange={(event) => {
            setCompletedAt(event.target.value);
          }}
        />
      </label>
      <div className="button-row">
        <button className="button primary" type="submit">
          Save module
        </button>
      </div>
    </div>
  );
}
