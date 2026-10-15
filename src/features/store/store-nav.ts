import {
  ArrowUpDown,
  Factory,
  MapPin,
  Package,
  Settings,
  Tag,
  Warehouse,
} from "lucide-react";
import type { ModuleSubnavGroup, ModuleSubnavItem } from "@/components/layout/module-subnav";
import { OMS_NAV_GROUPS, OMS_SUBNAV_ITEMS } from "@/features/oms/oms-nav";
import { STORE_DIRECTORY_PATHS } from "@/features/store/store-paths";

export const STORE_MODULE_TITLE = "Магазин";

export const STORE_CATALOG_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/products", label: "Товары", icon: Package },
  { href: "/store/pim/pricelists", label: "Прайс-листы", icon: Tag },
];

export const STORE_DIRECTORY_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: STORE_DIRECTORY_PATHS.warehouses, label: "Склады", icon: Warehouse },
  { href: STORE_DIRECTORY_PATHS.regions, label: "Регионы", icon: MapPin },
  { href: STORE_DIRECTORY_PATHS.plants, label: "Заводы", icon: Factory },
];

export const STORE_FOOTER_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/store/pim/import-export", label: "Импорт/Экспорт", icon: ArrowUpDown },
  { href: "/store/settings", label: "Настройки", icon: Settings },
];

export const STORE_NAV_GROUPS: ModuleSubnavGroup[] = [
  { title: "Каталог", items: STORE_CATALOG_NAV_ITEMS },
  { title: "Справочники", items: STORE_DIRECTORY_NAV_ITEMS },
  ...OMS_NAV_GROUPS,
  { items: STORE_FOOTER_NAV_ITEMS },
];

/** Flat list for ModuleShell `subnavItems` (no icons — server layout cannot pass component refs). */
export const STORE_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...STORE_CATALOG_NAV_ITEMS,
  ...STORE_DIRECTORY_NAV_ITEMS,
  ...OMS_SUBNAV_ITEMS,
  ...STORE_FOOTER_NAV_ITEMS,
].map(({ href, label, exact }) => ({ href, label, exact }));
