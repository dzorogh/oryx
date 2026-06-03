import { describe, expect, it } from "vitest";
import {
  buildParamBaseId,
  buildParamOverrideId,
  createParameterDef,
  formatParameterValue,
  getSeedParamBase,
  getSeedParameterDefs,
  isSeedParameterId,
  isSystemParameter,
  normalizeParameterDefs,
  slugifyParameter,
  SYSTEM_PARAMETER_ID,
  type ParameterDef,
} from "@/components/store/pim/pricelists/pricelists-parameters";

describe("pricelists-parameters · system parameter", () => {
  it("identifies the system Total Expenses parameter", () => {
    expect(isSystemParameter(SYSTEM_PARAMETER_ID)).toBe(true);
    expect(isSystemParameter("customs")).toBe(false);
  });

  it("identifies seed parameter ids", () => {
    expect(isSeedParameterId("customs")).toBe(true);
    expect(isSeedParameterId("shipping")).toBe(true);
    expect(isSeedParameterId("user-defined")).toBe(false);
  });
});

describe("pricelists-parameters · normalization", () => {
  it("keeps the system column pinned last", () => {
    const defs: ParameterDef[] = [
      { id: SYSTEM_PARAMETER_ID, label: "Total Expenses (USD)" },
      { id: "customs", label: "Customs (USD)" },
    ];
    const normalized = normalizeParameterDefs(defs);

    expect(normalized.at(-1)?.id).toBe(SYSTEM_PARAMETER_ID);
    expect(normalized.map((d) => d.id)).toEqual(["customs", SYSTEM_PARAMETER_ID]);
  });

  it("appends the system column when it is missing", () => {
    const normalized = normalizeParameterDefs([{ id: "customs", label: "Customs (USD)" }]);

    expect(normalized.map((d) => d.id)).toEqual(["customs", SYSTEM_PARAMETER_ID]);
  });

  it("seeds a normalized list with the system column last", () => {
    const seeds = getSeedParameterDefs();
    expect(seeds.at(-1)?.id).toBe(SYSTEM_PARAMETER_ID);
    expect(seeds.length).toBeGreaterThan(1);
  });
});

describe("pricelists-parameters · seed base values", () => {
  it("varies the base value per region by a fixed step", () => {
    // Customs: base 300, step 25. "ae" is region index 0, "ru" is index 1.
    expect(getSeedParamBase("ae", "customs")).toBe(300);
    expect(getSeedParamBase("ru", "customs")).toBe(325);
  });

  it("returns 0 for unknown parameters", () => {
    expect(getSeedParamBase("ae", "unknown")).toBe(0);
  });
});

describe("pricelists-parameters · value ids", () => {
  it("builds base and override ids in a shared namespace", () => {
    expect(buildParamBaseId("ru", "customs")).toBe("ru:param:customs:base");
    expect(buildParamOverrideId("ru", "customs", "v1")).toBe("ru:param:customs:v1");
  });
});

describe("pricelists-parameters · formatting and slugs", () => {
  it("formats parameter values as plain numbers", () => {
    expect(formatParameterValue(null)).toBe("—");
    expect(formatParameterValue(1234.5)).toBe("1,234.5");
    expect(formatParameterValue(0)).toBe("0");
  });

  it("slugifies labels into snake_case handles", () => {
    expect(slugifyParameter("Customs (USD)")).toBe("customs_usd");
    expect(slugifyParameter("  Retail Markup  ")).toBe("retail_markup");
    expect(slugifyParameter("VAT %")).toBe("vat");
  });
});

describe("pricelists-parameters · createParameterDef", () => {
  it("creates a definition with a unique id and derived slug", () => {
    const def = createParameterDef("Delivery Fee");
    expect(def.label).toBe("Delivery Fee");
    expect(def.slug).toBe("delivery_fee");
    expect(def.id).toBeTruthy();

    const other = createParameterDef("Delivery Fee");
    expect(other.id).not.toBe(def.id);
  });

  it("honors an explicit slug and formula", () => {
    const def = createParameterDef("Delivery", { slug: "ship", formula: "customs + 10" });
    expect(def.slug).toBe("ship");
    expect(def.formula).toBe("customs + 10");
  });
});
