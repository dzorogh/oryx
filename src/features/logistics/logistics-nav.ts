import type { ModuleSubnavItem } from "@/components/layout/module-subnav";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";

export const LOGISTICS_TOP_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.stock, label: "Stock" },
  { href: LOGISTICS_PATHS.customerOrders, label: "Customer orders" },
];

const LOGISTICS_OPERATION_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.productionOrders, label: "Production orders" },
  { href: LOGISTICS_PATHS.outputs, label: "Outputs" },
  { href: LOGISTICS_PATHS.transfers, label: "Transfers" },
  { href: LOGISTICS_PATHS.shipments, label: "Shipments" },
  { href: LOGISTICS_PATHS.returns, label: "Returns" },
];

export const LOGISTICS_MAIN_NAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_TOP_NAV_ITEMS,
  ...LOGISTICS_OPERATION_NAV_ITEMS,
];

export const LOGISTICS_CATALOG_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.warehouses, label: "Warehouses" },
  { href: LOGISTICS_PATHS.manufacturers, label: "Plants" },
];

export const LOGISTICS_TECHNICAL_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.reservations, label: "Reservations" },
];

export const LOGISTICS_LEDGER_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.ledger, label: "Ledger" },
];

export const LOGISTICS_REST_NAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_OPERATION_NAV_ITEMS,
  ...LOGISTICS_CATALOG_NAV_ITEMS,
  ...LOGISTICS_TECHNICAL_NAV_ITEMS,
];

export const LOGISTICS_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_TOP_NAV_ITEMS,
  ...LOGISTICS_REST_NAV_ITEMS,
  ...LOGISTICS_LEDGER_NAV_ITEMS,
];
