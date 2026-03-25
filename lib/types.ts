export type AppRole = "company_admin" | "store_manager";

export type UserProfile = {
  id: string;
  appRole: AppRole;
  companyId: string;
  primaryStoreId: string | null;
  fullName: string | null;
};

export type AdminAccessUser = {
  id: string;
  fullName: string | null;
  email: string | null;
  appRole: AppRole;
  companyId: string;
  primaryStoreId: string | null;
  assignedStoreIds: string[];
  archived: boolean;
};

export type StartingPosition = "boh" | "cashier";

export type MilestoneKey =
  | "orientation"
  | "boh_training"
  | "cashier_training"
  | "academy_session_1"
  | "floor_support_proficiency"
  | "academy_session_2"
  | "academy_session_3"
  | "barista_graduation";

export type MilestoneStatus = "completed" | "on_track" | "due" | "overdue";

export type Store = {
  id: string;
  name: string;
  code: string;
  region: string;
  active: boolean;
};

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  roleTitle: string;
  hireDate: string;
  primaryStoreId: string;
  active: boolean;
  startingPosition: StartingPosition;
  trainerStatus: "on_track" | "at_risk" | "overdue";
  milestoneOverrides?: Partial<Record<MilestoneKey, MilestoneOverride>>;
  latteArt: {
    heart: boolean;
    rosetta: boolean;
    tulip: boolean;
  };
  milkTypes: {
    whole: boolean;
    skim: boolean;
    almond: boolean;
    oat: boolean;
  };
};

export type MilestoneOverride = {
  adjustedDate: string;
  reason: string;
};

export type CertificationRow = {
  id: string;
  employeeId: string;
  milestoneKey: MilestoneKey;
  dueDate: string;
  completedAt: string | null;
  scheduled: boolean;
  scheduledFor: string | null;
  waitingForAcademy: boolean;
};

export type StoreHealth = {
  store: Store;
  onTrack: number;
  overdue: number;
  total: number;
  score: number;
};
