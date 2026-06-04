"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDisplayProductName } from "../products/catalog/catalog-helpers";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";
import { ColumnHeaderLabel } from "./pricelist-column-header";
import { DerivedValueCell } from "./pricelist-derived-cell";
import { PricelistPriceDualCell } from "./pricelist-price-dual-cell";
import { PricelistStatusCell } from "./pricelist-status-cell";
import { markupDerivedTargetId, type RecalcDeps } from "./pricelist-recalc";
import {
  getSeedCellValue,
  getSeedDealerStatus,
  PRICELIST_REGIONS,
  type PricelistRow,
} from "./pricelists-demo-data";
import {
  buildPriceCellId,
  buildStatusCellId,
  formatMarkupValue,
  type CurrencyCode,
} from "./pricelists-helpers";

type PricelistsExpandedRegionsProps = {
  row: PricelistRow;
  collab: PricelistsCollab;
  deps: RecalcDeps;
  displayCurrency: CurrencyCode;
  onDisplayCurrencyChange: (currency: CurrencyCode) => void;
};

/**
 * Per-region detail shown when a Global row is expanded. Dealer price reuses the
 * shared per-region "dealer" cells (also edited on the Supplier sheet), while
 * dealer status lives in its own collaboration map. Both edit asynchronously
 * through the same sockets/presence channel as the main table.
 */
export const PricelistsExpandedRegions = ({
  row,
  collab,
  deps,
  displayCurrency,
  onDisplayCurrencyChange,
}: PricelistsExpandedRegionsProps) => {
  const displayName = getDisplayProductName(row.name);

  return (
    <div className="rounded-lg border border-[var(--corportal-border-grey)] bg-muted/20">
      <TooltipProvider delay={0} closeDelay={0}>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[220px]" />
            <col className="w-[300px]" />
            <col className="w-[100px]" />
            <col className="w-[200px]" />
            <col />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 min-w-0 overflow-hidden px-3 text-left text-xs">
                <ColumnHeaderLabel label="Region" description="Sales region for this product." />
              </TableHead>
              <TableHead className="h-9 min-w-0 overflow-hidden px-2 text-left text-xs">
                <ColumnHeaderLabel
                  label="Dealer Price"
                  description="Price charged to the dealer in this region. Edit it in its source currency or in USD — both stay in sync."
                />
              </TableHead>
              <TableHead className="h-9 min-w-0 overflow-hidden px-2 text-left text-xs">
                <ColumnHeaderLabel
                  label="Global Markup"
                  description="Markup over Plant Price that is included in the Dealer Price."
                />
              </TableHead>
              <TableHead className="h-9 min-w-0 overflow-hidden px-2 text-left text-xs">
                <ColumnHeaderLabel
                  label="Dealer Status"
                  description="Whether this product is available in the region."
                />
              </TableHead>
              <TableHead aria-hidden />
            </TableRow>
          </TableHeader>
          <TableBody>
            {PRICELIST_REGIONS.map((region) => {
              const priceCellId = buildPriceCellId(region.id, row.id, "dealer");
              const priceValue = collab.getCell(priceCellId) ?? getSeedCellValue(row, "dealer", region);

              const statusCellId = buildStatusCellId(region.id, row.id);
              const statusValue = collab.getStatus(statusCellId) ?? getSeedDealerStatus(row, region.id);

              return (
                <TableRow key={region.id} className="hover:bg-muted/30">
                  <TableCell className="px-3 py-2 align-middle">
                    <span className="block truncate text-sm text-foreground" title={region.label}>
                      {region.label}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <PricelistPriceDualCell
                      value={priceValue}
                      editors={collab.getEditors(priceCellId)}
                      displayCurrency={displayCurrency}
                      onDisplayCurrencyChange={onDisplayCurrencyChange}
                      ariaLabel={`Dealer price for ${displayName} in ${region.label}`}
                      columnKey={`region-dealer:${row.id}`}
                      onEditingChange={(editing) => collab.setEditing(editing ? priceCellId : null)}
                      onChange={(next) => collab.setCell(priceCellId, next)}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <DerivedValueCell
                      collab={collab}
                      deps={deps}
                      targetId={markupDerivedTargetId("dealer", region.id, row.id)}
                      format={formatMarkupValue}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2 align-middle">
                    <PricelistStatusCell
                      value={statusValue}
                      editors={collab.getEditors(statusCellId)}
                      ariaLabel={`Dealer status for ${displayName} in ${region.label}`}
                      onEditingChange={(editing) => collab.setEditing(editing ? statusCellId : null)}
                      onChange={(next) => collab.setStatus(statusCellId, next)}
                    />
                  </TableCell>
                  <TableCell aria-hidden />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  );
};
