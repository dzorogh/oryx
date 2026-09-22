// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { hrefForDocument, hrefForLocation, hrefForOwner } from "@/features/logistics/logistics-availability";
import {
  ASSIGNED_TO_LABEL,
  formatSignedQuantity,
  formatTimestamp,
  LEDGER_ASSIGNED_TO_KIND_LABELS,
  LEDGER_DOCUMENT_KIND_LABELS,
  locationKindLabel,
} from "@/features/logistics/logistics-labels";
import { documentLabel, locationIdentity, ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import { LedgerEntityIdentity } from "@/features/logistics/ui/ledger-entity-identity";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type { LogisticsSnapshot, StockTransaction } from "@/features/logistics/logistics-types";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { TableCell, TableRow } from "@/components/ui/table";
import { buildPaginationItems } from "@/lib/pagination";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const LEDGER_PAGE_SIZE = 20;

export type DocumentLedgerHide = "product" | "location" | "assignedTo" | "document";

const COLUMN_LABELS = {
  time: "Время",
  change: "Изменение",
  product: "Товар",
  location: "Место",
  assignedTo: ASSIGNED_TO_LABEL,
  document: "Документ",
} as const;

export const documentLedgerRows = (
  transactions: StockTransaction[],
  filter: (entry: StockTransaction) => boolean,
) =>
  [...transactions].filter(filter).sort((left, right) => {
    const byTime = right.createdAt.localeCompare(left.createdAt);
    return byTime !== 0 ? byTime : right.id.localeCompare(left.id);
  });

export const paginateLedgerRows = <T,>(rows: T[], page: number, pageSize = LEDGER_PAGE_SIZE) => {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visiblePage = Math.min(Math.max(page, 1), totalPages);
  const start = (visiblePage - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    total,
    totalPages,
    visiblePage,
    shownCount: Math.min(pageSize, Math.max(0, total - start)),
  };
};

const LedgerPager = ({
  shownCount,
  totalCount,
  visiblePage,
  totalPages,
  onPageChange,
}: {
  shownCount: number;
  totalCount: number;
  visiblePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const paginationItems = buildPaginationItems(visiblePage, totalPages);
  const isFirstPage = visiblePage <= 1;
  const isLastPage = visiblePage >= totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 px-3 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-muted-foreground">
        Показано {shownCount} из {totalCount}
      </span>
      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Назад"
                aria-disabled={isFirstPage}
                className={isFirstPage ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (!isFirstPage) {
                    onPageChange(visiblePage - 1);
                  }
                }}
              />
            </PaginationItem>
            {paginationItems.map((item, index) => (
              <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : `page-${item}`}>
                {item === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={item === visiblePage}
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(item);
                    }}
                    aria-label={`На страницу ${item}`}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                text="Далее"
                aria-disabled={isLastPage}
                className={isLastPage ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (!isLastPage) {
                    onPageChange(visiblePage + 1);
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
};

export const DocumentLedger = ({
  snapshot,
  filter,
  hide,
  title = "Движения",
}: {
  snapshot: LogisticsSnapshot;
  filter: (entry: StockTransaction) => boolean;
  hide?: DocumentLedgerHide;
  title?: string;
}) => {
  const [page, setPage] = useState(1);
  const rows = useMemo(() => documentLedgerRows(snapshot.transactions, filter), [filter, snapshot.transactions]);
  const paged = useMemo(() => paginateLedgerRows(rows, page), [page, rows]);

  if (rows.length === 0) {
    return null;
  }

  const headers = [
    COLUMN_LABELS.time,
    COLUMN_LABELS.change,
    ...(hide === "product" ? [] : [COLUMN_LABELS.product]),
    ...(hide === "location" ? [] : [COLUMN_LABELS.location]),
    ...(hide === "assignedTo" ? [] : [COLUMN_LABELS.assignedTo]),
    ...(hide === "document" ? [] : [COLUMN_LABELS.document]),
  ];

  return (
    <LogisticsTableCard
      title={title}
      headers={headers}
      footer={
        <LedgerPager
          shownCount={paged.shownCount}
          totalCount={paged.total}
          visiblePage={paged.visiblePage}
          totalPages={paged.totalPages}
          onPageChange={setPage}
        />
      }
    >
      {paged.pageRows.map((entry) => {
        const product = productById(snapshot, entry.productId);
        const place = locationIdentity(snapshot, entry.locationType, entry.locationId);
        return (
          <TableRow key={entry.id}>
            <TableCell className="px-3 py-2 text-xs text-muted-foreground">
              {formatTimestamp(entry.createdAt)}
            </TableCell>
            <TableCell className="px-3 py-2 text-sm tabular-nums">
              {formatSignedQuantity(entry.quantity, product?.unit)}
            </TableCell>
            {hide === "product" ? null : (
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={entry.productId} />
              </TableCell>
            )}
            {hide === "location" ? null : (
              <TableCell className="px-3 py-2">
                <LedgerEntityIdentity
                  kind={locationKindLabel(entry.locationType, place.isPlantWarehouse)}
                  code={place.title}
                  href={hrefForLocation(snapshot, entry.locationType, entry.locationId)}
                />
              </TableCell>
            )}
            {hide === "assignedTo" ? null : (
              <TableCell className="px-3 py-2">
                {isFreeOwner(entry.assignedToType, entry.assignedToId) ? (
                  <LedgerEntityIdentity kind={LEDGER_ASSIGNED_TO_KIND_LABELS.free} />
                ) : (
                  <LedgerEntityIdentity
                    kind={LEDGER_ASSIGNED_TO_KIND_LABELS[entry.assignedToType ?? "free"]}
                    code={ownerLabel(snapshot, entry.assignedToType, entry.assignedToId)}
                    href={hrefForOwner(entry.assignedToType, entry.assignedToId, snapshot)}
                  />
                )}
              </TableCell>
            )}
            {hide === "document" ? null : (
              <TableCell className="px-3 py-2">
                <LedgerEntityIdentity
                  kind={LEDGER_DOCUMENT_KIND_LABELS[entry.documentType]}
                  code={documentLabel(snapshot, entry.documentType, entry.documentId)}
                  href={hrefForDocument(entry.documentType, entry.documentId, snapshot)}
                />
              </TableCell>
            )}
          </TableRow>
        );
      })}
    </LogisticsTableCard>
  );
};

export { LedgerPager };
