import type { OrderItemType, OrderItemUnit } from "./types";

const createUnitId = (itemTypeId: number, sequence: number): string => {
  return `${itemTypeId}-${String(sequence).padStart(2, "0")}`;
};

export const expandOrder = (order: readonly OrderItemType[]): OrderItemUnit[] => {
  const units: OrderItemUnit[] = [];

  for (const itemType of order) {
    for (let sequence = 1; sequence <= itemType.quantity; sequence += 1) {
      units.push({
        unitId: createUnitId(itemType.id, sequence),
        itemTypeId: itemType.id,
        dimensions: {
          width: itemType.width,
          length: itemType.length,
          height: itemType.height,
        },
      });
    }
  }

  return units;
};
