import { describe, expect, it } from "vitest";
import { buildPostCheck, NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT } from "@/domain/report/summarize-result";
import type { ContainerInstance, ContainerType } from "@/domain/packing/types";

const testContainerType: ContainerType = {
  width: 10,
  length: 10,
  height: 10,
};

const makeContainer = (containerIndex: number, occupiedVolume: number): ContainerInstance => ({
  containerIndex,
  placements: occupiedVolume === 0
    ? []
    : [
        {
          containerIndex,
          itemUnitId: `unit-${containerIndex}`,
          itemTypeId: containerIndex,
          position: { x: 0, y: 0, z: 0 },
          rotationYaw: 0,
          size: {
            width: occupiedVolume / 100,
            length: 10,
            height: 10,
          },
        },
      ],
});

describe("buildPostCheck", () => {
  it("если непоследних контейнеров нет — проверка успешна", () => {
    const postCheck = buildPostCheck([makeContainer(0, 500)], testContainerType);
    expect(postCheck.nonLastContainerEmptyVolume.pass).toBe(true);
    expect(postCheck.nonLastContainerEmptyVolume.checkedContainerCount).toBe(0);
    expect(postCheck.nonLastContainerEmptyVolume.maxEmptyVolumePercent).toBe(0);
    expect(postCheck.nonLastContainerEmptyVolume.thresholdPercent).toBe(
      NON_LAST_CONTAINER_EMPTY_VOLUME_THRESHOLD_PERCENT,
    );
  });

  it("порог равен 30%: на границе pass, выше порога fail", () => {
    const atThreshold = buildPostCheck(
      [makeContainer(0, 700), makeContainer(1, 200)],
      testContainerType,
    );
    expect(atThreshold.nonLastContainerEmptyVolume.maxEmptyVolumePercent).toBeCloseTo(30, 6);
    expect(atThreshold.nonLastContainerEmptyVolume.pass).toBe(true);

    const overThreshold = buildPostCheck(
      [makeContainer(0, 690), makeContainer(1, 200)],
      testContainerType,
    );
    expect(overThreshold.nonLastContainerEmptyVolume.maxEmptyVolumePercent).toBeCloseTo(31, 6);
    expect(overThreshold.nonLastContainerEmptyVolume.pass).toBe(false);
    expect(overThreshold.nonLastContainerEmptyVolume.failingContainerIndex).toBe(0);
  });
});
