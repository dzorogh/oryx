// english-ui:ignore-file
"use client";

import { productPlacesByState } from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { locationIdentity, productById } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const AvailabilityPanel = ({
  snapshot,
  balances,
  productId,
  title,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  productId: string;
  title?: string;
}) => {
  const product = productById(snapshot, productId);
  const places = productPlacesByState(balances, productId);
  if (!productId) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-xs font-medium text-foreground">
        {title ?? (product ? `Где лежит ${product.name}` : "Остатки")}
      </p>
      {places.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">Свободного и занятого остатка нет.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {places.map((place) => {
            const identity = locationIdentity(snapshot, place.locationType, place.locationId);
            const parts = [
              place.free > 0 ? `свободно ${formatQuantity(place.free, product?.unit)}` : null,
              place.reserved > 0 ? `занято ${formatQuantity(place.reserved, product?.unit)}` : null,
              place.shipped > 0 ? `у клиента ${formatQuantity(place.shipped, product?.unit)}` : null,
            ].filter(Boolean);
            return (
              <li
                key={`${place.locationType}:${place.locationId}`}
                className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
              >
                <LocationLink
                  snapshot={snapshot}
                  locationType={place.locationType}
                  locationId={place.locationId}
                  showKind
                />
                {identity.hint ? <LogisticsCodeBadge code={identity.hint} /> : null}
                {parts.length > 0 ? <span>· {parts.join(" · ")}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
