import type { ModuleSubnavItem } from "@/components/layout/module-subnav";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";

export const LOGISTICS_OVERVIEW_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.stock, label: "Остатки" },
  { href: LOGISTICS_PATHS.customerOrders, label: "Заказы клиента" },
];

export const LOGISTICS_FLOW_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.productionOrders, label: "Заказы на производство" },
  { href: LOGISTICS_PATHS.transfers, label: "Перемещения" },
  { href: LOGISTICS_PATHS.shipments, label: "Отгрузки и возвраты" },
];

export const LOGISTICS_MORE_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.outputs, label: "Выпуски" },
  { href: LOGISTICS_PATHS.reservations, label: "Резервы" },
  { href: LOGISTICS_PATHS.adjustments, label: "Корректировки" },
  { href: LOGISTICS_PATHS.warehouses, label: "Склады" },
  { href: LOGISTICS_PATHS.regions, label: "Регионы" },
  { href: LOGISTICS_PATHS.plants, label: "Заводы" },
  { href: LOGISTICS_PATHS.ledger, label: "Журнал" },
];

export const LOGISTICS_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_OVERVIEW_NAV_ITEMS,
  ...LOGISTICS_FLOW_NAV_ITEMS,
  ...LOGISTICS_MORE_NAV_ITEMS,
];
