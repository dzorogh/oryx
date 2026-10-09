"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isCurrencyCode, type CurrencyCode } from "@/features/store/domain/currency";
import { formatEntityCode } from "@/lib/entity-codes";
import { ensureEntityCodePrefixes } from "@/lib/entity-codes-api";
import { resolveSelectedRegionCode } from "@/features/store/region-selection";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export const STORE_SELECTED_REGION_STORAGE_KEY = "store-selected-region";

export type StoreRegionOption = {
  id: string;
  code: string;
  name: string;
  hubWarehouseId: string | null;
  hubCode: string | null;
  dealerCurrency: CurrencyCode;
  retailCurrency: CurrencyCode;
  /** Default currency for new customer orders; null → use dealerCurrency. */
  orderCurrency: CurrencyCode | null;
};

type RegionContextValue = {
  regions: StoreRegionOption[];
  regionsLoading: boolean;
  /** Set when the region query failed. Null while loading, unset, or after success. */
  regionsError: string | null;
  /** Supabase env is missing. No retry. */
  regionsUnconfigured: boolean;
  retryRegions: () => void;
  /** Validated selected region code, or null when unset / invalid. */
  selectedRegionCode: string | null;
  selectedRegion: StoreRegionOption | null;
  setSelectedRegionCode: (code: string | null) => void;
  /** Controlled open state for the switcher (stub button). */
  switcherOpen: boolean;
  setSwitcherOpen: (open: boolean) => void;
};

const RegionContext = createContext<RegionContextValue | null>(null);

type CurrencyRow = { id: number | string; code: string };
type RegionRow = {
  id: number | string;
  code: string;
  name: string;
  hub_warehouse_id: number | string | null;
  default_retail_currency_id: number | string;
  default_dealer_currency_id: number | string;
  order_currency_id: number | string | null;
  active: boolean;
};

const readStoredRegionCode = (): string | null => {
  try {
    const raw = window.localStorage.getItem(STORE_SELECTED_REGION_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim().toUpperCase() : null;
  } catch {
    return null;
  }
};

const localListeners = new Set<() => void>();

const subscribeStoredRegionCode = (onChange: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORE_SELECTED_REGION_STORAGE_KEY) onChange();
  };
  localListeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    localListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};

const writeStoredRegionCode = (code: string | null) => {
  try {
    if (!code) {
      window.localStorage.removeItem(STORE_SELECTED_REGION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORE_SELECTED_REGION_STORAGE_KEY, code);
    }
  } catch {
    // ignore quota / private mode
  }
  for (const listener of localListeners) listener();
};

export const loadStoreRegions = async (): Promise<StoreRegionOption[] | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const client = getSupabaseBrowserClient();
  if (!client) {
    return null;
  }

  // formatEntityCode reads module-global prefixes; load them before hubCode is computed.
  const [currenciesResult, regionsResult] = await Promise.all([
    client.from("store_currency").select("id,code").is("deleted_at", null),
    client
      .from("store_region")
      .select(
        "id,code,name,hub_warehouse_id,default_retail_currency_id,default_dealer_currency_id,order_currency_id,active,sort_order",
      )
      .is("deleted_at", null)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    ensureEntityCodePrefixes(),
  ]);

  if (currenciesResult.error) throw new Error(currenciesResult.error.message);
  if (regionsResult.error) throw new Error(regionsResult.error.message);

  const currencyCodeById = new Map(
    ((currenciesResult.data ?? []) as CurrencyRow[]).map((row) => [String(row.id), row.code]),
  );

  const regions: StoreRegionOption[] = [];
  for (const row of (regionsResult.data ?? []) as RegionRow[]) {
    const dealerRaw = currencyCodeById.get(String(row.default_dealer_currency_id));
    const retailRaw = currencyCodeById.get(String(row.default_retail_currency_id));
    if (!dealerRaw || !retailRaw || !isCurrencyCode(dealerRaw) || !isCurrencyCode(retailRaw)) {
      continue;
    }
    const hubWarehouseId = row.hub_warehouse_id == null ? null : String(row.hub_warehouse_id);
    const orderRaw =
      row.order_currency_id == null
        ? null
        : currencyCodeById.get(String(row.order_currency_id));
    const orderCurrency =
      orderRaw && isCurrencyCode(orderRaw) ? orderRaw : null;
    regions.push({
      id: String(row.id),
      code: row.code,
      name: row.name,
      hubWarehouseId,
      hubCode: hubWarehouseId ? formatEntityCode("warehouse", hubWarehouseId) : null,
      dealerCurrency: dealerRaw,
      retailCurrency: retailRaw,
      orderCurrency,
    });
  }
  return regions;
};

const REGIONS_LOAD_ERROR = "Не удалось загрузить регионы";

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [regions, setRegions] = useState<StoreRegionOption[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [regionsUnconfigured, setRegionsUnconfigured] = useState(false);
  const [regionsAttempt, setRegionsAttempt] = useState(0);
  const selectedRegionCode = useSyncExternalStore(
    subscribeStoredRegionCode,
    readStoredRegionCode,
    () => null,
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const retryRegions = useCallback(() => {
    setRegionsLoading(true);
    setRegionsError(null);
    setRegionsUnconfigured(false);
    setRegionsAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadStoreRegions()
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          setRegions([]);
          setRegionsError(null);
          setRegionsUnconfigured(true);
        } else {
          setRegions(loaded);
          setRegionsError(null);
          setRegionsUnconfigured(false);
        }
        setRegionsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRegions([]);
        setRegionsError(REGIONS_LOAD_ERROR);
        setRegionsUnconfigured(false);
        setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionsAttempt]);

  const validCodes = useMemo(() => new Set(regions.map((region) => region.code)), [regions]);

  const validatedCode = resolveSelectedRegionCode(selectedRegionCode, validCodes, regionsLoading);

  const setSelectedRegionCode = useCallback((code: string | null) => {
    writeStoredRegionCode(code);
  }, []);

  const selectedRegion = useMemo(
    () => regions.find((region) => region.code === validatedCode) ?? null,
    [regions, validatedCode],
  );

  const value = useMemo<RegionContextValue>(
    () => ({
      regions,
      regionsLoading,
      regionsError,
      regionsUnconfigured,
      retryRegions,
      selectedRegionCode: validatedCode,
      selectedRegion,
      setSelectedRegionCode,
      switcherOpen,
      setSwitcherOpen,
    }),
    [
      regions,
      regionsLoading,
      regionsError,
      regionsUnconfigured,
      retryRegions,
      validatedCode,
      selectedRegion,
      setSelectedRegionCode,
      switcherOpen,
    ],
  );

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
};

export const useSelectedRegion = (): RegionContextValue => {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    throw new Error("useSelectedRegion must be used within RegionProvider");
  }
  return ctx;
};

/** Safe hook when provider may be absent (returns null selection). */
export const useOptionalSelectedRegion = (): RegionContextValue | null => useContext(RegionContext);
