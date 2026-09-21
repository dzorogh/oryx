"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import { isSupabaseConfigured, loadLogisticsSnapshot } from "@/features/logistics/logistics-api";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

export const EMPTY_SNAPSHOT: LogisticsSnapshot = {
  products: [],
  manufacturers: [],
  warehouses: [],
  regions: [],
  settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
  customerOrders: [],
  customerOrderLines: [],
  productionOrders: [],
  productionOrderLines: [],
  reservations: [],
  reservationLines: [],
  transfers: [],
  transferLines: [],
  transferAllocations: [],
  shipments: [],
  shipmentLines: [],
  outputs: [],
  outputLines: [],
  outputAllocations: [],
  adjustments: [],
  adjustmentLines: [],
  transactions: [],
  users: [],
  documentHistory: [],
};

export const useLogisticsStore = () => {
  const [snapshot, setSnapshot] = useState<LogisticsSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const next = await loadLogisticsSnapshot();
      setSnapshot(next);
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить данные логистики");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const balances = useMemo<StockBalance[]>(
    () => computeStockBalances(snapshot.transactions),
    [snapshot.transactions],
  );

  return { snapshot, balances, isLoading, error, reload, configured: isSupabaseConfigured() };
};
