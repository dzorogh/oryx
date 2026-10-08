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
import {
  addCartPack,
  adjustCartPack,
  cartLineCount,
  cartTotalUnits,
  catalogFailedVariantIds,
  missingCatalogVariantIds,
  noteCatalogFailure,
  noteCatalogSuccess,
  parseCartLines,
  readCartFromStorage,
  removeCartLines,
  retryCatalogState,
  STORE_CART_STORAGE_KEY,
  normalizeCartToPacks,
  subtractCartQuantities,
  upsertCartLine,
  writeCartToStorage,
  type CartLine,
  type CatalogTrackState,
} from "@/features/store/cart/cart-store";
import {
  loadCartVariantCatalog,
  type CartVariantCatalogItem,
} from "@/features/store/cart/cart-catalog";

type CartContextValue = {
  lines: CartLine[];
  lineCount: number;
  totalUnits: number;
  catalogById: Map<string, CartVariantCatalogItem>;
  catalogLoading: boolean;
  /** Last catalog request failed — names and prices may be missing. Stays on while those ids are still in the cart. */
  catalogError: boolean;
  /** Requested and answered, but the variant is gone (deleted or archived). */
  missingVariantIds: string[];
  /** Ids whose last catalog request failed. */
  failedVariantIds: string[];
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  addPack: (variantId: string, quantityPerUnit?: number) => void;
  setQuantity: (variantId: string, quantity: number, quantityPerUnit?: number) => void;
  adjustPacks: (variantId: string, deltaPacks: number, quantityPerUnit?: number) => void;
  removeVariants: (variantIds: readonly string[]) => void;
  /** Remove only the quantity that was sent. Leftover units stay in the cart. */
  subtractSubmitted: (submitted: readonly { variantId: string; quantity: number }[]) => void;
  /** Ask again for ids whose catalog request failed. */
  retryCatalog: () => void;
  clear: () => void;
  quantityOf: (variantId: string) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

const localListeners = new Set<() => void>();

const subscribeCart = (onChange: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORE_CART_STORAGE_KEY) onChange();
  };
  localListeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    localListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
};

const notifyCart = () => {
  for (const listener of localListeners) listener();
};

const commitCart = (lines: CartLine[]) => {
  writeCartToStorage(lines);
  notifyCart();
};

const SERVER_CART_SNAPSHOT: CartLine[] = [];
const getServerCartSnapshot = () => SERVER_CART_SNAPSHOT;

const getQuantityPerUnit = (
  catalogById: Map<string, CartVariantCatalogItem>,
  variantId: string,
  fallback?: number,
): number => {
  const fromCatalog = catalogById.get(variantId)?.quantityPerUnit;
  if (fromCatalog && fromCatalog > 0) return fromCatalog;
  if (fallback && fallback > 0) return fallback;
  return 1;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const lines = useSyncExternalStore(subscribeCart, readCartFromStorage, getServerCartSnapshot);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [catalogSnapshot, setCatalogSnapshot] = useState<{
    /** Ids already requested. Cleared only for failed ids, and only by retry. */
    track: CatalogTrackState;
    byId: Map<string, CartVariantCatalogItem>;
  }>({ track: { requested: new Set(), failed: new Set() }, byId: new Map() });

  const missingKey = useMemo(
    () =>
      lines
        .map((line) => line.variantId)
        .filter((id) => !catalogSnapshot.track.requested.has(id))
        .sort()
        .join(","),
    [lines, catalogSnapshot.track.requested],
  );

  const lineIds = useMemo(() => lines.map((line) => line.variantId), [lines]);
  const resolvedCatalog = catalogSnapshot.byId;
  const catalogLoading = missingKey.length > 0;
  const failedVariantIds = useMemo(
    () => catalogFailedVariantIds(lineIds, catalogSnapshot.track.failed),
    [lineIds, catalogSnapshot.track.failed],
  );
  const catalogError = failedVariantIds.length > 0;
  const missingVariantIds = useMemo(() => {
    const loadedIds = new Set(resolvedCatalog.keys());
    return missingCatalogVariantIds(
      lineIds,
      catalogSnapshot.track.requested,
      catalogSnapshot.track.failed,
      loadedIds,
    );
  }, [lineIds, catalogSnapshot.track, resolvedCatalog]);

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    const ids = missingKey.split(",");
    const markRequested = (items: CartVariantCatalogItem[], failed: boolean) =>
      setCatalogSnapshot((prev) => {
        const byId = new Map(prev.byId);
        for (const item of items) byId.set(item.variantId, item);
        return {
          track: failed ? noteCatalogFailure(prev.track, ids) : noteCatalogSuccess(prev.track, ids),
          byId,
        };
      });
    void loadCartVariantCatalog(ids)
      .then((items) => {
        if (!cancelled) markRequested(items, false);
      })
      .catch(() => {
        if (!cancelled) markRequested([], true);
      });
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  useEffect(() => {
    const current = readCartFromStorage();
    const normalized = normalizeCartToPacks(current, (id) => resolvedCatalog.get(id)?.quantityPerUnit);
    if (normalized !== current) commitCart(normalized);
  }, [resolvedCatalog, lines]);

  const addPack = useCallback(
    (variantId: string, quantityPerUnit?: number) => {
      const step = getQuantityPerUnit(resolvedCatalog, variantId, quantityPerUnit);
      commitCart(addCartPack(readCartFromStorage(), variantId, step));
    },
    [resolvedCatalog],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number, quantityPerUnit?: number) => {
      const step = getQuantityPerUnit(resolvedCatalog, variantId, quantityPerUnit);
      commitCart(upsertCartLine(readCartFromStorage(), variantId, quantity, step));
    },
    [resolvedCatalog],
  );

  const adjustPacks = useCallback(
    (variantId: string, deltaPacks: number, quantityPerUnit?: number) => {
      const step = getQuantityPerUnit(resolvedCatalog, variantId, quantityPerUnit);
      commitCart(adjustCartPack(readCartFromStorage(), variantId, deltaPacks, step));
    },
    [resolvedCatalog],
  );

  const removeVariants = useCallback((variantIds: readonly string[]) => {
    commitCart(removeCartLines(readCartFromStorage(), variantIds));
  }, []);

  const subtractSubmitted = useCallback((submitted: readonly { variantId: string; quantity: number }[]) => {
    commitCart(subtractCartQuantities(readCartFromStorage(), submitted));
  }, []);

  const retryCatalog = useCallback(() => {
    setCatalogSnapshot((prev) => ({ ...prev, track: retryCatalogState(prev.track) }));
  }, []);

  const clear = useCallback(() => {
    commitCart([]);
  }, []);

  const quantityOf = useCallback(
    (variantId: string) => lines.find((line) => line.variantId === variantId)?.quantity ?? 0,
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      lineCount: cartLineCount(lines),
      totalUnits: cartTotalUnits(lines),
      catalogById: resolvedCatalog,
      catalogLoading,
      catalogError,
      missingVariantIds,
      failedVariantIds,
      sheetOpen,
      setSheetOpen,
      addPack,
      setQuantity,
      adjustPacks,
      removeVariants,
      subtractSubmitted,
      retryCatalog,
      clear,
      quantityOf,
    }),
    [
      lines,
      resolvedCatalog,
      catalogLoading,
      catalogError,
      missingVariantIds,
      failedVariantIds,
      sheetOpen,
      addPack,
      setQuantity,
      adjustPacks,
      removeVariants,
      subtractSubmitted,
      retryCatalog,
      clear,
      quantityOf,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const useOptionalCart = (): CartContextValue | null => useContext(CartContext);

/** Re-export parse for tests / SSR guards. */
export { parseCartLines };
