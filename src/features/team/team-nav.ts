import type { ModuleSubnavItem } from "@/components/layout/module-subnav";

export const TEAM_PROFILE_NAV_ITEM: ModuleSubnavItem = { href: "/team/users/1", label: "My Profile" };

export const TEAM_SECTION_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/team/structure", label: "Structure" },
  { href: "/team/users", label: "Users" },
  { href: "/team/timesheets", label: "Timesheets" },
  { href: "/team/assets", label: "Assets" },
  { href: "/team/districts", label: "Districts" },
  { href: "/team/branches", label: "Branches" },
  { href: "/team/warehouses", label: "Warehouses" },
  { href: "/team/divisions", label: "Divisions" },
  { href: "/team/talent-pool", label: "Talent Pool" },
  { href: "/team/positions", label: "Positions" },
  { href: "/team/grades", label: "Grades" },
  { href: "/team/activity", label: "Activity Log" },
];

export const TEAM_SUBNAV_ITEMS: ModuleSubnavItem[] = [TEAM_PROFILE_NAV_ITEM, ...TEAM_SECTION_NAV_ITEMS];
