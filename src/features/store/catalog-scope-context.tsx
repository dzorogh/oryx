"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CatalogScope = "equipment" | "parts" | "accessories";

export type CatalogScopeOption = {
  value: CatalogScope;
  label: string;
};

export const CATALOG_SCOPE_OPTIONS: CatalogScopeOption[] = [
  { value: "equipment", label: "Equipment" },
  { value: "parts", label: "Parts" },
  { value: "accessories", label: "Accessories" },
];

const DEFAULT_SCOPE: CatalogScope = "equipment";
const STORAGE_KEY = "store-catalog-scope";

const isCatalogScope = (value: unknown): value is CatalogScope =>
  CATALOG_SCOPE_OPTIONS.some((option) => option.value === value);

type CatalogScopeContextValue = {
  scope: CatalogScope;
  setScope: (scope: CatalogScope) => void;
};

const CatalogScopeContext = createContext<CatalogScopeContextValue | null>(null);

export const CatalogScopeProvider = ({ children }: { children: ReactNode }) => {
  const [scope, setScopeState] = useState<CatalogScope>(DEFAULT_SCOPE);

  useEffect(() => {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }

    const storedScope = storage.getItem(STORAGE_KEY);
    if (!isCatalogScope(storedScope)) {
      return;
    }

    const timer = window.setTimeout(() => setScopeState(storedScope), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setScope = (nextScope: CatalogScope) => {
    setScopeState(nextScope);

    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }
    storage.setItem(STORAGE_KEY, nextScope);
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
