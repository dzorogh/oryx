/** Store-hosted logistics URLs. Old `/logistics/...` routes redirect here. */
export const STORE_PRODUCTS_PATH = "/store/pim/products";
export const LOGISTICS_BASE_PATH = "/store/logistics";

export const logisticsPath = (...segments: Array<string | number>): string =>
  [LOGISTICS_BASE_PATH, ...segments.map(String)].join("/");

export const hrefForStoreProduct = (id: string | number): string => `${STORE_PRODUCTS_PATH}/${id}`;

export const LOGISTICS_PATHS = {
  root: LOGISTICS_BASE_PATH,
  stock: logisticsPath("stock"),
  customerOrders: logisticsPath("customer-orders"),
  productionOrders: logisticsPath("production-orders"),
  outputs: logisticsPath("outputs"),
  transfers: logisticsPath("transfers"),
  shipments: logisticsPath("shipments"),
  returns: logisticsPath("returns"),
  reservations: logisticsPath("reservations"),
  adjustments: logisticsPath("adjustments"),
  ledger: logisticsPath("ledger"),
  warehouses: logisticsPath("warehouses"),
  regions: logisticsPath("regions"),
  plants: logisticsPath("plants"),
  products: STORE_PRODUCTS_PATH,
} as const;

export const redirectLegacyLogisticsPath = (segments: string[] | undefined): string => {
  const parts = segments ?? [];
  if (parts.length === 0) {
    return LOGISTICS_PATHS.stock;
  }
  if (parts[0] === "products") {
    return parts[1] ? hrefForStoreProduct(parts[1]) : STORE_PRODUCTS_PATH;
  }
  // Old Releases section → unified Reservations filtered to release.
  if (parts[0] === "releases") {
    return `${LOGISTICS_PATHS.reservations}?operation=release`;
  }
  return logisticsPath(...parts);
};
