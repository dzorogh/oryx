import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PricelistsCollab } from "@/components/store/pim/pricelists/collab/use-yjs-pricelists";
import { usePricelistParameters } from "@/components/store/pim/pricelists/use-pricelist-parameters";
import {
  buildParamBaseId,
  buildParamOverrideId,
  getSeedParameterDefs,
  SYSTEM_PARAMETER_ID,
  type ParameterDef,
} from "@/components/store/pim/pricelists/pricelists-parameters";

/** Minimal in-memory stand-in for the Yjs-backed collab object. */
const createCollabStub = () => {
  const defs = new Map<string, ParameterDef[]>();
  const values = new Map<string, number>();

  const collab: PricelistsCollab = {
    getCell: () => undefined,
    setCell: () => { },
    getStatus: () => undefined,
    setStatus: () => { },
    setStatuses: () => { },
    getRetailStatus: () => undefined,
    setRetailStatus: () => { },
    getParamDefs: (regionId) => defs.get(regionId),
    setParamDefs: (regionId, next) => defs.set(regionId, next),
    getParamValue: (valueId) => values.get(valueId),
    setParamValue: (valueId, value) => values.set(valueId, value),
    clearParamValue: (valueId) => {
      values.delete(valueId);
    },
    clearParamOverrides: (regionId, paramId) => {
      const prefix = `${regionId}:param:${paramId}:`;
      const baseId = `${prefix}base`;
      for (const key of [...values.keys()]) {
        if (key.startsWith(prefix) && key !== baseId) {
          values.delete(key);
        }
      }
    },
    setEditing: () => { },
    getEditors: () => [],
    getComputed: () => undefined,
    requestCompute: () => { },
    backend: {
      clientId: -1,
      getActiveClientIds: () => [],
      getComputeRequests: () => [],
      getComputed: () => undefined,
      markComputedPending: () => { },
      commitComputed: () => { },
      clearComputeRequests: () => { },
      observe: () => () => { },
    },
    onlineUsers: [],
    localUser: null,
    connected: true,
  };

  return { collab, defs, values };
};

describe("usePricelistParameters · enablement", () => {
  it("is disabled for the global scope and enabled per region otherwise", () => {
    const { collab } = createCollabStub();

    const global = renderHook(() => usePricelistParameters("global", "ru", collab));
    expect(global.result.current.enabled).toBe(false);
    expect(global.result.current.defs).toEqual([]);

    const supplier = renderHook(() => usePricelistParameters("supplier", "ru", collab));
    expect(supplier.result.current.enabled).toBe(true);
    expect(supplier.result.current.defs.at(-1)?.id).toBe(SYSTEM_PARAMETER_ID);
  });
});

describe("usePricelistParameters · values", () => {
  it("falls back to seed base values and reflects overrides", () => {
    const { collab, values } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    // Seed: customs base 300 + region "ru" (index 1) * 25 = 325.
    expect(result.current.getBaseValue("customs")).toBe(325);

    act(() => result.current.setBaseValue("customs", 500));
    expect(values.get(buildParamBaseId("ru", "customs"))).toBe(500);
    expect(result.current.getBaseValue("customs")).toBe(500);

    const base = result.current.resolveCell("customs", "v1");
    expect(base).toEqual({ value: 500, isOverridden: false });

    act(() => result.current.setOverride("customs", "v1", 999));
    expect(result.current.resolveCell("customs", "v1")).toEqual({ value: 999, isOverridden: true });

    act(() => result.current.clearOverride("customs", "v1"));
    expect(result.current.resolveCell("customs", "v1").isOverridden).toBe(false);
  });

  it("resets all overrides while keeping the base value", () => {
    const { collab, values } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    act(() => {
      result.current.setBaseValue("customs", 400);
      result.current.setOverride("customs", "v1", 1);
      result.current.setOverride("customs", "v2", 2);
    });
    act(() => result.current.resetAllOverrides("customs"));

    expect(values.get(buildParamBaseId("ru", "customs"))).toBe(400);
    expect(values.get(buildParamOverrideId("ru", "customs", "v1"))).toBeUndefined();
    expect(values.get(buildParamOverrideId("ru", "customs", "v2"))).toBeUndefined();
  });
});

describe("usePricelistParameters · definitions", () => {
  it("adds a parameter before the system column and seeds its base value", () => {
    const { collab, defs, values } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    act(() =>
      result.current.addParameter({ label: "Delivery", baseValue: 42, slug: "delivery" }),
    );

    const persisted = defs.get("ru") ?? [];
    const ids = persisted.map((d) => d.id);
    expect(ids.at(-1)).toBe(SYSTEM_PARAMETER_ID);
    const added = persisted.find((d) => d.slug === "delivery");
    expect(added).toBeDefined();
    expect(values.get(buildParamBaseId("ru", added!.id))).toBe(42);
  });

  it("updates a parameter's label, slug and formula", () => {
    const { collab, defs } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    act(() => result.current.addParameter({ label: "Delivery", baseValue: 0, slug: "delivery" }));
    const id = (defs.get("ru") ?? []).find((d) => d.slug === "delivery")!.id;

    act(() =>
      result.current.updateParameter(id, { label: "Freight", slug: "freight", formula: "1+1" }),
    );

    const updated = (defs.get("ru") ?? []).find((d) => d.id === id);
    expect(updated?.label).toBe("Freight");
    expect(updated?.slug).toBe("freight");
    expect(updated?.formula).toBe("1+1");
  });

  it("keeps the system column's label and slug fixed but allows its formula", () => {
    const { collab, defs } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    const original = (defs.get("ru") ?? getSeedParameterDefs()).find(
      (d) => d.id === SYSTEM_PARAMETER_ID,
    );
    const originalLabel = original?.label ?? "Total Expenses (USD)";
    const originalSlug = original?.slug ?? "total_expenses";

    act(() =>
      result.current.updateParameter(SYSTEM_PARAMETER_ID, {
        label: "Renamed",
        slug: "renamed",
        formula: "customs + logistics",
      }),
    );

    const updated = (defs.get("ru") ?? []).find((d) => d.id === SYSTEM_PARAMETER_ID);
    expect(updated?.label).toBe(originalLabel);
    expect(updated?.slug).toBe(originalSlug);
    expect(updated?.formula).toBe("customs + logistics");
  });

  it("removes user parameters but never the system column", () => {
    const { collab, defs } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    act(() => result.current.addParameter({ label: "Delivery", baseValue: 0, slug: "delivery" }));
    const id = (defs.get("ru") ?? []).find((d) => d.slug === "delivery")!.id;

    act(() => result.current.removeParameter(id));
    expect((defs.get("ru") ?? []).some((d) => d.id === id)).toBe(false);

    act(() => result.current.removeParameter(SYSTEM_PARAMETER_ID));
    expect((defs.get("ru") ?? []).some((d) => d.id === SYSTEM_PARAMETER_ID)).toBe(true);
  });

  it("swaps two user parameters and refuses to move the system column", () => {
    const { collab, defs } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    const before = (defs.get("ru") ?? []).length;
    // Seed list contains logistics, customs, vat, clearance then system; swap first two.
    act(() => result.current.swapParameter("logistics", "customs"));
    const persisted = (defs.get("ru") ?? []).map((d) => d.id);
    expect(persisted.indexOf("customs")).toBeLessThan(persisted.indexOf("logistics"));
    expect(persisted.at(-1)).toBe(SYSTEM_PARAMETER_ID);
    expect(persisted.length).toBeGreaterThanOrEqual(before);
  });
});

describe("usePricelistParameters · visibility", () => {
  it("toggles parameter visibility in memory", () => {
    const { collab } = createCollabStub();
    const { result } = renderHook(() => usePricelistParameters("supplier", "ru", collab));

    expect(result.current.isVisible("customs")).toBe(true);
    expect(result.current.hasHiddenParameters).toBe(false);

    act(() => result.current.toggleVisibility("customs"));
    expect(result.current.isVisible("customs")).toBe(false);
    expect(result.current.hasHiddenParameters).toBe(true);

    act(() => result.current.resetVisibility());
    expect(result.current.hasHiddenParameters).toBe(false);
  });
});
