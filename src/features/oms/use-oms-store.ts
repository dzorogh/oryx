"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeStockBalances } from "@/features/oms/oms-balances";
import { mergeEntityCodePrefixes } from "@/lib/entity-codes";
import {
  isSupabaseConfigured,
  loadCatalogPage,
  loadDocumentContext,
  loadFormContext,
  loadLedgerPage,
  loadPlaceContext,
  loadProductContext,
  loadStockPage,
  type MappedOms,
} from "@/features/oms/oms-api";
import type { OmsSnapshot, StockBalance } from "@/features/oms/oms-types";
import type { OrderMoneyContext } from "@/features/oms/order-money";
import { EMPTY_CUSTOMER_ORDER_OMS, type CustomerOrderOmsContext } from "@/features/oms/customer-order-oms";
import { EMPTY_CUSTOMER_ORDER_EXTRAS, type CustomerOrderExtras } from "@/features/oms/customer-order-extras";

const EMPTY_ORDER_MONEY: OrderMoneyContext = { money: null, payments: [], currencies: [] };

export const EMPTY_SNAPSHOT: OmsSnapshot = {
  categories: [],
  products: [],
  dealerPrices: [],
  plants: [],
  stockLocations: [],
  stockOwners: [],
  freeOwnerId: "1",
  warehouses: [],
  regions: [],
  settings: { id: "1", codePrefixes: mergeEntityCodePrefixes() },
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

export type OmsStoreSource =
  | { kind: "document"; documentKind: string; ref: string }
  | { kind: "place"; placeKind: "warehouse" | "plant" | "region"; id: string }
  | { kind: "product"; variantId: string; enabled?: boolean }
  | { kind: "form"; form: string; enabled?: boolean }
  | { kind: "stock" }
  | { kind: "ledger" }
  | { kind: "catalog" };

const loadForSource = async (source: OmsStoreSource): Promise<MappedOms> => {
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

const sourceKey = (source: OmsStoreSource): string => {
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

const OMS_CHANGED_EVENT = "oryx:oms-changed";

/** Asks every mounted OMS store and list to reload, e.g. after a dialog created a document and stayed. */
export const notifyOmsChanged = () => {
  window.dispatchEvent(new Event(OMS_CHANGED_EVENT));
};

export const useOnOmsChanged = (reload: () => Promise<void>, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const onChanged = () => void reload();
    window.addEventListener(OMS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(OMS_CHANGED_EVENT, onChanged);
  }, [enabled, reload]);
};

const NOT_CONFIGURED_ERROR =
  "Supabase не настроен. Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.";
const LOAD_ERROR = "Не удалось загрузить данные OMS";

export const useOmsStore = (source: OmsStoreSource) => {
  const [snapshot, setSnapshot] = useState<OmsSnapshot>(EMPTY_SNAPSHOT);
  const [payloadBalances, setPayloadBalances] = useState<StockBalance[] | null>(null);
  const [orderPlan, setOrderPlan] = useState<unknown>(null);
  const [orderMoney, setOrderMoney] = useState<OrderMoneyContext>(EMPTY_ORDER_MONEY);
  const [orderOms, setOrderOms] = useState<CustomerOrderOmsContext>(EMPTY_CUSTOMER_ORDER_OMS);
  const [orderExtras, setOrderExtras] = useState<CustomerOrderExtras>(EMPTY_CUSTOMER_ORDER_EXTRAS);
  const [found, setFound] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const requestedKeyRef = useRef<string | null>(null);
  const enabled = (source.kind !== "form" && source.kind !== "product") || source.enabled !== false;
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
    requestedKeyRef.current = key;
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
      setOrderMoney(next.orderMoney);
      setOrderOms(next.orderOms);
      setOrderExtras(next.orderExtras);
      setFound(next.found);
      setError(null);
    } catch (caught: unknown) {
      if (request !== requestRef.current) {
        return;
      }
      requestedKeyRef.current = null;
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
    if (!enabled) {
      requestedKeyRef.current = null;
      return;
    }
    // React re-runs effects when a hidden route is shown again and in Strict Mode; one fetch per key is enough,
    // actions refresh through `reload()`.
    if (requestedKeyRef.current !== key) {
      void reload();
    }
  }, [reload, enabled, key]);

  useOnOmsChanged(reload, enabled);

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
    orderMoney,
    orderOms,
    orderExtras,
    // An explicit `reload()` of a loaded key keeps the current data on screen.
    isLoading: enabled && loadedKey !== key,
    isRefreshing: enabled && pending,
    error,
    reload,
    found,
    configured: isSupabaseConfigured(),
  };
};

export const useOmsList = <T,>(loader: () => Promise<T[]>) => {
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

  useOnOmsChanged(reload);

  return { rows, isLoading, error, reload, configured: isSupabaseConfigured() };
};
