import type { ModuleSubnavItem } from "@/components/layout/module-subnav";

// Каталожная часть навигации — зависит от выбранного каталога (переключатель сверху).
export const STORE_CATALOG_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/products", label: "Products" },
  { href: "/store/pim/pricelists", label: "Pricelists" },
  { href: "/store/pim/import-export", label: "Import/Export" },
];

// Общие разделы Store — не зависят от выбранного каталога.
export const STORE_GENERAL_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/orders", label: "Orders" },
  { href: "/store/settings", label: "Settings" },
];

export const STORE_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...STORE_CATALOG_NAV_ITEMS,
  ...STORE_GENERAL_NAV_ITEMS,
];
