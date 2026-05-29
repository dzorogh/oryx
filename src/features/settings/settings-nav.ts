import type { ModuleSubnavItem } from "@/components/layout/module-subnav";

export const SETTINGS_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/settings/auth", label: "Auth System" },
  { href: "/settings/roles", label: "Roles (deprecated)" },
  { href: "/settings/tenants", label: "Tenants" },
  { href: "/settings/search-synonyms", label: "Synonyms for search" },
  { href: "/settings/companies", label: "Companies" },
  { href: "/settings/apps", label: "Apps" },
  { href: "/settings/announcements", label: "Announcements" },
];
