import { hrefForLocation } from "@/features/oms/oms-availability";
import { locationKindLabel } from "@/features/oms/oms-labels";
import { locationIdentity } from "@/features/oms/oms-lookups";
import type { LocationType, OmsSnapshot } from "@/features/oms/oms-types";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";

type LocationSource =
  | { snapshot: OmsSnapshot; label?: never; href?: never; isPlantWarehouse?: never }
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
    <OmsCodeBadge code={resolved.label} href={resolved.href ?? undefined} className={className} />
  );
  if (!showKind) {
    return code;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {locationKindLabel(locationType, resolved.isPlantWarehouse)}
      </span>
      {code}
    </span>
  );
};
