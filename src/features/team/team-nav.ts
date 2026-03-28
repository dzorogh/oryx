import type { ModuleSubnavItem } from "@/components/layout/module-subnav";

export const TEAM_PROFILE_NAV_ITEM: ModuleSubnavItem = { href: "/team/users/1", label: "Мой профиль" };

export const TEAM_SECTION_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/team/users", label: "Сотрудники" },
  { href: "/team/divisions", label: "Подразделения" },
  { href: "/team/timesheets", label: "Табели" },
  { href: "/team/assets", label: "Активы" },
];

export const TEAM_SUBNAV_ITEMS: ModuleSubnavItem[] = [TEAM_PROFILE_NAV_ITEM, ...TEAM_SECTION_NAV_ITEMS];
