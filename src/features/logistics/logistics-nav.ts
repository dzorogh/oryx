import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  Factory,
  Layers,
  Lock,
  MapPin,
  Package,
  PackageCheck,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Warehouse,
} from "lucide-react";
import type { ModuleSubnavGroup, ModuleSubnavItem } from "@/components/layout/module-subnav";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";

const item = (href: string, label: string, icon: LucideIcon): ModuleSubnavItem => ({
  href,
  label,
  icon,
});

export const LOGISTICS_SALES_NAV_ITEMS: ModuleSubnavItem[] = [
  item(LOGISTICS_PATHS.customerOrders, "Заказы клиента", ShoppingCart),
  item(LOGISTICS_PATHS.shipments, "Отгрузки и возвраты", Truck),
  item(LOGISTICS_PATHS.reservations, "Резервы", Lock),
];

export const LOGISTICS_PRODUCTION_NAV_ITEMS: ModuleSubnavItem[] = [
  item(LOGISTICS_PATHS.productionOrders, "Заказы на производство", Factory),
  item(LOGISTICS_PATHS.outputs, "Выпуски", PackageCheck),
  item(LOGISTICS_PATHS.calendar, "Календарь выпусков", CalendarDays),
];

export const LOGISTICS_WAREHOUSE_NAV_ITEMS: ModuleSubnavItem[] = [
  item(LOGISTICS_PATHS.stock, "Остатки", Layers),
  item(LOGISTICS_PATHS.transfers, "Перемещения", ArrowLeftRight),
  item(LOGISTICS_PATHS.adjustments, "Корректировки", SlidersHorizontal),
  item(LOGISTICS_PATHS.ledger, "Журнал", BookOpen),
];

export const LOGISTICS_DIRECTORY_NAV_ITEMS: ModuleSubnavItem[] = [
  item(LOGISTICS_PATHS.warehouses, "Склады", Warehouse),
  item(LOGISTICS_PATHS.regions, "Регионы", MapPin),
  item(LOGISTICS_PATHS.plants, "Заводы", Factory),
];

/** Flat list for layouts that still pass `subnavItems` (no icons — serializable). */
export const LOGISTICS_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_SALES_NAV_ITEMS,
  ...LOGISTICS_PRODUCTION_NAV_ITEMS,
  ...LOGISTICS_WAREHOUSE_NAV_ITEMS,
  ...LOGISTICS_DIRECTORY_NAV_ITEMS,
].map(({ href, label, exact }) => ({ href, label, exact }));

export const LOGISTICS_NAV_GROUPS: ModuleSubnavGroup[] = [
  { title: "Продажи", items: LOGISTICS_SALES_NAV_ITEMS },
  { title: "Производство", items: LOGISTICS_PRODUCTION_NAV_ITEMS },
  { title: "Склад", items: LOGISTICS_WAREHOUSE_NAV_ITEMS },
  { title: "Справочники", items: LOGISTICS_DIRECTORY_NAV_ITEMS },
];
