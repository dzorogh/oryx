import { hrefForWarehouse } from "@/features/oms/oms-availability";
import { formatEntityCode } from "@/lib/entity-codes";
import { warehouseCode } from "@/features/oms/oms-lookups";
import type { OmsSnapshot } from "@/features/oms/oms-types";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";

export const WarehouseLink = ({
  snapshot,
  warehouseId,
  code,
  className,
}: {
  snapshot?: OmsSnapshot;
  warehouseId: string;
  /** Presentational: ready code when snapshot is unavailable. */
  code?: string;
  className?: string;
}) => (
  <OmsCodeBadge
    code={
      code ??
      (snapshot ? warehouseCode(snapshot, warehouseId) : formatEntityCode("warehouse", warehouseId))
    }
    href={hrefForWarehouse(warehouseId)}
    className={className}
  />
);
