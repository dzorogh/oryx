import { hrefForPlant } from "@/features/logistics/logistics-availability";
import { formatEntityCode } from "@/lib/entity-codes";
import { plantCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const PlantLink = ({
  snapshot,
  plantId,
  code,
  className,
}: {
  snapshot?: LogisticsSnapshot;
  plantId: string;
  /** Presentational: ready code when snapshot is unavailable. */
  code?: string;
  className?: string;
}) => (
  <LogisticsCodeBadge
    code={code ?? (snapshot ? plantCode(snapshot, plantId) : formatEntityCode("plant", plantId))}
    href={hrefForPlant(plantId)}
    className={className}
  />
);
