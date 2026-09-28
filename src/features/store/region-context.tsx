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
import type { CurrencyCode } from "@/components/store/pim/pricelists/pricelists-helpers";
import { isCurrencyCode } from "@/components/store/pim/pricelists/pricelists-helpers";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
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
};

type RegionContextValue = {
  regions: StoreRegionOption[];
  regionsLoading: boolean;
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
  active: boolean;
};

const readStoredRegionCode = (): string | null => {
  try {
    const raw = window.localStorage.getItem(STORE_SELECTED_REGION_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
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

  const [currenciesResult, regionsResult] = await Promise.all([
    client.from("store_currency").select("id,code").is("deleted_at", null),
    client
      .from("store_region")
      .select(
        "id,code,name,hub_warehouse_id,default_retail_currency_id,default_dealer_currency_id,active,sort_order",
      )
      .is("deleted_at", null)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
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
    regions.push({
      id: String(row.id),
      code: row.code,
      name: row.name,
      hubWarehouseId,
      hubCode: hubWarehouseId ? formatLogisticsCode("warehouse", hubWarehouseId) : null,
      dealerCurrency: dealerRaw,
      retailCurrency: retailRaw,
    });
  }
  return regions;
};

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [regions, setRegions] = useState<StoreRegionOption[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const selectedRegionCode = useSyncExternalStore(
    subscribeStoredRegionCode,
    readStoredRegionCode,
    () => null,
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadStoreRegions()
      .then((loaded) => {
        if (cancelled) return;
        setRegions(loaded ?? []);
        setRegionsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRegions([]);
        setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      selectedRegionCode: validatedCode,
      selectedRegion,
      setSelectedRegionCode,
      switcherOpen,
      setSwitcherOpen,
    }),
    [regions, regionsLoading, validatedCode, selectedRegion, setSelectedRegionCode, switcherOpen],
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
