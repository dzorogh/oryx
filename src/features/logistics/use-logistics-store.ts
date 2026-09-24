"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import {
  isSupabaseConfigured,
  loadCatalogPage,
  loadDocumentContext,
  loadFormContext,
  loadLedgerPage,
  loadPlaceContext,
  loadProductContext,
  loadStockPage,
  type MappedLogistics,
} from "@/features/logistics/logistics-api";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

export const EMPTY_SNAPSHOT: LogisticsSnapshot = {
  products: [],
  plants: [],
  stockLocations: [],
  stockOwners: [],
  freeOwnerId: "1",
  warehouses: [],
  regions: [],
  settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
  documentProductLines: [],
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

export type LogisticsStoreSource =
  | { kind: "document"; documentKind: string; ref: string }
  | { kind: "place"; placeKind: "warehouse" | "plant" | "region"; id: string }
  | { kind: "product"; variantId: string }
  | { kind: "form"; form: string; enabled?: boolean }
  | { kind: "stock" }
  | { kind: "ledger" }
  | { kind: "catalog" };

const loadForSource = async (source: LogisticsStoreSource): Promise<MappedLogistics> => {
  switch (source.kind) {
    case "document":
      return loadDocumentContext(source.documentKind, source.ref);
    case "place":
      return loadPlaceContext(source.placeKind, source.id);
    case "product":
      return loadProductContext(source.variantId);
    case "form":
      return loadFormContext(source.form);
    case "stock":
      return loadStockPage();
    case "ledger":
      return loadLedgerPage();
    case "catalog":
      return loadCatalogPage();
  }
};

const sourceKey = (source: LogisticsStoreSource): string => {
  switch (source.kind) {
    case "document":
      return `document:${source.documentKind}:${source.ref}`;
    case "place":
      return `place:${source.placeKind}:${source.id}`;
    case "product":
      return `product:${source.variantId}`;
    case "form":
      return `form:${source.form}`;
    case "stock":
      return "stock";
    case "ledger":
      return "ledger";
    case "catalog":
      return "catalog";
  }
};

const NOT_CONFIGURED_ERROR =
  "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.";
const LOAD_ERROR = "Не удалось загрузить данные логистики";

export const useLogisticsStore = (source: LogisticsStoreSource) => {
  const [snapshot, setSnapshot] = useState<LogisticsSnapshot>(EMPTY_SNAPSHOT);
  const [payloadBalances, setPayloadBalances] = useState<StockBalance[] | null>(null);
  const [orderPlan, setOrderPlan] = useState<unknown>(null);
  const [found, setFound] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const enabled = source.kind !== "form" || source.enabled !== false;
  const key = sourceKey(source);

  if (!enabled && loadedKey !== null) {
    setLoadedKey(null);
  }

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED_ERROR);
      setLoadedKey(key);
      return;
    }
    const request = ++requestRef.current;
    setPending(true);
    setError(null);
    try {
      const next = await loadForSource(source);
      if (request !== requestRef.current) {
        return;
      }
      setSnapshot(next.snapshot);
      setPayloadBalances(next.balances);
      setOrderPlan(next.orderPlan);
      setFound(next.found);
      setError(null);
    } catch (caught: unknown) {
      if (request !== requestRef.current) {
        return;
      }
      setError(caught instanceof Error ? caught.message : LOAD_ERROR);
    } finally {
      if (request === requestRef.current) {
        setPending(false);
        setLoadedKey(key);
      }
    }
    // `key` identifies every field of `source`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (enabled) {
      void reload();
    }
  }, [reload, enabled]);

  const balances = useMemo<StockBalance[]>(() => {
    if (payloadBalances != null) {
      return payloadBalances;
    }
    return computeStockBalances(snapshot.transactions);
  }, [payloadBalances, snapshot.transactions]);

  return {
    snapshot,
    balances,
    orderPlan,
    isLoading: enabled && (pending || loadedKey !== key),
    error,
    reload,
    found,
    configured: isSupabaseConfigured(),
  };
};

export const useLogisticsList = <T,>(loader: () => Promise<T[]>) => {
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED_ERROR);
      setIsLoading(false);
      return;
    }
    const request = ++requestRef.current;
    setIsLoading(true);
    try {
      const next = await loader();
      if (request !== requestRef.current) {
        return;
      }
      setRows(next);
      setError(null);
    } catch (caught: unknown) {
      if (request !== requestRef.current) {
        return;
      }
      setError(caught instanceof Error ? caught.message : LOAD_ERROR);
    } finally {
      if (request === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, isLoading, error, reload, configured: isSupabaseConfigured() };
};
