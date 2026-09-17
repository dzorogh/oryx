import { hrefForLocation } from "@/features/logistics/logistics-availability";
import { locationKindLabel } from "@/features/logistics/logistics-labels";
import { locationIdentity } from "@/features/logistics/logistics-lookups";
import type { LocationType, LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const LocationLink = ({
  snapshot,
  locationType,
  locationId,
  className,
  showKind = false,
}: {
  snapshot: LogisticsSnapshot;
  locationType: LocationType;
  locationId: string;
  className?: string;
  showKind?: boolean;
}) => {
  const identity = locationIdentity(snapshot, locationType, locationId);
  const href = hrefForLocation(snapshot, locationType, locationId);
  const code = (
    <LogisticsCodeBadge code={identity.title} href={href} className={className} />
  );
  if (!showKind) {
    return code;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">
        {locationKindLabel(locationType, identity.isPlantWarehouse)}
      </span>
      {code}
    </span>
  );
};
