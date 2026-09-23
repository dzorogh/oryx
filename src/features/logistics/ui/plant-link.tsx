import { hrefForPlant } from "@/features/logistics/logistics-availability";
import { plantCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const PlantLink = ({
  snapshot,
  plantId,
  className,
}: {
  snapshot: LogisticsSnapshot;
  plantId: string;
  className?: string;
}) => (
  <LogisticsCodeBadge
    code={plantCode(snapshot, plantId)}
    href={hrefForPlant(plantId)}
    className={className}
  />
);
