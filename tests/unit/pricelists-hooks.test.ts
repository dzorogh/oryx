import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePricelistColumns } from "@/components/store/pim/pricelists/use-pricelist-columns";
import {
  usePricelistsController,
  type AvailabilityFilter,
} from "@/components/store/pim/pricelists/use-pricelists-controller";

// Global scope has no region availability gate, so every product is shown.
const ALL_AVAILABLE: AvailabilityFilter = { enabled: false, isAvailable: () => true };

describe("usePricelistColumns", () => {
  it("starts from the scope defaults", () => {
    const { result } = renderHook(() => usePricelistColumns("global"));

    expect(result.current.visibleIds).toEqual(["name", "purchase", "dealerStatus"]);
    expect(result.current.hasCustom).toBe(false);
    expect(result.current.isVisible("purchase")).toBe(true);
  });

  it("toggles an optional column and reports a custom set", () => {
    const { result } = renderHook(() => usePricelistColumns("global"));

    act(() => result.current.toggle("dealerStatus"));

    expect(result.current.isVisible("dealerStatus")).toBe(false);
    expect(result.current.hasCustom).toBe(true);
  });

  it("resets back to the default set", () => {
    const { result } = renderHook(() => usePricelistColumns("global"));

    act(() => result.current.toggle("dealerStatus"));
    act(() => result.current.onReset());

    expect(result.current.hasCustom).toBe(false);
  });
});

describe("usePricelistsController", () => {
  it("paginates the variant rows", () => {
    const { result } = renderHook(() => usePricelistsController("global", "ru", ALL_AVAILABLE));

    expect(result.current.filteredItems.length).toBeGreaterThan(0);
    expect(result.current.paginatedItems.length).toBeLessThanOrEqual(
      result.current.filteredItems.length,
    );
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1);
    expect(result.current.visiblePage).toBe(1);
  });

  it("filters out everything for an unmatched search query", () => {
    const { result } = renderHook(() => usePricelistsController("global", "ru", ALL_AVAILABLE));

    act(() => result.current.filters.search.onChange("zzz-nonexistent-product-zzz"));

    expect(result.current.filteredItems).toHaveLength(0);
    expect(result.current.filters.hasActive).toBe(true);
  });

  it("clears active filters on reset", () => {
    const { result } = renderHook(() => usePricelistsController("global", "ru", ALL_AVAILABLE));

    act(() => result.current.filters.search.onChange("zzz-nonexistent-product-zzz"));
    act(() => result.current.filters.onReset());

    expect(result.current.filters.hasActive).toBe(false);
    expect(result.current.filteredItems.length).toBeGreaterThan(0);
  });
});
