import type { Cell, Row, SheetData } from "write-excel-file/browser";
import { getDisplayProductName } from "../products/catalog/catalog-helpers";
import type { MarkupBasis, PricelistColumnDefinition } from "./pricelists-columns";
import {
  getRegionById,
  getSeedCellValue,
  getSeedDealerStatus,
  PRICELIST_REGIONS,
  scopeHasRegion,
  type PricelistRow,
  type PricelistScope,
} from "./pricelists-demo-data";
import { SYSTEM_PARAMETER_ID } from "./pricelists-parameters";
import {
  buildPriceCellId,
  buildStatusCellId,
  computeMarkupPercent,
  toUsd,
  type CurrencyCode,
  type PriceField,
} from "./pricelists-helpers";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";
import type { PricelistParameters } from "./use-pricelist-parameters";

// The export only reads cell values, so it depends on the narrowest possible
// slice of the collab/parameters surfaces — this keeps `buildExportMatrix` a
// pure, easily testable function.
export type ExportCollab = Pick<PricelistsCollab, "getCell" | "getStatus">;
export type ExportParameters = Pick<PricelistParameters, "enabled" | "resolveCell">;

export type BuildExportMatrixArgs = {
  rows: PricelistRow[];
  /** Visible static columns in scope order (leading + `afterParameters` trailing). */
  columns: PricelistColumnDefinition[];
  /** Visible dynamic parameter columns, inserted between leading and trailing. */
  parameterColumns: PricelistColumnDefinition[];
  regionId: string;
  collab: ExportCollab;
  parameters: ExportParameters;
};

export type ExportPricelistArgs = BuildExportMatrixArgs & {
  scope: PricelistScope;
};

// Numbers stay raw so Excel can compute on them; the number format only changes
// how the value is displayed. Prices carry their currency code as a literal
// suffix; USD, parameters, and markup are plain integers (the markup `%` unit
// lives in the column header, like the USD and parameter columns).
const CURRENCY_NUMBER_FORMAT = (currency: CurrencyCode): string => `#,##0" ${currency}"`;
const USD_NUMBER_FORMAT = "#,##0";
const PARAMETER_NUMBER_FORMAT = "#,##0";
const MARKUP_NUMBER_FORMAT = "#,##0";

const numberCell = (value: number, format: string): Cell => ({ type: Number, value, format });

const stringCell = (value: string): Cell => ({ type: String, value });

const countAvailableRegions = (row: PricelistRow, collab: ExportCollab): number =>
  PRICELIST_REGIONS.reduce((available, region) => {
    const status = collab.getStatus(buildStatusCellId(region.id, row.id)) ?? getSeedDealerStatus(row, region.id);
    return status === "available" ? available + 1 : available;
  }, 0);

/**
 * Resolves the displayed value of a single cell, mirroring the logic in
 * `PricelistTableRow`: edited collab values win, otherwise the deterministic
 * seed is used. Returns `null` for empty numeric cells so Excel leaves them
 * blank.
 */
const resolveCellForColumn = (
  column: PricelistColumnDefinition,
  row: PricelistRow,
  regionId: string,
  collab: ExportCollab,
  parameters: ExportParameters,
): Cell => {
  const region = getRegionById(regionId);

  const resolvePrice = (field: PriceField) => {
    const cellId = buildPriceCellId(field === "purchase" ? null : regionId, row.id, field);
    return collab.getCell(cellId) ?? getSeedCellValue(row, field, region);
  };

  const resolveFieldUsd = (field: PriceField): number | null => {
    const value = resolvePrice(field);
    return toUsd(value.amount, value.currency);
  };

  // Dealer markup = dealer over purchase. Retail markup = retail over the landed
  // cost (dealer price + Total Expenses), so it reflects the dealer's margin.
  const resolveMarkupPercent = (basis: MarkupBasis): number | null => {
    if (basis === "dealer") {
      return computeMarkupPercent(resolveFieldUsd("purchase"), resolveFieldUsd("dealer"));
    }
    const dealerUsd = resolveFieldUsd("dealer");
    const expensesUsd = parameters.enabled ? parameters.resolveCell(SYSTEM_PARAMETER_ID, row.id).value : 0;
    const landedCostUsd = dealerUsd === null ? null : dealerUsd + expensesUsd;
    return computeMarkupPercent(landedCostUsd, resolveFieldUsd("retail"));
  };

  switch (column.kind) {
    case "name":
      return stringCell(getDisplayProductName(row.name));
    case "statusSummary": {
      const available = countAvailableRegions(row, collab);
      return stringCell(`Sold in ${available} of ${PRICELIST_REGIONS.length} regions`);
    }
    case "usd": {
      const usd = resolveFieldUsd(column.field as PriceField);
      return usd === null ? null : numberCell(usd, USD_NUMBER_FORMAT);
    }
    case "markup": {
      const percent = resolveMarkupPercent(column.markup ?? "dealer");
      return percent === null ? null : numberCell(percent, MARKUP_NUMBER_FORMAT);
    }
    case "parameter": {
      if (!column.paramId) {
        return null;
      }
      const { value } = parameters.resolveCell(column.paramId, row.id);
      return numberCell(value, PARAMETER_NUMBER_FORMAT);
    }
    case "editable": {
      const value = resolvePrice(column.field as PriceField);
      return value.amount === null ? null : numberCell(value.amount, CURRENCY_NUMBER_FORMAT(value.currency));
    }
    default:
      return null;
  }
};

/** Mirrors the table column assembly: leading + parameters + trailing. */
export const assembleExportColumns = (
  columns: PricelistColumnDefinition[],
  parameterColumns: PricelistColumnDefinition[],
): PricelistColumnDefinition[] => {
  const leadingColumns = columns.filter((column) => !column.afterParameters);
  const trailingColumns = columns.filter((column) => column.afterParameters);
  return [...leadingColumns, ...parameterColumns, ...trailingColumns];
};

/** Builds the full sheet matrix (bold header row + one row per product). */
export const buildExportMatrix = ({
  rows,
  columns,
  parameterColumns,
  regionId,
  collab,
  parameters,
}: BuildExportMatrixArgs): SheetData => {
  const allColumns = assembleExportColumns(columns, parameterColumns);

  const headerRow: Row = allColumns.map((column) => ({ value: column.label, fontWeight: "bold" }));

  const dataRows: Row[] = rows.map((row) =>
    allColumns.map((column) => resolveCellForColumn(column, row, regionId, collab, parameters)),
  );

  return [headerRow, ...dataRows];
};

const COLUMN_WIDTH_BY_KIND: Partial<Record<PricelistColumnDefinition["kind"], number>> = {
  name: 36,
  statusSummary: 24,
};

const DEFAULT_COLUMN_WIDTH = 18;

const buildColumnWidths = (allColumns: PricelistColumnDefinition[]) =>
  allColumns.map((column) => ({ width: COLUMN_WIDTH_BY_KIND[column.kind] ?? DEFAULT_COLUMN_WIDTH }));

export const buildExportFileName = (scope: PricelistScope, regionId: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  const regionPart = scopeHasRegion(scope) ? `-${regionId}` : "";
  return `pricelist-${scope}${regionPart}-${date}.xlsx`;
};

/**
 * Generates and downloads an `.xlsx` file for the current pricelist. The
 * library is imported lazily so it stays out of the initial client bundle and
 * only runs in the browser.
 */
export const exportPricelistToXlsx = async (args: ExportPricelistArgs): Promise<void> => {
  const { scope, ...matrixArgs } = args;
  const data = buildExportMatrix(matrixArgs);
  const allColumns = assembleExportColumns(args.columns, args.parameterColumns);

  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  await writeXlsxFile(data, {
    sheet: "Pricelist",
    columns: buildColumnWidths(allColumns),
  }).toFile(buildExportFileName(scope, args.regionId));
};
