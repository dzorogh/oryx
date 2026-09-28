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
  parseCartLines,
  readCartFromStorage,
  removeCartLines,
  STORE_CART_STORAGE_KEY,
  normalizeCartToPacks,
  upsertCartLine,
  writeCartToStorage,
  type CartLine,
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
  /** Last catalog request failed — names and prices may be missing. */
  catalogError: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  addPack: (variantId: string, quantityPerUnit?: number) => void;
  setQuantity: (variantId: string, quantity: number, quantityPerUnit?: number) => void;
  adjustPacks: (variantId: string, deltaPacks: number, quantityPerUnit?: number) => void;
  removeVariants: (variantIds: readonly string[]) => void;
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
    /** Ids already requested (loaded or failed), so removing lines never triggers a reload. */
    requested: ReadonlySet<string>;
    byId: Map<string, CartVariantCatalogItem>;
    failed: boolean;
  }>({ requested: new Set(), byId: new Map(), failed: false });

  const missingKey = useMemo(
    () =>
      lines
        .map((line) => line.variantId)
        .filter((id) => !catalogSnapshot.requested.has(id))
        .sort()
        .join(","),
    [lines, catalogSnapshot.requested],
  );

  const resolvedCatalog = catalogSnapshot.byId;
  const catalogLoading = missingKey.length > 0;
  const catalogError = catalogSnapshot.failed;

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    const ids = missingKey.split(",");
    const markRequested = (items: CartVariantCatalogItem[], failed: boolean) =>
      setCatalogSnapshot((prev) => {
        const byId = new Map(prev.byId);
        for (const item of items) byId.set(item.variantId, item);
        return { requested: new Set([...prev.requested, ...ids]), byId, failed };
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
      sheetOpen,
      setSheetOpen,
      addPack,
      setQuantity,
      adjustPacks,
      removeVariants,
      clear,
      quantityOf,
    }),
    [
      lines,
      resolvedCatalog,
      catalogLoading,
      catalogError,
      sheetOpen,
      addPack,
      setQuantity,
      adjustPacks,
      removeVariants,
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
