import { PRICELIST_REGIONS } from "./pricelists-demo-data";

/**
 * A parameter is a dynamic, table-wide column added per region (shared across
 * the Supplier and Dealer tabs). It holds a single base value that applies to
 * every product, plus optional per-row overrides. Values are plain numbers;
 * any unit hint lives in the column label (e.g. "Customs (USD)").
 */
export type ParameterDef = {
  id: string;
  label: string;
  /** Machine-readable handle used to reference the parameter inside formulas. */
  slug?: string;
  /** Raw formula expression. Not evaluated yet — stored for the editor only. */
  formula?: string;
};

/**
 * System column pinned last; cannot be reordered, deleted, inserted after, or
 * renamed/re-slugged. Its label (`Total Expenses (USD)`) and slug
 * (`total_expenses`) are referenced by formulas and exports, so only its
 * formula may change.
 */
export const SYSTEM_PARAMETER_ID = "total-expenses";

/** Fixed width for every parameter column. */
export const PARAMETER_COLUMN_WIDTH_CLASS = "w-[160px]";

export const isSystemParameter = (paramId: string): boolean => paramId === SYSTEM_PARAMETER_ID;

const SEED_PARAMETER_BLUEPRINTS: { id: string; label: string; slug: string; base: number; step: number }[] = [
  { id: "customs", label: "Customs (USD)", slug: "customs", base: 300, step: 25 },
  { id: "shipping", label: "Shipping (USD)", slug: "shipping", base: 1200, step: 40 },
  { id: "vat", label: "VAT (%)", slug: "vat", base: 5, step: 0 },
  { id: "total-expenses", label: "Total Expenses (USD)", slug: "total_expenses", base: 1800, step: 60 },
];

const SEED_PARAMETER_IDS = new Set(SEED_PARAMETER_BLUEPRINTS.map((blueprint) => blueprint.id));

const getRegionIndex = (regionId: string): number => {
  const index = PRICELIST_REGIONS.findIndex((region) => region.id === regionId);
  return index >= 0 ? index : 0;
};

/**
 * Demo parameter columns present in every region until the shared collab doc
 * holds an explicit list. Values differ slightly per region so the table looks
 * realistic out of the box. The formula mirrors the region's base value, since
 * the formula field is what produces a parameter's base value.
 */
export const getSeedParameterDefs = (regionId?: string): ParameterDef[] =>
  normalizeParameterDefs(
    SEED_PARAMETER_BLUEPRINTS.map((blueprint) => {
      const base = blueprint.base + (regionId ? getRegionIndex(regionId) : 0) * blueprint.step;
      return {
        id: blueprint.id,
        label: blueprint.label,
        slug: blueprint.slug,
        formula: String(base),
      };
    }),
  );

/**
 * Keeps Total Expenses last and ensures the system column is always present.
 * User-defined parameters always sit to its left.
 */
export const normalizeParameterDefs = (defs: ParameterDef[]): ParameterDef[] => {
  const seeds = SEED_PARAMETER_BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id,
    label: blueprint.label,
    slug: blueprint.slug,
  }));
  const systemSeed = seeds.find((entry) => entry.id === SYSTEM_PARAMETER_ID);
  const systemFromList = defs.find((entry) => entry.id === SYSTEM_PARAMETER_ID);
  const system = systemFromList ?? systemSeed;
  if (!system) {
    return defs;
  }
  const others = defs.filter((entry) => entry.id !== SYSTEM_PARAMETER_ID);
  return [...others, system];
};

/** Deterministic base value for a seed parameter, slightly varied per region. */
export const getSeedParamBase = (regionId: string, paramId: string): number => {
  const blueprint = SEED_PARAMETER_BLUEPRINTS.find((entry) => entry.id === paramId);
  if (!blueprint) {
    return 0;
  }
  return blueprint.base + getRegionIndex(regionId) * blueprint.step;
};

export const isSeedParameterId = (paramId: string): boolean => SEED_PARAMETER_IDS.has(paramId);

/**
 * Value-cell ids share the region + param namespace. The trailing segment marks
 * the column-wide base value vs a single product override.
 */
export const buildParamBaseId = (regionId: string, paramId: string): string =>
  `${regionId}:param:${paramId}:base`;

export const buildParamOverrideId = (regionId: string, paramId: string, rowId: string): string =>
  `${regionId}:param:${paramId}:${rowId}`;

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

/** Display a parameter value as a plain number (units live in the label). */
export const formatParameterValue = (value: number | null): string =>
  value === null ? "—" : formatNumber(value);

/** Turn a free-text label into a formula-safe snake_case handle. */
export const slugifyParameter = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Create a fresh parameter definition with a stable unique id. */
export const createParameterDef = (
  label: string,
  options: { slug?: string; formula?: string } = {},
): ParameterDef => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `param-${Math.random().toString(36).slice(2, 11)}`,
  label,
  slug: options.slug?.trim() || slugifyParameter(label),
  formula: options.formula,
});
