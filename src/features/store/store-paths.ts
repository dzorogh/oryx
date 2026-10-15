/** Shared store URLs. OMS may link here; this module does not import OMS. */

export const STORE_PRODUCTS_PATH = "/store/pim/products";

export const hrefForStoreProduct = (id: string | number): string => `/store/pim/variants/${id}`;

export const STORE_DIRECTORY_PATHS = {
  warehouses: "/store/warehouses",
  regions: "/store/regions",
  plants: "/store/plants",
} as const;

export type StoreDirectoryKey = keyof typeof STORE_DIRECTORY_PATHS;

export const directoryPath = (directory: StoreDirectoryKey, id?: string | number): string => {
  const base = STORE_DIRECTORY_PATHS[directory];
  return id == null || id === "" ? base : `${base}/${id}`;
};
