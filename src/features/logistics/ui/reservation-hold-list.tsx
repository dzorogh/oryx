"use client";

import { Fragment, useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  hrefForOwner,
  hrefForProductionOrder,
  hrefForTransfer,
  hrefForWarehouse,
} from "@/features/logistics/logistics-availability";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { FREE_OWNER_LABEL, RESERVATION_DIRECTION_LABELS, formatQuantity } from "@/features/logistics/logistics-labels";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import type {
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
  { id: "all", label: "Все" },
  { id: "draft", label: "Черновик" },
  { id: "posted", label: "Проведён" },
  { id: "cancelled", label: "Отменён" },
];

export type HoldBadge = { label: string; href: string | null };

export type HoldPlace = HoldBadge & {
  locationType: ReservationLocationType;
  locationId: string;
  isPlantWarehouse: boolean;
};

export type ReservationHoldLine = {
  id: string;
  productId: string;
  quantity: number;
  productName: string | null;
  productUnit: string;
  source: HoldBadge;
};

export type ReservationHoldRow = {
  id: string;
  number: string;
  href: string;
  status: ReservationStatus;
  direction: ReservationDirection;
  destination: HoldBadge;
  place: HoldPlace;
  lines: ReservationHoldLine[];
};

/** Owner badge from a ready owner number (customer order number or region code). */
export const holdOwnerBadge = (
  ownerType: OwnerType | null,
  ownerId: string | null,
  ownerNumber: string | null,
): HoldBadge => {
  const href = hrefForOwner(ownerType, ownerId);
  if (isFreeOwner(ownerType, ownerId)) {
    return { label: FREE_OWNER_LABEL, href };
  }
  if (ownerType === "order" && ownerId) {
    return { label: ownerNumber ?? ownerId, href };
  }
  if (ownerType === "region" && ownerId) {
    return { label: ownerNumber ?? formatLogisticsCode("region", ownerId), href };
  }
  return { label: ownerId ?? FREE_OWNER_LABEL, href };
};

/** Reservation place from a ready document number / sequence of the location. */
export const holdPlace = (place: {
  locationType: ReservationLocationType;
  locationId: string;
  locationNumber: string | null;
  locationSequence: string | null;
  locationIsPlantWarehouse: boolean;
}): HoldPlace => {
  const { locationType, locationId, locationNumber, locationSequence } = place;
  const base = { locationType, locationId, isPlantWarehouse: place.locationIsPlantWarehouse };
  if (locationType === "warehouse") {
    return { ...base, label: formatLogisticsCode("warehouse", locationId), href: hrefForWarehouse(locationId) };
  }
  const label = locationNumber ?? locationId;
  if (locationType === "transfer") {
    return { ...base, label, href: hrefForTransfer(locationSequence ?? locationId) };
  }
  return { ...base, label, href: locationSequence ? hrefForProductionOrder(locationSequence) : null };
};

const OwnerBadge = ({ badge }: { badge: HoldBadge }) =>
  badge.href ? (
    <LogisticsCodeBadge code={badge.label} href={badge.href} />
  ) : (
    <span className="text-sm">{badge.label}</span>
  );

export const ReservationHoldTable = ({
  rows,
  placeHeader,
}: {
  rows: ReservationHoldRow[];
  placeHeader: string;
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  return (
    <LogisticsTableCard
      headers={["Номер", "Направление", "Назначение", "Источник", "Товары", placeHeader, "Статус"]}
      isEmpty={rows.length === 0}
    >
      {rows.map((item) => {
        const numberBadge = <LogisticsCodeBadge code={item.number} href={item.href} />;
        const statusBadge = <DocumentStatusBadge status={item.status} />;
        const directionLabel = RESERVATION_DIRECTION_LABELS[item.direction];
        const destCell = <OwnerBadge badge={item.destination} />;
        const placeCell = (
          <LocationLink
            locationType={item.place.locationType}
            locationId={item.place.locationId}
            label={item.place.label}
            href={item.place.href}
            isPlantWarehouse={item.place.isPlantWarehouse}
            showKind
          />
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
            {visibleLines.map((line, index) => (
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
                  <OwnerBadge badge={line.source} />
                </TableCell>
                <TableCell className="px-3 py-2 align-top">
                  <ProductIdentity productId={line.productId} productName={line.productName} />
                  <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatQuantity(line.quantity, line.productUnit)}
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
            ))}
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
