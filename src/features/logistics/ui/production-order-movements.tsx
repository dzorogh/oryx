// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { isFreeOwner, type LogisticsSnapshot, type StockTransaction } from "@/features/logistics/logistics-types";
import {
  documentLedgerRows,
  LEDGER_PAGE_SIZE,
  paginateLedgerRows,
} from "@/features/logistics/ui/document-ledger";
import { LedgerEntityIdentity } from "@/features/logistics/ui/ledger-entity-identity";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { buildPaginationItems } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

export const ProductionOrderMovements = ({
  snapshot,
  filter,
}: {
  snapshot: LogisticsSnapshot;
  filter: (entry: StockTransaction) => boolean;
}) => {
  const [page, setPage] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const announceRef = useRef<HTMLParagraphElement>(null);
  const rows = useMemo(() => documentLedgerRows(snapshot.transactions, filter), [filter, snapshot.transactions]);
  const paged = useMemo(() => paginateLedgerRows(rows, page, LEDGER_PAGE_SIZE), [page, rows]);

  const announceRange = (visiblePage: number, total: number) => {
    if (total === 0) {
      return;
    }
    const start = (visiblePage - 1) * LEDGER_PAGE_SIZE + 1;
    const end = Math.min(visiblePage * LEDGER_PAGE_SIZE, total);
    if (announceRef.current) {
      announceRef.current.textContent = `Показаны движения ${start}–${end} из ${total}`;
    }
  };

  useEffect(() => {
    announceRange(paged.visiblePage, paged.total);
  }, [paged.total, paged.visiblePage]);

  const pendingFocus = useRef<"heading" | "prev" | "next" | "page" | null>(null);

  const goToPage = (nextPage: number, source: "prev" | "next" | "page") => {
    const next = paginateLedgerRows(rows, nextPage, LEDGER_PAGE_SIZE);
    const atFirst = next.visiblePage <= 1;
    const atLast = next.visiblePage >= next.totalPages;
    if (next.totalPages <= 1) {
      pendingFocus.current = "heading";
    } else if ((source === "prev" && atFirst) || (source === "next" && atLast)) {
      pendingFocus.current = "page";
    } else {
      pendingFocus.current = source;
    }
    setPage(next.visiblePage);
  };

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) {
      return;
    }
    pendingFocus.current = null;
    if (target === "heading") {
      headingRef.current?.focus();
      return;
    }
    const selector =
      target === "prev"
        ? "#movements [data-pager='prev']"
        : target === "next"
          ? "#movements [data-pager='next']"
          : "#movements [aria-current='page']";
    document.querySelector<HTMLElement>(selector)?.focus();
  }, [paged.visiblePage, paged.totalPages]);

  const paginationItems = buildPaginationItems(paged.visiblePage, paged.totalPages);
  const isFirstPage = paged.visiblePage <= 1;
  const isLastPage = paged.visiblePage >= paged.totalPages;

  return (
    <section id="movements" className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
          Движения
        </h2>
      </div>
      <p ref={announceRef} role="status" aria-live="polite" className="sr-only" />

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Движений пока нет.</p>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время</TableHead>
                  <TableHead>Изменение</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead>Место</TableHead>
                  <TableHead>{ASSIGNED_TO_LABEL}</TableHead>
                  <TableHead>Документ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                      <TableCell className="px-3 py-2">
                        <ProductIdentity snapshot={snapshot} productId={entry.productId} />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <LedgerEntityIdentity
                          kind={locationKindLabel(entry.locationType, place.isPlantWarehouse)}
                          code={place.title}
                          href={hrefForLocation(snapshot, entry.locationType, entry.locationId)}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {isFreeOwner(entry.assignedToType, entry.assignedToId) ? (
                          <LedgerEntityIdentity kind={LEDGER_ASSIGNED_TO_KIND_LABELS.free} />
                        ) : (
                          <LedgerEntityIdentity
                            kind={LEDGER_ASSIGNED_TO_KIND_LABELS[entry.assignedToType ?? "free"]}
                            code={ownerLabel(snapshot, entry.assignedToType, entry.assignedToId)}
                            href={hrefForOwner(entry.assignedToType, entry.assignedToId)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <LedgerEntityIdentity
                          kind={LEDGER_DOCUMENT_KIND_LABELS[entry.documentType]}
                          code={documentLabel(snapshot, entry.documentType, entry.documentId)}
                          href={hrefForDocument(entry.documentType, entry.documentId)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {paged.pageRows.map((entry, index) => {
              const product = productById(snapshot, entry.productId);
              const place = locationIdentity(snapshot, entry.locationType, entry.locationId);
              const headingId = `movement-${entry.id}`;
              return (
                <li key={entry.id} className="px-4 py-3">
                  <article aria-labelledby={headingId}>
                    <h3 id={headingId} className="text-sm font-semibold">
                      Движение {(paged.visiblePage - 1) * LEDGER_PAGE_SIZE + index + 1}
                    </h3>
                    <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Время</dt>
                        <dd className="text-sm">
                          <time>{formatTimestamp(entry.createdAt)}</time>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Изменение</dt>
                        <dd className="text-sm font-medium tabular-nums">
                          {formatSignedQuantity(entry.quantity, product?.unit)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Товар</dt>
                        <dd>
                          <ProductIdentity snapshot={snapshot} productId={entry.productId} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Место</dt>
                        <dd>
                          <LedgerEntityIdentity
                            kind={locationKindLabel(entry.locationType, place.isPlantWarehouse)}
                            code={place.title}
                            href={hrefForLocation(snapshot, entry.locationType, entry.locationId)}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">{ASSIGNED_TO_LABEL}</dt>
                        <dd>
                          {isFreeOwner(entry.assignedToType, entry.assignedToId) ? (
                            <LedgerEntityIdentity kind={LEDGER_ASSIGNED_TO_KIND_LABELS.free} />
                          ) : (
                            <LedgerEntityIdentity
                              kind={LEDGER_ASSIGNED_TO_KIND_LABELS[entry.assignedToType ?? "free"]}
                              code={ownerLabel(snapshot, entry.assignedToType, entry.assignedToId)}
                              href={hrefForOwner(entry.assignedToType, entry.assignedToId)}
                            />
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Документ</dt>
                        <dd>
                          <LedgerEntityIdentity
                            kind={LEDGER_DOCUMENT_KIND_LABELS[entry.documentType]}
                            code={documentLabel(snapshot, entry.documentType, entry.documentId)}
                            href={hrefForDocument(entry.documentType, entry.documentId)}
                          />
                        </dd>
                      </div>
                    </dl>
                  </article>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 border-t border-border/60 px-3 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Показано {paged.shownCount} из {paged.total}
            </span>
            {paged.totalPages > 1 ? (
              <nav aria-label="Страницы движений">
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        type="button"
                        variant="ghost"
                        data-pager="prev"
                        disabled={isFirstPage}
                        onClick={() => goToPage(paged.visiblePage - 1, "prev")}
                      >
                        Предыдущая страница
                      </Button>
                    </PaginationItem>
                    {paginationItems.map((item, index) => (
                      <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : `page-${item}`}>
                        {item === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <Button
                            type="button"
                            variant={item === paged.visiblePage ? "outline" : "ghost"}
                            size="icon"
                            aria-current={item === paged.visiblePage ? "page" : undefined}
                            aria-label={`Страница ${item}`}
                            onClick={() => goToPage(item, "page")}
                          >
                            {item}
                          </Button>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <Button
                        type="button"
                        variant="ghost"
                        data-pager="next"
                        disabled={isLastPage}
                        onClick={() => goToPage(paged.visiblePage + 1, "next")}
                      >
                        Следующая страница
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </nav>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
};
