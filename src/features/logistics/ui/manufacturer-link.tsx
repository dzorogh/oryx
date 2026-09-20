import { hrefForManufacturer } from "@/features/logistics/logistics-availability";
import { manufacturerCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const ManufacturerLink = ({
  snapshot,
  manufacturerId,
  className,
}: {
  snapshot: LogisticsSnapshot;
  manufacturerId: string;
  className?: string;
}) => (
  <LogisticsCodeBadge
    code={manufacturerCode(snapshot, manufacturerId)}
    href={hrefForManufacturer(manufacturerId)}
    className={className}
  />
);
