export type CatalogScope = "equipment" | "parts" | "accessories";

export type CatalogScopeOption = {
  value: CatalogScope;
  label: string;
};

export const CATALOG_SCOPE_OPTIONS: CatalogScopeOption[] = [
  { value: "equipment", label: "Техника" },
  { value: "parts", label: "Запчасти" },
  { value: "accessories", label: "Аксессуары" },
];

export const CATALOG_SCOPE_STORAGE_KEY = "store-catalog-scope";

const isCatalogScope = (value: unknown): value is CatalogScope =>
  CATALOG_SCOPE_OPTIONS.some((option) => option.value === value);

type CatalogScopeStorage = {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
};

export const readStoredCatalogScope = (
  openStorage: () => CatalogScopeStorage | null | undefined,
): CatalogScope | null => {
  try {
    const storage = openStorage();
    if (!storage || typeof storage.getItem !== "function") {
      return null;
    }
    const stored = storage.getItem(CATALOG_SCOPE_STORAGE_KEY);
    return isCatalogScope(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const writeStoredCatalogScope = (
  openStorage: () => CatalogScopeStorage | null | undefined,
  scope: CatalogScope,
): void => {
  try {
    const storage = openStorage();
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }
    storage.setItem(CATALOG_SCOPE_STORAGE_KEY, scope);
  } catch {
    // Quota, private mode, or a thrown storage getter.
  }
};
