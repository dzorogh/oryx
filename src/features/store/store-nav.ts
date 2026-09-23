import {
  ArrowUpDown,
  Package,
  Settings,
  Tag,
} from "lucide-react";
import type { ModuleSubnavGroup, ModuleSubnavItem } from "@/components/layout/module-subnav";
import {
  LOGISTICS_NAV_GROUPS,
  LOGISTICS_SUBNAV_ITEMS,
} from "@/features/logistics/logistics-nav";

export const STORE_MODULE_TITLE = "Магазин";

export const STORE_CATALOG_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/products", label: "Товары", icon: Package },
  { href: "/store/pim/pricelists", label: "Прайс-листы", icon: Tag },
];

export const STORE_FOOTER_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/import-export", label: "Импорт/Экспорт", icon: ArrowUpDown },
  { href: "/store/settings", label: "Настройки", icon: Settings },
];

export const STORE_NAV_GROUPS: ModuleSubnavGroup[] = [
  { title: "Каталог", items: STORE_CATALOG_NAV_ITEMS },
  ...LOGISTICS_NAV_GROUPS,
  { items: STORE_FOOTER_NAV_ITEMS },
];

/** Flat list for ModuleShell `subnavItems` (no icons — server layout cannot pass component refs). */
export const STORE_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...STORE_CATALOG_NAV_ITEMS,
  ...LOGISTICS_SUBNAV_ITEMS,
  ...STORE_FOOTER_NAV_ITEMS,
].map(({ href, label, exact }) => ({ href, label, exact }));
