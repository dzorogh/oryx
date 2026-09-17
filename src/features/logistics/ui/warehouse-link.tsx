import { hrefForWarehouse } from "@/features/logistics/logistics-availability";
import { warehouseById, warehouseCode } from "@/features/logistics/logistics-lookups";
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
}) => {
  const warehouse = warehouseById(snapshot, warehouseId);
  return (
    <LogisticsCodeBadge
      code={warehouseCode(snapshot, warehouseId)}
      href={hrefForWarehouse(warehouseId)}
      title={warehouse?.name}
      className={className}
    />
  );
};
