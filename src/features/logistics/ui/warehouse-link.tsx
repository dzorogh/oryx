import { hrefForWarehouse } from "@/features/logistics/logistics-availability";
import { warehouseCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const WarehouseLink = ({
  snapshot,
  warehouseId,
  className,
}: {
  snapshot: LogisticsSnapshot;
  warehouseId: string;
  className?: string;
}) => (
  <LogisticsCodeBadge
    code={warehouseCode(snapshot, warehouseId)}
    href={hrefForWarehouse(warehouseId)}
    className={className}
  />
);
