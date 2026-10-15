import { hrefForPlant } from "@/features/oms/oms-availability";
import { formatEntityCode } from "@/lib/entity-codes";
import { plantCode } from "@/features/oms/oms-lookups";
import type { OmsSnapshot } from "@/features/oms/oms-types";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";

export const PlantLink = ({
  snapshot,
  plantId,
  code,
  className,
}: {
  snapshot?: OmsSnapshot;
  plantId: string;
  /** Presentational: ready code when snapshot is unavailable. */
  code?: string;
  className?: string;
}) => (
  <OmsCodeBadge
    code={code ?? (snapshot ? plantCode(snapshot, plantId) : formatEntityCode("plant", plantId))}
    href={hrefForPlant(plantId)}
    className={className}
  />
);
