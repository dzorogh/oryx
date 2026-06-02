"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDisplayProductName } from "../products/catalog/catalog-helpers";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";
import { PricelistPriceCell } from "./pricelist-price-cell";
import { PricelistStatusCell } from "./pricelist-status-cell";
import {
  getSeedCellValue,
  getSeedDealerStatus,
  PRICELIST_REGIONS,
  type PricelistRow,
} from "./pricelists-demo-data";
import {
  buildPriceCellId,
  buildStatusCellId,
  formatUsdValue,
  PRICE_USD_DISPLAY_CLASS,
  toUsd,
} from "./pricelists-helpers";

type PricelistsExpandedRegionsProps = {
  row: PricelistRow;
  collab: PricelistsCollab;
};

/**
 * Per-region detail shown when a Global row is expanded. Dealer price reuses the
 * shared per-region "dealer" cells (also edited on the Supplier sheet), while
 * dealer status lives in its own collaboration map. Both edit asynchronously
 * through the same sockets/presence channel as the main table.
 */
export const PricelistsExpandedRegions = ({ row, collab }: PricelistsExpandedRegionsProps) => {
  const displayName = getDisplayProductName(row.name);

  return (
    <div className="rounded-lg border border-[var(--corportal-border-grey)] bg-muted/20">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-[220px]" />
          <col className="w-[188px]" />
          <col className="w-[120px]" />
          <col className="w-[200px]" />
          <col />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 px-3 text-left text-xs">Region</TableHead>
            <TableHead className="h-9 px-2 text-left text-xs">Dealer Price</TableHead>
            <TableHead className="h-9 px-2 text-left text-xs">Dealer Price (USD)</TableHead>
            <TableHead className="h-9 px-2 text-left text-xs">Dealer Status</TableHead>
            <TableHead aria-hidden />
          </TableRow>
        </TableHeader>
        <TableBody>
          {PRICELIST_REGIONS.map((region) => {
            const priceCellId = buildPriceCellId(region.id, row.id, "dealer");
            const priceValue = collab.getCell(priceCellId) ?? getSeedCellValue(row, "dealer", region.currency);

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
                  <PricelistPriceCell
                    value={priceValue}
                    editors={collab.getEditors(priceCellId)}
                    ariaLabel={`Dealer price for ${displayName} in ${region.label}`}
                    onEditingChange={(editing) => collab.setEditing(editing ? priceCellId : null)}
                    onChange={(next) => collab.setCell(priceCellId, next)}
                  />
                </TableCell>
                <TableCell className="px-2 py-2 align-middle">
                  <span className={PRICE_USD_DISPLAY_CLASS}>
                    {formatUsdValue(toUsd(priceValue.amount, priceValue.currency))}
                  </span>
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
    </div>
  );
};
