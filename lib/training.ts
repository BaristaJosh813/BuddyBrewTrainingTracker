import type {
  CertificationRow,
  Employee,
  MilestoneKey,
  MilestoneOverride,
  MilestoneStatus,
  StartingPosition,
  Store,
  StoreHealth
} from "@/lib/types";

type MilestoneDefinition = {
  key: MilestoneKey;
  label: string;
  dayOffset: number;
  academySession: boolean;
  autoComplete?: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const milestoneCatalog: Record<MilestoneKey, MilestoneDefinition> = {
  orientation: { key: "orientation", label: "Orientation", dayOffset: 0, academySession: false, autoComplete: true },
  boh_training: { key: "boh_training", label: "BOH", dayOffset: 7, academySession: false },
  cashier_training: { key: "cashier_training", label: "Cashier", dayOffset: 7, academySession: false },
  academy_session_1: { key: "academy_session_1", label: "Slow Bar", dayOffset: 21, academySession: true },
  floor_support_proficiency: {
    key: "floor_support_proficiency",
    label: "Floor Support",
    dayOffset: 60,
    academySession: false
  },
  academy_session_2: { key: "academy_session_2", label: "Dial In", dayOffset: 90, academySession: true },
  academy_session_3: { key: "academy_session_3", label: "Certified Barista Training", dayOffset: 165, academySession: true },
  barista_graduation: {
    key: "barista_graduation",
    label: "Certified Barista",
    dayOffset: 180,
    academySession: false
  }
};

export const milestoneDefinitions: MilestoneDefinition[] = [
  milestoneCatalog.orientation,
  milestoneCatalog.boh_training,
  milestoneCatalog.cashier_training,
  milestoneCatalog.academy_session_1,
  milestoneCatalog.floor_support_proficiency,
  milestoneCatalog.academy_session_2,
  milestoneCatalog.academy_session_3,
  milestoneCatalog.barista_graduation
];

export function getMilestoneDefinition(key: MilestoneKey) {
  return milestoneCatalog[key];
}

export function getMilestoneLabel(key: MilestoneKey) {
  return getMilestoneDefinition(key)?.label ?? key.replaceAll("_", " ");
}

export function addDays(date: string, days: number) {
  const next = new Date(date);
  next.setUTCHours(12, 0, 0, 0);
  return new Date(next.getTime() + days * DAY_IN_MS).toISOString().slice(0, 10);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00Z`));
}

function compareToToday(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / DAY_IN_MS);
}

export function statusFromDueDate(dueDate: string, completedAt: string | null): MilestoneStatus {
  if (completedAt) {
    return "completed";
  }
  const daysUntil = compareToToday(dueDate);
  if (daysUntil < 0) {
    return "overdue";
  }
  if (daysUntil <= 7) {
    return "due";
  }
  return "on_track";
}

function getMilestoneDefinitionsForEmployee(employee: Pick<Employee, "startingPosition">): MilestoneDefinition[] {
  const earlyMilestones =
    employee.startingPosition === "cashier"
      ? [
          { ...milestoneCatalog.cashier_training, dayOffset: 7 },
          { ...milestoneCatalog.boh_training, dayOffset: 14 },
          { ...milestoneCatalog.academy_session_1, dayOffset: 21 }
        ]
      : [
          { ...milestoneCatalog.boh_training, dayOffset: 7 },
          { ...milestoneCatalog.academy_session_1, dayOffset: 14 },
          { ...milestoneCatalog.cashier_training, dayOffset: 21 }
        ];

  return [
    milestoneCatalog.orientation,
    ...earlyMilestones,
    milestoneCatalog.floor_support_proficiency,
    milestoneCatalog.academy_session_2,
    milestoneCatalog.academy_session_3,
    milestoneCatalog.barista_graduation
  ];
}

export function formatStartingPosition(startingPosition: StartingPosition) {
  return startingPosition === "boh" ? "BOH" : "Cashier";
}

export function buildEmployeeRoadmap(employee: Employee, certifications?: CertificationRow[]): CertificationRow[] {
  const definitions = getMilestoneDefinitionsForEmployee(employee);

  if (certifications && certifications.length > 0) {
    return definitions.map((definition) => {
      const matched = certifications.find((item) => item.milestoneKey === definition.key);
      if (matched) {
        if (definition.autoComplete) {
          return {
            ...matched,
            dueDate: employee.hireDate,
            completedAt: employee.hireDate,
            waitingForAcademy: false
          };
        }

        return matched;
      }

      const dueDate = addDays(employee.hireDate, definition.dayOffset);
      return {
        id: `${employee.id}-${definition.key}`,
        employeeId: employee.id,
        milestoneKey: definition.key,
        dueDate,
        completedAt: definition.autoComplete ? employee.hireDate : null,
        scheduled: false,
        scheduledFor: null,
        waitingForAcademy: definition.academySession && compareToToday(dueDate) <= 0
      };
    });
  }

  return definitions.map((definition) => {
    const override = employee.milestoneOverrides?.[definition.key];
    const dueDate = override?.adjustedDate ?? addDays(employee.hireDate, definition.dayOffset);
    const completedAt = definition.autoComplete ? employee.hireDate : null;

    return {
      id: `${employee.id}-${definition.key}`,
      employeeId: employee.id,
      milestoneKey: definition.key,
      dueDate,
      completedAt,
      scheduled: false,
      scheduledFor: null,
      waitingForAcademy: definition.academySession && !completedAt && compareToToday(dueDate) <= 0
    };
  });
}

export function getNextMilestone(employee: Employee, certifications?: CertificationRow[]) {
  return buildEmployeeRoadmap(employee, certifications).find((row) => row.completedAt === null);
}

export function getLastCompletedMilestone(employee: Employee, certifications?: CertificationRow[]) {
  const roadmap = buildEmployeeRoadmap(employee, certifications);
  const completed = roadmap.filter((row) => row.completedAt !== null);
  return completed.at(-1) ?? null;
}

export function isCertifiedBarista(employee: Employee, certifications?: CertificationRow[]) {
  const roadmap = buildEmployeeRoadmap(employee, certifications);
  const graduationMilestone = roadmap.find((row) => row.milestoneKey === "barista_graduation");
  return Boolean(graduationMilestone?.completedAt);
}

export function getStoreHealth(
  stores: Store[],
  employees: Employee[],
  certificationsByEmployee?: Record<string, CertificationRow[]>
): StoreHealth[] {
  return stores.map((store) => {
    const storeEmployees = employees.filter((employee) => employee.primaryStoreId === store.id);
    const summary = storeEmployees.reduce(
      (acc, employee) => {
        const nextMilestone = getNextMilestone(employee, certificationsByEmployee?.[employee.id]);
        const status = nextMilestone ? statusFromDueDate(nextMilestone.dueDate, nextMilestone.completedAt) : "completed";
        if (status === "overdue") {
          acc.overdue += 1;
        } else {
          acc.onTrack += 1;
        }
        acc.total += 1;
        return acc;
      },
      { onTrack: 0, overdue: 0, total: 0 }
    );

    return {
      store,
      ...summary,
      score: summary.total === 0 ? 100 : Math.round((summary.onTrack / summary.total) * 100)
    };
  });
}

export function getAcademyQueue(employees: Employee[], certificationsByEmployee?: Record<string, CertificationRow[]>) {
  return employees.flatMap((employee) => {
    return buildEmployeeRoadmap(employee, certificationsByEmployee?.[employee.id])
      .filter((row) => row.waitingForAcademy)
      .map((row) => {
        return {
          employee,
          milestone: getMilestoneLabel(row.milestoneKey),
          dueDate: row.dueDate,
          status: statusFromDueDate(row.dueDate, row.completedAt)
        };
      });
  });
}

export function getMilestoneOverrideText(override?: MilestoneOverride) {
  if (!override) {
    return "No adjustment";
  }
  return `${formatDate(override.adjustedDate)} - ${override.reason}`;
}
