"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { hrefForOwner } from "@/features/logistics/logistics-availability";
import { formatSignedQuantity, formatTimestamp } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type { LogisticsSnapshot, StockTransaction } from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { DocumentLink } from "@/features/logistics/ui/source-link";
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
  time: "Time",
  change: "Change",
  product: "Product",
  location: "Location",
  assignedTo: "Assigned to",
  document: "Document",
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
        Showing {shownCount} of {totalCount}
      </span>
      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Previous"
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
                    aria-label={`Go to page ${item}`}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                text="Next"
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
  title = "Movements",
}: {
  snapshot: LogisticsSnapshot;
  filter: (entry: StockTransaction) => boolean;
  hide?: DocumentLedgerHide;
  title?: string;
}) => {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
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
        const open = openId === entry.id;
        return (
          <Fragment key={entry.id}>
            <TableRow
              className="cursor-pointer"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) {
                  return;
                }
                setOpenId(open ? null : entry.id);
              }}
              data-state={open ? "open" : "closed"}
            >
              <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                  {formatTimestamp(entry.createdAt)}
                </span>
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
                <TableCell className="px-3 py-2 text-sm">
                  <LocationLink
                    snapshot={snapshot}
                    locationType={entry.locationType}
                    locationId={entry.locationId}
                  />
                </TableCell>
              )}
              {hide === "assignedTo" ? null : (
                <TableCell className="px-3 py-2 text-sm">
                  {isFreeOwner(entry.assignedToType, entry.assignedToId) ? (
                    "Free"
                  ) : (
                    <LogisticsCodeBadge
                      code={ownerLabel(snapshot, entry.assignedToType, entry.assignedToId)}
                      href={hrefForOwner(entry.assignedToType, entry.assignedToId) ?? undefined}
                    />
                  )}
                </TableCell>
              )}
              {hide === "document" ? null : (
                <TableCell className="px-3 py-2 text-sm">
                  <DocumentLink
                    snapshot={snapshot}
                    documentType={entry.documentType}
                    documentId={entry.documentId}
                  />
                </TableCell>
              )}
            </TableRow>
            {open ? (
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={headers.length} className="px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>id {entry.id}</span>
                    <span>
                      location {entry.locationType}/{entry.locationId}
                    </span>
                    <span>
                      assigned_to {entry.assignedToType ?? "null"}/{entry.assignedToId ?? "null"}
                    </span>
                    <span>
                      document {entry.documentType}/{entry.documentId}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </Fragment>
        );
      })}
    </LogisticsTableCard>
  );
};

export { LedgerPager };
