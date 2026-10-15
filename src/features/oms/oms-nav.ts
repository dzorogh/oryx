import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  Factory,
  Layers,
  Lock,
  PackageCheck,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import type { ModuleSubnavGroup, ModuleSubnavItem } from "@/components/layout/module-subnav";
import { OMS_PATHS } from "@/features/oms/oms-paths";

const item = (href: string, label: string, icon: LucideIcon): ModuleSubnavItem => ({
  href,
  label,
  icon,
});

export const OMS_SALES_NAV_ITEMS: ModuleSubnavItem[] = [
  item(OMS_PATHS.customerOrders, "Заказы клиента", ShoppingCart),
  item(OMS_PATHS.shipments, "Отгрузки и возвраты", Truck),
  item(OMS_PATHS.reservations, "Резервы", Lock),
];

export const OMS_PRODUCTION_NAV_ITEMS: ModuleSubnavItem[] = [
  item(OMS_PATHS.productionOrders, "Заказы на производство", Factory),
  item(OMS_PATHS.outputs, "Выпуски", PackageCheck),
  item(OMS_PATHS.calendar, "Календарь производства", CalendarDays),
];

export const OMS_WAREHOUSE_NAV_ITEMS: ModuleSubnavItem[] = [
  item(OMS_PATHS.stock, "Остатки", Layers),
  item(OMS_PATHS.transfers, "Перемещения", ArrowLeftRight),
  item(OMS_PATHS.adjustments, "Корректировки", SlidersHorizontal),
  item(OMS_PATHS.ledger, "Журнал", BookOpen),
];

/** Flat list for layouts that still pass `subnavItems` (no icons — serializable). */
export const OMS_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...OMS_SALES_NAV_ITEMS,
  ...OMS_PRODUCTION_NAV_ITEMS,
  ...OMS_WAREHOUSE_NAV_ITEMS,
].map(({ href, label, exact }) => ({ href, label, exact }));

export const OMS_NAV_GROUPS: ModuleSubnavGroup[] = [
  { title: "Продажи", items: OMS_SALES_NAV_ITEMS },
  { title: "Производство", items: OMS_PRODUCTION_NAV_ITEMS },
  { title: "Склад", items: OMS_WAREHOUSE_NAV_ITEMS },
];
