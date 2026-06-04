import { describe, expect, it } from "vitest";
import {
  assembleExportColumns,
  buildExportFileName,
  buildExportMatrix,
  type ExportCollab,
  type ExportParameters,
} from "@/components/store/pim/pricelists/pricelists-export";
import {
  getDefaultVisibleColumnIds,
  getVisibleColumnDefinitions,
  type PricelistColumnDefinition,
} from "@/components/store/pim/pricelists/pricelists-columns";
import {
  getPricelistRows,
  getRegionById,
  getSeedCellValue,
  DEFAULT_REGION_ID,
} from "@/components/store/pim/pricelists/pricelists-demo-data";
import {
  computeMarkupPercent,
  convertAmount,
  toUsd,
} from "@/components/store/pim/pricelists/pricelists-helpers";

const [row] = getPricelistRows();
const region = getRegionById(DEFAULT_REGION_ID);

const supplierColumns = getVisibleColumnDefinitions("supplier", getDefaultVisibleColumnIds("supplier"));

const paramColumn: PricelistColumnDefinition = {
  id: "param:customs",
  label: "Customs (USD)",
  kind: "parameter",
  paramId: "customs",
  isParameter: true,
  widthClass: "",
  defaultVisible: true,
};

// Empty collab → every cell falls back to its deterministic seed value.
const emptyCollab: ExportCollab = {
  getCell: () => undefined,
  getStatus: () => undefined,
};

const constantParameters: ExportParameters = {
  enabled: true,
  resolveCell: () => ({ value: 100, isOverridden: false }),
};

type CellObject = { type?: unknown; value?: unknown; format?: string; fontWeight?: string };

const headerLabels = (matrix: ReturnType<typeof buildExportMatrix>): string[] =>
  matrix[0].map((cell) => (cell as CellObject).value as string);

const cellAt = (matrix: ReturnType<typeof buildExportMatrix>, rowIndex: number, label: string): CellObject | null => {
  const columnIndex = headerLabels(matrix).indexOf(label);
  return matrix[rowIndex][columnIndex] as CellObject | null;
};

describe("buildExportMatrix", () => {
  it("emits a bold header row mirroring the assembled visible columns", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [paramColumn],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    const expected = assembleExportColumns(supplierColumns, [paramColumn], "USD").map((column) => column.label);
    expect(headerLabels(matrix)).toEqual(expected);
    expect((matrix[0][0] as CellObject).fontWeight).toBe("bold");
    expect(matrix).toHaveLength(2);
  });

  it("writes editable prices as numbers with a currency number format", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    const seed = getSeedCellValue(row, "purchase", region);
    const cell = cellAt(matrix, 1, "Plant Price");
    expect(cell?.type).toBe(Number);
    expect(cell?.value).toBe(seed.amount);
    expect(cell?.format).toBe(`#,##0" ${seed.currency}"`);
  });

  it("writes USD columns as plain integers", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    const seed = getSeedCellValue(row, "purchase", region);
    const cell = cellAt(matrix, 1, "Plant Price (USD)");
    expect(cell?.type).toBe(Number);
    expect(cell?.value).toBe(toUsd(seed.amount, seed.currency));
    expect(cell?.format).toBe("#,##0");
  });

  it("makes the conversion column follow the chosen display currency", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: constantParameters,
      displayCurrency: "EUR",
    });

    const seed = getSeedCellValue(row, "purchase", region);
    const cell = cellAt(matrix, 1, "Plant Price (EUR)");
    expect(cell?.type).toBe(Number);
    expect(cell?.value).toBe(convertAmount(seed.amount, seed.currency, "EUR"));
    expect(cell?.format).toBe("#,##0");
    // The USD-labelled column no longer exists when the display currency is EUR.
    expect(headerLabels(matrix)).not.toContain("Plant Price (USD)");
  });

  it("stores markup as a plain percent number with the unit in the header", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    const purchaseSeed = getSeedCellValue(row, "purchase", region);
    const dealerSeed = getSeedCellValue(row, "dealer", region);
    const expectedPercent = computeMarkupPercent(
      toUsd(purchaseSeed.amount, purchaseSeed.currency),
      toUsd(dealerSeed.amount, dealerSeed.currency),
    );

    const cell = cellAt(matrix, 1, "Global Markup");
    expect(cell?.format).toBe("#,##0");
    expect(cell?.value).toBe(expectedPercent);
  });

  it("prefers edited collab values over the seed", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: {
        getCell: (cellId) => (cellId.endsWith(":purchase") ? { amount: 4242, currency: "EUR" } : undefined),
        getStatus: () => undefined,
      },
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    const cell = cellAt(matrix, 1, "Plant Price");
    expect(cell?.value).toBe(4242);
    expect(cell?.format).toBe(`#,##0" EUR"`);
  });

  it("leaves empty numeric cells blank (null)", () => {
    const matrix = buildExportMatrix({
      rows: [row],
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: {
        getCell: (cellId) => (cellId.endsWith(":purchase") ? { amount: null, currency: "CNY" } : undefined),
        getStatus: () => undefined,
      },
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    expect(cellAt(matrix, 1, "Plant Price")).toBeNull();
    expect(cellAt(matrix, 1, "Plant Price (USD)")).toBeNull();
  });

  it("renders the dealer status summary as text in the global scope", () => {
    const globalColumns = getVisibleColumnDefinitions("global", getDefaultVisibleColumnIds("global"));
    const matrix = buildExportMatrix({
      rows: [row],
      columns: globalColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: { enabled: false, resolveCell: () => ({ value: 0, isOverridden: false }) },
      displayCurrency: "USD",
    });

    const cell = cellAt(matrix, 1, "Dealer Status");
    expect(cell?.type).toBe(String);
    expect(cell?.value).toMatch(/^Sold in \d+ of \d+ regions$/);
  });

  it("writes one data row per product", () => {
    const rows = getPricelistRows().slice(0, 5);
    const matrix = buildExportMatrix({
      rows,
      columns: supplierColumns,
      parameterColumns: [],
      regionId: DEFAULT_REGION_ID,
      collab: emptyCollab,
      parameters: constantParameters,
      displayCurrency: "USD",
    });

    expect(matrix).toHaveLength(rows.length + 1);
  });
});

describe("buildExportFileName", () => {
  it("includes the region for region-scoped pricelists", () => {
    expect(buildExportFileName("supplier", "ru")).toMatch(/^pricelist-supplier-ru-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("omits the region for the global pricelist", () => {
    expect(buildExportFileName("global", "ru")).toMatch(/^pricelist-global-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
