// english-ui:ignore-file
"use client";

import { hrefForOwner } from "@/features/logistics/logistics-availability";
import { formatSignedQuantity, formatTimestamp, SOURCE_TYPE_LABELS } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type { LogisticsSnapshot, StockTransaction } from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { SourceLink } from "@/features/logistics/ui/source-link";
import { StockStateBadge } from "@/features/logistics/ui/status-badge";
import { TableCell, TableRow } from "@/components/ui/table";

export const DocumentLedger = ({
  snapshot,
  filter,
  title = "Журнал",
}: {
  snapshot: LogisticsSnapshot;
  filter: (entry: StockTransaction) => boolean;
  title?: string;
}) => {
  const rows = snapshot.transactions
    .filter(filter)
    .sort((left, right) => right.postedAt.localeCompare(left.postedAt))
    .slice(0, 16);

  if (rows.length === 0) {
    return null;
  }

  return (
    <LogisticsTableCard title={title} headers={["Проведено", "Операция", "Товар", "Кол-во", "Состояние", "Место", "Источник"]}>
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
            <TableCell className="px-3 py-2 text-sm tabular-nums">
              {formatSignedQuantity(entry.quantity, product?.unit)}
            </TableCell>
            <TableCell className="px-3 py-2">
              <StockStateBadge state={entry.stockState} />
            </TableCell>
            <TableCell className="px-3 py-2 text-sm">
              <LocationLink
                snapshot={snapshot}
                locationType={entry.locationType}
                locationId={entry.locationId}
              />
            </TableCell>
            <TableCell className="px-3 py-2 text-sm">
              <SourceLink
                snapshot={snapshot}
                sourceType={entry.sourceType}
                sourceId={entry.sourceId}
              />
              {!isFreeOwner(entry.ownerType, entry.ownerId) ? (
                <span className="ml-1.5 inline-flex">
                  <LogisticsCodeBadge
                    code={ownerLabel(snapshot, entry.ownerType, entry.ownerId)}
                    href={hrefForOwner(entry.ownerType, entry.ownerId) ?? undefined}
                  />
                </span>
              ) : null}
            </TableCell>
          </TableRow>
        );
      })}
    </LogisticsTableCard>
  );
};
