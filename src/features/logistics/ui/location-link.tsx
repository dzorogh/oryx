import { hrefForLocation } from "@/features/logistics/logistics-availability";
import { locationKindLabel } from "@/features/logistics/logistics-labels";
import { locationIdentity } from "@/features/logistics/logistics-lookups";
import type { LocationType, LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

type LocationSource =
  | { snapshot: LogisticsSnapshot; label?: never; href?: never; isPlantWarehouse?: never }
  | { snapshot?: never; label: string; href: string | null; isPlantWarehouse?: boolean };

const resolveLocation = (source: LocationSource, locationType: LocationType, locationId: string) => {
  if (!source.snapshot) {
    return { label: source.label, href: source.href, isPlantWarehouse: source.isPlantWarehouse ?? false };
  }
  const identity = locationIdentity(source.snapshot, locationType, locationId);
  return {
    label: identity.title,
    href: hrefForLocation(source.snapshot, locationType, locationId),
    isPlantWarehouse: identity.isPlantWarehouse,
  };
};

export const LocationLink = ({
  locationType,
  locationId,
  className,
  showKind = false,
  ...source
}: LocationSource & {
  locationType: LocationType;
  locationId: string;
  className?: string;
  showKind?: boolean;
}) => {
  const resolved = resolveLocation(source, locationType, locationId);
  const code = (
    <LogisticsCodeBadge code={resolved.label} href={resolved.href ?? undefined} className={className} />
  );
  if (!showKind) {
    return code;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">
        {locationKindLabel(locationType, resolved.isPlantWarehouse)}
      </span>
      {code}
    </span>
  );
};
