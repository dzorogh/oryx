import type { MarkupBasis } from "./pricelists-columns";
import { SYSTEM_PARAMETER_ID } from "./pricelists-parameters";
import {
  computeMarkupPercent,
  toUsd,
  type PriceField,
  type PricelistCellValue,
} from "./pricelists-helpers";

/**
 * Simulated backend latency for a recalculation. Derived values (USD
 * conversions, markups, inherited parameter values) are treated as if computed
 * by a server: an edit enqueues a request, the values show a loading state, and
 * the result lands after this delay.
 */
export const BACKEND_LATENCY_MS = 600;

export type ComputedStatus = "pending" | "ready";

/**
 * A single backend-computed value, stored in the shared collab cache. `hash`
 * captures the inputs that produced `value`, so any client can tell whether the
 * cached value is still fresh for the current inputs.
 */
export type ComputedEntry = {
  value: number | null;
  status: ComputedStatus;
  hash: string;
  updatedAt: number;
};

/** Derived columns that are computed server-side instead of inline. */
export type DerivedKey =
  | "purchaseUsd"
  | "dealerUsd"
  | "retailUsd"
  | "dealerMarkup"
  | "retailMarkupNoExpenses"
  | "retailMarkup";

/** Purchase price is global (region-agnostic); its derived USD target uses this key. */
export const GLOBAL_REGION_KEY = "global";

/**
 * Target ids namespace the kind of computed value:
 * - `d:` derived price column (USD / markup),
 * - `p:` inherited (non-overridden) parameter value.
 * The remaining segments reuse the region/variant/param ids, which never
 * contain a colon (the same assumption the price/parameter cell ids rely on).
 */
export const buildDerivedTargetId = (
  regionKey: string,
  variantId: string,
  key: DerivedKey,
): string => `d:${regionKey}:${variantId}:${key}`;

export const buildParamComputedTargetId = (
  regionId: string,
  paramId: string,
  rowId: string,
): string => `p:${regionId}:${paramId}:${rowId}`;

/** USD column → derived key. Purchase USD is always sourced from the global price. */
export const usdDerivedTargetId = (
  field: PriceField,
  regionId: string,
  variantId: string,
): string => {
  if (field === "purchase") {
    return buildDerivedTargetId(GLOBAL_REGION_KEY, variantId, "purchaseUsd");
  }
  const key: DerivedKey = field === "dealer" ? "dealerUsd" : "retailUsd";
  return buildDerivedTargetId(regionId, variantId, key);
};

const MARKUP_DERIVED_KEY: Record<MarkupBasis, DerivedKey> = {
  dealer: "dealerMarkup",
  retailNoExpenses: "retailMarkupNoExpenses",
  retail: "retailMarkup",
};

export const markupDerivedTargetId = (
  basis: MarkupBasis,
  regionId: string,
  variantId: string,
): string => buildDerivedTargetId(regionId, variantId, MARKUP_DERIVED_KEY[basis]);

/**
 * Read access the backend needs to (re)compute a target. All getters resolve
 * the effective input (edited collab value → deterministic seed), mirroring how
 * the table reads its inputs, so the cached result matches an inline render.
 */
export type RecalcDeps = {
  /** Effective price for a field; `regionKey` is "global" for the purchase price. */
  getPrice: (regionKey: string, variantId: string, field: PriceField) => PricelistCellValue;
  /** Effective resolved parameter value for a row (override → base → seed). */
  getParamResolved: (regionId: string, paramId: string, rowId: string) => number;
  /** Column base value of a parameter (the inherited value of non-overridden cells). */
  getParamBase: (regionId: string, paramId: string) => number;
};

const serializeCell = (cell: PricelistCellValue): string => `${cell.amount ?? "∅"}|${cell.currency}`;

type ParsedTarget =
  | { kind: "param"; regionId: string; paramId: string; rowId: string }
  | { kind: "derived"; regionKey: string; variantId: string; key: DerivedKey };

const parseTarget = (targetId: string): ParsedTarget | null => {
  const segments = targetId.split(":");
  if (segments[0] === "p" && segments.length === 4) {
    return { kind: "param", regionId: segments[1], paramId: segments[2], rowId: segments[3] };
  }
  if (segments[0] === "d" && segments.length === 4) {
    return {
      kind: "derived",
      regionKey: segments[1],
      variantId: segments[2],
      key: segments[3] as DerivedKey,
    };
  }
  return null;
};

const usdFor = (deps: RecalcDeps, regionKey: string, variantId: string, field: PriceField) => {
  const cell = deps.getPrice(field === "purchase" ? GLOBAL_REGION_KEY : regionKey, variantId, field);
  return toUsd(cell.amount, cell.currency);
};

/** Recompute a single target value from the current inputs. */
export const computeTargetValue = (targetId: string, deps: RecalcDeps): number | null => {
  const target = parseTarget(targetId);
  if (!target) {
    return null;
  }

  if (target.kind === "param") {
    return deps.getParamBase(target.regionId, target.paramId);
  }

  const { regionKey, variantId, key } = target;
  switch (key) {
    case "purchaseUsd":
      return usdFor(deps, regionKey, variantId, "purchase");
    case "dealerUsd":
      return usdFor(deps, regionKey, variantId, "dealer");
    case "retailUsd":
      return usdFor(deps, regionKey, variantId, "retail");
    case "dealerMarkup":
      return computeMarkupPercent(
        usdFor(deps, regionKey, variantId, "purchase"),
        usdFor(deps, regionKey, variantId, "dealer"),
      );
    case "retailMarkupNoExpenses":
      return computeMarkupPercent(
        usdFor(deps, regionKey, variantId, "dealer"),
        usdFor(deps, regionKey, variantId, "retail"),
      );
    case "retailMarkup": {
      const dealerUsd = usdFor(deps, regionKey, variantId, "dealer");
      const expensesUsd = deps.getParamResolved(regionKey, SYSTEM_PARAMETER_ID, variantId);
      const landedCostUsd = dealerUsd === null ? null : dealerUsd + expensesUsd;
      return computeMarkupPercent(landedCostUsd, usdFor(deps, regionKey, variantId, "retail"));
    }
    default:
      return null;
  }
};

/**
 * A compact signature of the inputs feeding a target. When it changes the
 * cached value is stale and must be recomputed by the backend.
 */
export const computeTargetHash = (targetId: string, deps: RecalcDeps): string => {
  const target = parseTarget(targetId);
  if (!target) {
    return "∅";
  }

  if (target.kind === "param") {
    return String(deps.getParamBase(target.regionId, target.paramId));
  }

  const { regionKey, variantId, key } = target;
  const price = (field: PriceField) =>
    serializeCell(
      deps.getPrice(field === "purchase" ? GLOBAL_REGION_KEY : regionKey, variantId, field),
    );

  switch (key) {
    case "purchaseUsd":
      return price("purchase");
    case "dealerUsd":
      return price("dealer");
    case "retailUsd":
      return price("retail");
    case "dealerMarkup":
      return `${price("purchase")}#${price("dealer")}`;
    case "retailMarkupNoExpenses":
      return `${price("dealer")}#${price("retail")}`;
    case "retailMarkup":
      return `${price("dealer")}#${price("retail")}#${deps.getParamResolved(
        regionKey,
        SYSTEM_PARAMETER_ID,
        variantId,
      )}`;
    default:
      return "∅";
  }
};

/** Whether a cached entry is a fresh, finished result for `hash`. */
export const isComputedReady = (entry: ComputedEntry | undefined, hash: string): boolean =>
  entry !== undefined && entry.status === "ready" && entry.hash === hash;

/** Whether the backend still has to (re)compute this target for `hash`. */
export const isComputedStale = (entry: ComputedEntry | undefined, hash: string): boolean =>
  entry === undefined || entry.hash !== hash;
