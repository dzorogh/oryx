"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CATALOG_SCOPE_OPTIONS,
  readStoredCatalogScope,
  writeStoredCatalogScope,
  type CatalogScope,
  type CatalogScopeOption,
} from "@/features/store/catalog-scope-storage";

export type { CatalogScope, CatalogScopeOption };
export { CATALOG_SCOPE_OPTIONS };

const DEFAULT_SCOPE: CatalogScope = "equipment";

type CatalogScopeContextValue = {
  scope: CatalogScope;
  setScope: (scope: CatalogScope) => void;
};

const CatalogScopeContext = createContext<CatalogScopeContextValue | null>(null);

export const CatalogScopeProvider = ({ children }: { children: ReactNode }) => {
  const [scope, setScopeState] = useState<CatalogScope>(DEFAULT_SCOPE);

  useEffect(() => {
    const storedScope = readStoredCatalogScope(() => window.localStorage);
    if (!storedScope) {
      return;
    }

    const timer = window.setTimeout(() => setScopeState(storedScope), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setScope = (nextScope: CatalogScope) => {
    setScopeState(nextScope);
    writeStoredCatalogScope(() => window.localStorage, nextScope);
  };

  const value = useMemo<CatalogScopeContextValue>(() => ({ scope, setScope }), [scope]);

  return <CatalogScopeContext.Provider value={value}>{children}</CatalogScopeContext.Provider>;
};

export const useCatalogScope = () => {
  const context = useContext(CatalogScopeContext);
  if (!context) {
    throw new Error("useCatalogScope must be used within a CatalogScopeProvider");
  }
  return context;
};
