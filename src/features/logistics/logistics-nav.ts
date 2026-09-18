import type { ModuleSubnavItem } from "@/components/layout/module-subnav";
import { LOGISTICS_PATHS } from "@/features/logistics/logistics-paths";

export const LOGISTICS_OVERVIEW_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.customerOrders, label: "Orders" },
  { href: LOGISTICS_PATHS.stock, label: "Stock" },
];

export const LOGISTICS_FLOW_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.productionOrders, label: "Production orders" },
  { href: LOGISTICS_PATHS.transfers, label: "Transfers" },
  { href: LOGISTICS_PATHS.shipments, label: "Shipments" },
];

export const LOGISTICS_MORE_NAV_ITEMS: ModuleSubnavItem[] = [
  { href: LOGISTICS_PATHS.outputs, label: "Outputs" },
  { href: LOGISTICS_PATHS.reservations, label: "Reservations" },
  { href: LOGISTICS_PATHS.returns, label: "Returns" },
  { href: LOGISTICS_PATHS.warehouses, label: "Warehouses" },
  { href: LOGISTICS_PATHS.manufacturers, label: "Plants" },
  { href: LOGISTICS_PATHS.ledger, label: "Ledger" },
];

export const LOGISTICS_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  ...LOGISTICS_OVERVIEW_NAV_ITEMS,
  ...LOGISTICS_FLOW_NAV_ITEMS,
  ...LOGISTICS_MORE_NAV_ITEMS,
];
