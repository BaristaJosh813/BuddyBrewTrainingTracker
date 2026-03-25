import type { Employee, Store } from "@/lib/types";

export const demoStores: Store[] = [
  { id: "store-north", name: "North Loop", code: "NL01", region: "Twin Cities", active: true },
  { id: "store-river", name: "Riverfront", code: "RF02", region: "Chicago", active: true },
  { id: "store-market", name: "Market Square", code: "MS03", region: "Nashville", active: true },
  { id: "store-pine", name: "Pine Street", code: "PS04", region: "Seattle", active: true }
];

export const demoEmployees: Employee[] = [
  {
    id: "emp-ava",
    firstName: "Ava",
    lastName: "Morris",
    roleTitle: "Barista",
    hireDate: "2026-01-15",
    primaryStoreId: "store-north",
    active: true,
    startingPosition: "boh",
    trainerStatus: "on_track",
    latteArt: { heart: true, rosetta: false, tulip: false },
    milkTypes: { whole: true, skim: true, almond: true, oat: false }
  },
  {
    id: "emp-jonah",
    firstName: "Jonah",
    lastName: "Lee",
    roleTitle: "Shift Lead",
    hireDate: "2025-12-28",
    primaryStoreId: "store-north",
    active: true,
    startingPosition: "cashier",
    trainerStatus: "at_risk",
    milestoneOverrides: {
      academy_session_2: {
        adjustedDate: "2026-03-31",
        reason: "Trainer PTO coverage"
      }
    },
    latteArt: { heart: true, rosetta: true, tulip: false },
    milkTypes: { whole: true, skim: true, almond: true, oat: true }
  },
  {
    id: "emp-nina",
    firstName: "Nina",
    lastName: "Patel",
    roleTitle: "Barista",
    hireDate: "2025-10-05",
    primaryStoreId: "store-river",
    active: true,
    startingPosition: "boh",
    trainerStatus: "overdue",
    latteArt: { heart: true, rosetta: false, tulip: false },
    milkTypes: { whole: true, skim: false, almond: false, oat: true }
  },
  {
    id: "emp-luca",
    firstName: "Luca",
    lastName: "Ramirez",
    roleTitle: "Barista",
    hireDate: "2026-02-20",
    primaryStoreId: "store-market",
    active: true,
    startingPosition: "cashier",
    trainerStatus: "on_track",
    latteArt: { heart: false, rosetta: false, tulip: false },
    milkTypes: { whole: true, skim: false, almond: false, oat: false }
  },
  {
    id: "emp-sage",
    firstName: "Sage",
    lastName: "Kim",
    roleTitle: "Barista",
    hireDate: "2025-09-22",
    primaryStoreId: "store-pine",
    active: true,
    startingPosition: "boh",
    trainerStatus: "overdue",
    milestoneOverrides: {
      academy_session_3: {
        adjustedDate: "2026-03-20",
        reason: "Store launch staffing crunch"
      }
    },
    latteArt: { heart: true, rosetta: true, tulip: true },
    milkTypes: { whole: true, skim: true, almond: true, oat: true }
  }
];
