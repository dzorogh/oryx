import type { ContainerType, OrderItemType } from "./types";

/**
 * Проверка, помещается ли габарит товара в контейнер при допустимых в движке ориентациях:
 * высота — вдоль вертикали контейнера; на полу — поворот на 90° (меняются width и length).
 */
export const itemTypeFitsInContainer = (
  width: number,
  length: number,
  height: number,
  container: ContainerType,
): boolean => {
  if (height > container.height) {
    return false;
  }

  const floorMin = Math.min(width, length);
  const floorMax = Math.max(width, length);
  const contFloorMin = Math.min(container.width, container.length);
  const contFloorMax = Math.max(container.width, container.length);

  return floorMin <= contFloorMin && floorMax <= contFloorMax;
};

export const getOversizedOrderViolations = (
  order: readonly OrderItemType[],
  container: ContainerType,
): string[] => {
  const violations: string[] = [];

  for (const item of order) {
    if (item.quantity === 0) {
      continue;
    }

    if (!itemTypeFitsInContainer(item.width, item.length, item.height, container)) {
      violations.push(
        `Габариты товара превышают контейнер: ${item.name} (ID ${item.id}) — ${item.width}×${item.length}×${item.height} мм, контейнер ${container.width}×${container.length}×${container.height} мм`,
      );
    }
  }

  return violations;
};
