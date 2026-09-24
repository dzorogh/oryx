import {
  hrefForOwner,
  hrefForProductionOrder,
  hrefForTransfer,
  hrefForWarehouse,
} from "@/features/logistics/logistics-availability";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { FREE_OWNER_LABEL } from "@/features/logistics/logistics-labels";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import type { OwnerType, ReservationLocationType } from "@/features/logistics/logistics-types";

export type HoldBadge = { label: string; href: string | null };

export type HoldPlace = HoldBadge & {
  locationType: ReservationLocationType;
  locationId: string;
  isPlantWarehouse: boolean;
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
