import { deterministicSort } from "../../lib/deterministic-sort";
import type { Dimensions, RotationYaw } from "./types";

export type RotationOption = {
  yaw: RotationYaw;
  size: Dimensions;
};

const toRotatedSize = (dimensions: Dimensions, yaw: RotationYaw): Dimensions => {
  if (yaw === 0) {
    return { ...dimensions };
  }

  return {
    width: dimensions.length,
    length: dimensions.width,
    height: dimensions.height,
  };
};

export const getAllowedYawRotations = (dimensions: Dimensions): RotationOption[] => {
  const options: RotationOption[] = [
    { yaw: 0, size: toRotatedSize(dimensions, 0) },
    { yaw: 90, size: toRotatedSize(dimensions, 90) },
  ];

  const unique = options.filter((option, index) => {
    const duplicateIndex = options.findIndex((candidate) => {
      return (
        candidate.size.width === option.size.width &&
        candidate.size.length === option.size.length &&
        candidate.size.height === option.size.height
      );
    });

    return duplicateIndex === index;
  });

  return deterministicSort(
    unique,
    (left, right) => left.size.width - right.size.width,
    (left, right) => left.size.length - right.size.length,
    (left, right) => left.yaw - right.yaw,
  );
};
