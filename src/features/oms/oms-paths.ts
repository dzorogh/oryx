/** Адреса OMS внутри магазина. Корень редиректит на остатки. */

export const OMS_BASE_PATH = "/store/oms";

export const omsPath = (...segments: Array<string | number>): string =>
  [OMS_BASE_PATH, ...segments.map(String)].join("/");

export const OMS_PATHS = {
  root: OMS_BASE_PATH,
  stock: omsPath("stock"),
  customerOrders: omsPath("customer-orders"),
  productionOrders: omsPath("production-orders"),
  outputs: omsPath("outputs"),
  calendar: omsPath("calendar"),
  transfers: omsPath("transfers"),
  shipments: omsPath("shipments"),
  returns: omsPath("returns"),
  reservations: omsPath("reservations"),
  adjustments: omsPath("adjustments"),
  ledger: omsPath("ledger"),
} as const;
