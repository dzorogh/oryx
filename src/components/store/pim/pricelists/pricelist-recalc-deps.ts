import { useMemo } from "react";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";
import {
  DEFAULT_REGION_ID,
  getPricelistRows,
  getRegionById,
  getSeedCellValue,
  type PricelistRow,
} from "./pricelists-demo-data";
import {
  buildParamBaseId,
  buildParamOverrideId,
  getSeedParamBase,
} from "./pricelists-parameters";
import { GLOBAL_REGION_KEY, type RecalcDeps } from "./pricelist-recalc";
import { buildPriceCellId, type PricelistCellValue } from "./pricelists-helpers";

const FALLBACK_CELL: PricelistCellValue = { amount: null, currency: "USD" };

/**
 * Builds the input-reading dependencies the recompute logic needs. Each getter
 * resolves the effective input the same way the table does (edited collab value
 * → deterministic seed), so backend results match an inline render. The getters
 * read collab lazily, so a single deps object stays valid as data changes.
 */
export const buildRecalcDeps = (
  collab: Pick<PricelistsCollab, "getCell" | "getParamValue">,
  rowById: Map<string, PricelistRow>,
): RecalcDeps => ({
  getPrice: (regionKey, variantId, field) => {
    const row = rowById.get(variantId);
    if (!row) {
      return FALLBACK_CELL;
    }
    const priceRegionId = field === "purchase" ? null : regionKey;
    const cellId = buildPriceCellId(priceRegionId, variantId, field);
    const region = getRegionById(regionKey === GLOBAL_REGION_KEY ? DEFAULT_REGION_ID : regionKey);
    return collab.getCell(cellId) ?? getSeedCellValue(row, field, region);
  },
  getParamResolved: (regionId, paramId, rowId) => {
    const override = collab.getParamValue(buildParamOverrideId(regionId, paramId, rowId));
    if (override !== undefined) {
      return override;
    }
    return collab.getParamValue(buildParamBaseId(regionId, paramId)) ?? getSeedParamBase(regionId, paramId);
  },
  getParamBase: (regionId, paramId) =>
    collab.getParamValue(buildParamBaseId(regionId, paramId)) ?? getSeedParamBase(regionId, paramId),
});

/** Memoized recalc deps bound to the stable collab getters. */
export const useRecalcDeps = (collab: PricelistsCollab): RecalcDeps => {
  const { getCell, getParamValue } = collab;
  return useMemo(() => {
    const rowById = new Map(getPricelistRows().map((row) => [row.id, row]));
    return buildRecalcDeps({ getCell, getParamValue }, rowById);
  }, [getCell, getParamValue]);
};
