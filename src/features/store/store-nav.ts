import type { ModuleSubnavItem } from "@/components/layout/module-subnav";
import {
  LOGISTICS_FLOW_NAV_ITEMS,
  LOGISTICS_MORE_NAV_ITEMS,
  LOGISTICS_OVERVIEW_NAV_ITEMS,
} from "@/features/logistics/logistics-nav";

export const STORE_MODULE_TITLE = "Магазин";

export const STORE_PRIMARY_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/products", label: "Товары" },
  { href: "/store/pim/pricelists", label: "Прайс-листы" },
  ...LOGISTICS_OVERVIEW_NAV_ITEMS,
];

export const STORE_FLOW_NAV_ITEMS = LOGISTICS_FLOW_NAV_ITEMS;

export const STORE_MORE_NAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_MORE_NAV_ITEMS,
  { href: "/store/pim/import-export", label: "Импорт/Экспорт" },
  { href: "/store/settings", label: "Настройки" },
];

export const STORE_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...STORE_PRIMARY_NAV_ITEMS,
  ...STORE_FLOW_NAV_ITEMS,
  ...STORE_MORE_NAV_ITEMS,
];
