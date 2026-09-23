// english-ui:ignore-file
"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  hrefForLocation,
  hrefForOwner,
  placeStockBreakdown,
  productPlacesByState,
} from "@/features/logistics/logistics-availability";
import { formatQuantity, locationKindLabel } from "@/features/logistics/logistics-labels";
import { locationIdentity, ownerLabel } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { PlantLink } from "@/features/logistics/ui/plant-link";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { cn } from "@/lib/utils";

const Qty = ({
  quantity,
  unit,
  empty = "—",
}: {
  quantity: number | null;
  unit?: string;
  empty?: string;
}) => {
  if (quantity == null) {
    return <span className="text-muted-foreground">{empty}</span>;
  }
  return (
    <span className={cn("tabular-nums", quantity === 0 ? "text-muted-foreground" : "font-medium")}>
      {formatQuantity(quantity, unit)}
    </span>
  );
};

export const ProductBalancesTable = ({
  snapshot,
  balances,
  productId,
  unit,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  productId: string;
  unit?: string;
}) => {
  const places = productPlacesByState(balances, productId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <LogisticsTableCard
      title="Остатки"
      headers={["Место", "Свободно", "Зарезервировано", "У клиента"]}
      isEmpty={places.length === 0}
      empty="Для этого товара пока нет остатков."
    >
      {places.map((place) => {
        const key = `${place.locationType}:${place.locationId}`;
        const identity = locationIdentity(snapshot, place.locationType, place.locationId);
        const href = hrefForLocation(snapshot, place.locationType, place.locationId);
        const kind = locationKindLabel(place.locationType, identity.isPlantWarehouse);
        const breakdown = placeStockBreakdown(balances, productId, place.locationType, place.locationId);
        const canExpand =
          breakdown.reserved.length > 0 ||
          (place.locationType !== "customer_order" && breakdown.shipped.length > 0);
        const isOpen = canExpand && !collapsed.has(key);
        const title = <LogisticsCodeBadge code={identity.title} href={href} />;

        const nested = isOpen
          ? [
              ...breakdown.reserved
                .slice()
                .sort((left, right) =>
                  ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                    ownerLabel(snapshot, right.ownerType, right.ownerId),
                  ),
                )
                .map((item) => ({
                  key: `${key}:reserved:${item.ownerType}:${item.ownerId}`,
                  label: (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      Зарезервировано для
                      <LogisticsCodeBadge
                        code={ownerLabel(snapshot, item.ownerType, item.ownerId)}
                        href={hrefForOwner(item.ownerType, item.ownerId) ?? undefined}
                      />
                    </span>
                  ),
                  free: null as number | null,
                  reserved: item.quantity,
                  shipped: null as number | null,
                })),
              ...(place.locationType === "customer_order"
                ? []
                : breakdown.shipped
                    .slice()
                    .sort((left, right) =>
                      ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                        ownerLabel(snapshot, right.ownerType, right.ownerId),
                      ),
                    )
                    .map((item) => ({
                      key: `${key}:shipped:${item.ownerType}:${item.ownerId}`,
                      label: (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          Отгружено по
                          <LogisticsCodeBadge
                            code={ownerLabel(snapshot, item.ownerType, item.ownerId)}
                            href={hrefForOwner(item.ownerType, item.ownerId) ?? undefined}
                          />
                        </span>
                      ),
                      free: null as number | null,
                      reserved: null as number | null,
                      shipped: item.quantity,
                    }))),
              {
                key: `${key}:unreserved`,
                label: <span className="text-muted-foreground">Свободно</span>,
                free: breakdown.free,
                reserved: null as number | null,
                shipped: null as number | null,
              },
            ]
          : [];

        return (
          <Fragment key={key}>
            <TableRow className={isOpen ? "border-b-0" : undefined}>
              <TableCell className="px-3 py-2">
                <div className="flex items-start gap-1.5">
                  {canExpand ? (
                    <button
                      type="button"
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? `Свернуть ${kind} ${identity.title}` : `Развернуть ${kind} ${identity.title}`}
                      onClick={() => toggle(key)}
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform",
                          isOpen && "rotate-90",
                        )}
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <span className="inline-block size-5 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{kind}</p>
                    <p className="text-sm font-medium">
                      {title}
                      {identity.plantId &&
                      (place.locationType === "production_order" || identity.hint) ? (
                        <>
                          <span className="font-normal text-muted-foreground"> · </span>
                          <PlantLink
                            snapshot={snapshot}
                            plantId={identity.plantId}
                            className="font-normal"
                          />
                        </>
                      ) : identity.hint ? (
                        <span className="font-normal text-muted-foreground"> · {identity.hint}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Qty quantity={place.free} unit={unit} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Qty quantity={place.reserved} unit={unit} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Qty quantity={place.shipped} unit={unit} />
              </TableCell>
            </TableRow>
            {nested.map((row) => (
              <TableRow key={row.key} className="bg-muted/20 hover:bg-muted/30">
                <TableCell className="px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-5 shrink-0" aria-hidden />
                    {row.label}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <Qty quantity={row.free} unit={unit} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <Qty quantity={row.reserved} unit={unit} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <Qty quantity={row.shipped} unit={unit} />
                </TableCell>
              </TableRow>
            ))}
          </Fragment>
        );
      })}
    </LogisticsTableCard>
  );
};
