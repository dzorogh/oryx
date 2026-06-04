import { describe, expect, it } from "vitest";
import {
  buildParameterColumns,
  getColumnsStorageKey,
  getDefaultVisibleColumnIds,
  getOrderedVisibleColumns,
  getScopeColumns,
  getToggleableColumns,
  getVisibleColumnDefinitions,
  isDefaultColumnSet,
  parseStoredColumns,
  serializeVisibleColumns,
} from "@/components/store/pim/pricelists/pricelists-columns";

describe("pricelists-columns · scope composition", () => {
  it("exposes the expected columns per scope", () => {
    expect(getScopeColumns("global").map((c) => c.id)).toEqual([
      "name",
      "purchase",
      "purchaseUsd",
      "dealerStatus",
    ]);
    expect(getScopeColumns("supplier").map((c) => c.id)).toEqual([
      "name",
      "purchase",
      "purchaseUsd",
      "dealer",
      "dealerUsd",
      "dealerMarkup",
      "retail",
      "retailUsd",
      "retailMarkupNoExpenses",
      "retailMarkup",
    ]);
    expect(getScopeColumns("dealer").map((c) => c.id)).toEqual([
      "name",
      "dealer",
      "dealerUsd",
      "retail",
      "retailUsd",
      "retailMarkupNoExpenses",
      "retailMarkup",
    ]);
  });

  it("defines markup columns, with the with-expenses dealer markup behind the parameter group", () => {
    const supplier = getScopeColumns("supplier");
    const dealerMarkup = supplier.find((c) => c.id === "dealerMarkup");
    const retailMarkupNoExpenses = supplier.find((c) => c.id === "retailMarkupNoExpenses");
    const retailMarkup = supplier.find((c) => c.id === "retailMarkup");

    expect(dealerMarkup).toMatchObject({ kind: "markup", markup: "dealer" });
    expect(dealerMarkup?.afterParameters).toBeFalsy();

    // Dealer markup w/o expenses sits in the leading group (left of parameters).
    expect(retailMarkupNoExpenses).toMatchObject({ kind: "markup", markup: "retailNoExpenses" });
    expect(retailMarkupNoExpenses?.afterParameters).toBeFalsy();

    // Dealer markup w/ expenses renders behind the parameter group.
    expect(retailMarkup).toMatchObject({ kind: "markup", markup: "retail", afterParameters: true });

    // Dealer scope carries both retail markups (no purchase price to compare).
    const dealerScope = getScopeColumns("dealer").map((c) => c.id);
    expect(dealerScope).toContain("retailMarkupNoExpenses");
    expect(dealerScope).toContain("retailMarkup");
    expect(dealerScope).not.toContain("dealerMarkup");
  });

  it("keeps the locked Name column out of the toggleable set", () => {
    const toggleable = getToggleableColumns("global").map((c) => c.id);
    expect(toggleable).not.toContain("name");
    expect(toggleable).toContain("purchase");
  });

  it("treats every default-visible column as a default", () => {
    expect(getDefaultVisibleColumnIds("dealer")).toEqual([
      "name",
      "dealer",
      "dealerUsd",
      "retail",
      "retailUsd",
      "retailMarkupNoExpenses",
      "retailMarkup",
    ]);
  });
});

describe("pricelists-columns · ordering and visibility", () => {
  it("always includes locked columns and preserves scope order", () => {
    expect(getOrderedVisibleColumns("global", ["dealerStatus"])).toEqual(["name", "dealerStatus"]);
    expect(getOrderedVisibleColumns("supplier", ["retail", "purchase"])).toEqual([
      "name",
      "purchase",
      "retail",
    ]);
  });

  it("maps ordered ids to full column definitions", () => {
    const defs = getVisibleColumnDefinitions("global", ["purchase"]);
    expect(defs.map((d) => d.id)).toEqual(["name", "purchase"]);
    expect(defs[1].kind).toBe("editable");
  });
});

describe("pricelists-columns · storage round-trip", () => {
  it("derives a per-scope storage key", () => {
    expect(getColumnsStorageKey("supplier")).toBe("store-pricelists-visible-columns:supplier");
  });

  it("parses stored ids, dropping unknown ones and adding locked ones", () => {
    const raw = JSON.stringify(["purchase", "totally-invalid"]);
    expect(parseStoredColumns("global", raw)).toEqual(["name", "purchase"]);
  });

  it("returns null for empty or malformed storage", () => {
    expect(parseStoredColumns("global", null)).toBeNull();
    expect(parseStoredColumns("global", "{not json")).toBeNull();
    expect(parseStoredColumns("global", JSON.stringify({ not: "array" }))).toBeNull();
  });

  it("serializes back into the ordered, locked-inclusive set", () => {
    expect(serializeVisibleColumns("global", ["purchase"])).toBe(
      JSON.stringify(["name", "purchase"]),
    );
  });

  it("detects the default column set", () => {
    expect(isDefaultColumnSet("global", getDefaultVisibleColumnIds("global"))).toBe(true);
    expect(isDefaultColumnSet("global", ["name"])).toBe(false);
  });
});

describe("pricelists-columns · parameter columns", () => {
  it("builds dynamic parameter column definitions", () => {
    const [column] = buildParameterColumns([{ id: "customs", label: "Customs (USD)" }]);

    expect(column.id).toBe("param:customs");
    expect(column.kind).toBe("parameter");
    expect(column.paramId).toBe("customs");
    expect(column.isParameter).toBe(true);
    expect(column.defaultVisible).toBe(true);
  });
});
