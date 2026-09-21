"use client";

import { Fragment, useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { hrefForOwner } from "@/features/logistics/logistics-availability";
import { RESERVATION_DIRECTION_LABELS, formatQuantity } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById } from "@/features/logistics/logistics-lookups";
import type {
  LogisticsSnapshot,
  OwnerType,
  ReservationDirection,
  ReservationLocationType,
  ReservationStatus,
} from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import {
  DOCUMENT_PRODUCT_LINE_PREVIEW,
  DocumentProductMoreButton,
} from "@/features/logistics/ui/document-product-lines";
import { DocumentStatusBadge } from "@/features/logistics/ui/status-badge";

export const HOLD_STATUS_FILTERS: Array<{ id: "all" | ReservationStatus | "cancelled"; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "posted", label: "Posted" },
  { id: "cancelled", label: "Cancelled" },
];

export type ReservationHoldLine = {
  id: string;
  productId: string;
  quantity: number;
  fromOwnerType: OwnerType | null;
  fromOwnerId: string | null;
};

export type ReservationHoldRow = {
  id: string;
  number: string;
  href: string;
  status: ReservationStatus;
  direction: ReservationDirection;
  toOwnerType: OwnerType | null;
  toOwnerId: string | null;
  locationType: ReservationLocationType;
  locationId: string;
  lines: ReservationHoldLine[];
};

const OwnerBadge = ({
  snapshot,
  ownerType,
  ownerId,
}: {
  snapshot: LogisticsSnapshot;
  ownerType: OwnerType | null;
  ownerId: string | null;
}) => {
  const label = ownerLabel(snapshot, ownerType, ownerId);
  const href = hrefForOwner(ownerType, ownerId);
  return href ? <LogisticsCodeBadge code={label} href={href} /> : <span className="text-sm">{label}</span>;
};

export const ReservationHoldTable = ({
  snapshot,
  rows,
  placeHeader,
}: {
  snapshot: LogisticsSnapshot;
  rows: ReservationHoldRow[];
  placeHeader: string;
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  return (
    <LogisticsTableCard
      headers={["Number", "Direction", "Destination", "Source", "Products", placeHeader, "Status"]}
      isEmpty={rows.length === 0}
    >
      {rows.map((item) => {
        const numberBadge = <LogisticsCodeBadge code={item.number} href={item.href} />;
        const statusBadge = <DocumentStatusBadge status={item.status} />;
        const directionLabel = RESERVATION_DIRECTION_LABELS[item.direction];
        const destCell = <OwnerBadge snapshot={snapshot} ownerType={item.toOwnerType} ownerId={item.toOwnerId} />;
        const placeCell = (
          <LocationLink snapshot={snapshot} locationType={item.locationType} locationId={item.locationId} showKind />
        );

        if (item.lines.length === 0) {
          return (
            <TableRow key={item.id}>
              <TableCell className="px-3 py-2 align-top">{numberBadge}</TableCell>
              <TableCell className="px-3 py-2 align-top text-sm">{directionLabel}</TableCell>
              <TableCell className="px-3 py-2 align-top">{destCell}</TableCell>
              <TableCell className="px-3 py-2 text-sm text-muted-foreground">—</TableCell>
              <TableCell className="px-3 py-2 text-sm text-muted-foreground">—</TableCell>
              <TableCell className="px-3 py-2 align-top text-sm">{placeCell}</TableCell>
              <TableCell className="px-3 py-2 align-top">{statusBadge}</TableCell>
            </TableRow>
          );
        }

        const hidden = Math.max(0, item.lines.length - DOCUMENT_PRODUCT_LINE_PREVIEW);
        const expanded = expandedIds.has(item.id);
        const visibleLines = expanded || hidden === 0 ? item.lines : item.lines.slice(0, DOCUMENT_PRODUCT_LINE_PREVIEW);
        const rowSpan = visibleLines.length + (hidden > 0 ? 1 : 0);

        return (
          <Fragment key={item.id}>
            {visibleLines.map((line, index) => {
              const product = productById(snapshot, line.productId);
              return (
                <TableRow key={line.id}>
                  {index === 0 ? (
                    <TableCell className="px-3 py-2 align-top" rowSpan={rowSpan}>
                      {numberBadge}
                    </TableCell>
                  ) : null}
                  {index === 0 ? (
                    <TableCell className="px-3 py-2 align-top text-sm" rowSpan={rowSpan}>
                      {directionLabel}
                    </TableCell>
                  ) : null}
                  {index === 0 ? (
                    <TableCell className="px-3 py-2 align-top" rowSpan={rowSpan}>
                      {destCell}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-3 py-2 align-top">
                    <OwnerBadge snapshot={snapshot} ownerType={line.fromOwnerType} ownerId={line.fromOwnerId} />
                  </TableCell>
                  <TableCell className="px-3 py-2 align-top">
                    <ProductIdentity snapshot={snapshot} productId={line.productId} />
                    <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formatQuantity(line.quantity, product?.unit)}
                    </div>
                  </TableCell>
                  {index === 0 ? (
                    <TableCell className="px-3 py-2 align-top text-sm" rowSpan={rowSpan}>
                      {placeCell}
                    </TableCell>
                  ) : null}
                  {index === 0 ? (
                    <TableCell className="px-3 py-2 align-top" rowSpan={rowSpan}>
                      {statusBadge}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
            {hidden > 0 ? (
              <TableRow>
                <TableCell className="px-3 py-2" colSpan={2}>
                  <DocumentProductMoreButton
                    hidden={hidden}
                    expanded={expanded}
                    onToggle={() => {
                      setExpandedIds((current) => {
                        const next = new Set(current);
                        if (next.has(item.id)) {
                          next.delete(item.id);
                        } else {
                          next.add(item.id);
                        }
                        return next;
                      });
                    }}
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </Fragment>
        );
      })}
    </LogisticsTableCard>
  );
};
