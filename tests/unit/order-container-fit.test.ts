import { describe, expect, it } from "vitest";
import { CONTAINER_DIMENSIONS } from "@/domain/packing/constants";
import {
  getOversizedOrderViolations,
  itemTypeFitsInContainer,
} from "@/domain/packing/order-container-fit";

describe("order-container-fit", () => {
  it("itemTypeFitsInContainer: помещается при повороте на полу и по высоте", () => {
    expect(itemTypeFitsInContainer(100, 2000, 500, CONTAINER_DIMENSIONS)).toBe(true);
    expect(itemTypeFitsInContainer(2000, 100, 500, CONTAINER_DIMENSIONS)).toBe(true);
  });

  it("itemTypeFitsInContainer: не помещается, если высота больше контейнера", () => {
    expect(itemTypeFitsInContainer(100, 100, 999_999, CONTAINER_DIMENSIONS)).toBe(false);
  });

  it("itemTypeFitsInContainer: не помещается, если основание на полу больше контейнера", () => {
    expect(itemTypeFitsInContainer(50_000, 50, 100, CONTAINER_DIMENSIONS)).toBe(false);
  });

  it("getOversizedOrderViolations: пропускает позиции с количеством 0", () => {
    expect(
      getOversizedOrderViolations(
        [
          {
            id: 1,
            name: "Huge",
            width: 500_000,
            length: 1,
            height: 1,
            weight: 1,
            quantity: 0,
          },
        ],
        CONTAINER_DIMENSIONS,
      ),
    ).toEqual([]);
  });

  it("getOversizedOrderViolations: возвращает сообщение для нарушения", () => {
    const v = getOversizedOrderViolations(
      [
        {
          id: 1,
          name: "Huge",
          width: 500_000,
          length: 1,
          height: 1,
          weight: 1,
          quantity: 1,
        },
      ],
      CONTAINER_DIMENSIONS,
    );
    expect(v).toHaveLength(1);
    expect(v[0]).toContain("Габариты товара превышают контейнер");
    expect(v[0]).toContain("Huge");
  });
});
