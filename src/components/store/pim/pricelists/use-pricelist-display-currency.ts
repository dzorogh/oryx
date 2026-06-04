"use client";

import { useCallback, useEffect, useState } from "react";
import { isCurrencyCode, type CurrencyCode } from "./pricelists-helpers";

export const DISPLAY_CURRENCY_STORAGE_KEY = "store-pricelists-display-currency";

/** The conversion currency every dual price cell renders on its display half. */
export const DEFAULT_DISPLAY_CURRENCY: CurrencyCode = "USD";

export type PricelistDisplayCurrency = {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (currency: CurrencyCode) => void;
};

/**
 * A single, view-wide display currency shared by every dual price cell. It is a
 * personal view preference (like column visibility), so it lives in
 * `localStorage` rather than the collab doc. Hydration runs in an effect to keep
 * the server-rendered markup deterministic.
 */
export const usePricelistDisplayCurrency = (): PricelistDisplayCurrency => {
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>(DEFAULT_DISPLAY_CURRENCY);

  useEffect(() => {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }
    const stored = storage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    if (!isCurrencyCode(stored)) {
      return;
    }
    // Defer the hydrating setState out of the effect body to avoid cascading
    // renders (mirrors usePricelistColumns).
    const timer = window.setTimeout(() => setDisplayCurrencyState(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setDisplayCurrency = useCallback((currency: CurrencyCode) => {
    setDisplayCurrencyState(currency);
    const storage = window.localStorage;
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
    }
  }, []);

  return { displayCurrency, setDisplayCurrency };
};
