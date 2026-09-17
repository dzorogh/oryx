// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { TableCell, TableRow } from "@/components/ui/table";
import { hrefForCustomerOrder } from "@/features/logistics/logistics-availability";
import {
  formatSignedQuantity,
  formatTimestamp,
  LOCATION_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/features/logistics/logistics-labels";
import { orderNumber, productById } from "@/features/logistics/logistics-lookups";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type { SourceType } from "@/features/logistics/logistics-types";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { SourceLink } from "@/features/logistics/ui/source-link";
import { StockStateBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const SOURCE_FILTERS: Array<{ id: "all" | SourceType; label: string }> = [
  { id: "all", label: "Все операции" },
  ...Object.entries(SOURCE_TYPE_LABELS).map(([id, label]) => ({
    id: id as SourceType,
    label,
  })),
];

export const LedgerPage = () => {
  const { snapshot, isLoading, error } = useLogisticsStore();
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]["id"]>("all");

  const rows = useMemo(() => {
    const sorted = [...snapshot.transactions].sort((left, right) =>
      right.postedAt.localeCompare(left.postedAt),
    );
    if (sourceFilter === "all") {
      return sorted;
    }
    return sorted.filter((entry) => entry.sourceType === sourceFilter);
  }, [snapshot.transactions, sourceFilter]);

  return (
    <LogisticsPageShell crumbs={[{ label: "Журнал" }]}>
      <LogisticsToolbar
        title="Журнал"
        description="Неизменяемый журнал остатков. Ошибки исправляются сторно, а не правкой истории."
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Операции журнала">
          {SOURCE_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={sourceFilter === item.id}
              role="tab"
              aria-selected={sourceFilter === item.id}
              onClick={() => setSourceFilter(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {!isLoading && !error ? (
        <LogisticsTableCard
          headers={[
            "Проведено",
            "Операция",
            "Товар",
            "Кол-во",
            "Место",
            "Состояние",
            "Заказ",
            "Источник",
            "Сторно к",
          ]}
          isEmpty={rows.length === 0}
          empty="Журнал пуст."
        >
          {rows.map((entry) => {
            const product = productById(snapshot, entry.productId);
            return (
              <TableRow key={entry.transactionId}>
                <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                  {formatTimestamp(entry.postedAt)}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">{SOURCE_TYPE_LABELS[entry.sourceType]}</TableCell>
                <TableCell className="px-3 py-2">
                  <ProductIdentity snapshot={snapshot} productId={entry.productId} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums font-medium">
                  {formatSignedQuantity(entry.quantity, product?.unit)}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">{LOCATION_LABELS[entry.locationType]}</TableCell>
                <TableCell className="px-3 py-2">
                  <StockStateBadge state={entry.stockState} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  {entry.customerOrderId ? (
                    <LogisticsCodeBadge
                      code={orderNumber(snapshot, entry.customerOrderId)}
                      href={hrefForCustomerOrder(entry.customerOrderId)}
                    />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <SourceLink
                    snapshot={snapshot}
                    sourceType={entry.sourceType}
                    sourceId={entry.sourceId}
                  />
                </TableCell>
                <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                  {entry.reversesTransactionId ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}
    </LogisticsPageShell>
  );
};
