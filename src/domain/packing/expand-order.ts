import type { OrderItemType, OrderItemUnit } from "./types";

const toUnitSuffix = (index: number): string => String(index).padStart(2, "0");

export const expandOrder = (order: readonly OrderItemType[]): OrderItemUnit[] => {
  const units: OrderItemUnit[] = [];

  for (const item of order) {
    for (let unitIndex = 1; unitIndex <= item.quantity; unitIndex += 1) {
      units.push({
        unitId: `${item.id}-${toUnitSuffix(unitIndex)}`,
        itemTypeId: item.id,
        dimensions: {
          width: item.width,
          length: item.length,
          height: item.height,
        },
      });
    }
  }

  return units;
};
