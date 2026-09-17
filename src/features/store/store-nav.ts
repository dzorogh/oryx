import type { ModuleSubnavItem } from "@/components/layout/module-subnav";
import {
  LOGISTICS_LEDGER_NAV_ITEMS,
  LOGISTICS_REST_NAV_ITEMS,
  LOGISTICS_TOP_NAV_ITEMS,
} from "@/features/logistics/logistics-nav";

export const STORE_CATALOG_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/products", label: "Products" },
  { href: "/store/pim/pricelists", label: "Pricelists" },
];

export const STORE_GENERAL_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/orders", label: "Orders" },
  { href: "/store/pim/import-export", label: "Import/Export" },
  { href: "/store/settings", label: "Settings" },
];

export const STORE_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_TOP_NAV_ITEMS,
  ...LOGISTICS_REST_NAV_ITEMS,
  ...STORE_CATALOG_NAV_ITEMS,
  ...STORE_GENERAL_NAV_ITEMS,
  ...LOGISTICS_LEDGER_NAV_ITEMS,
];
