import { hrefForWarehouse } from "@/features/logistics/logistics-availability";
import { formatEntityCode } from "@/lib/entity-codes";
import { warehouseCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const WarehouseLink = ({
  snapshot,
  warehouseId,
  code,
  className,
}: {
  snapshot?: LogisticsSnapshot;
  warehouseId: string;
  /** Presentational: ready code when snapshot is unavailable. */
  code?: string;
  className?: string;
}) => (
  <LogisticsCodeBadge
    code={
      code ??
      (snapshot ? warehouseCode(snapshot, warehouseId) : formatEntityCode("warehouse", warehouseId))
    }
    href={hrefForWarehouse(warehouseId)}
    className={className}
  />
);
