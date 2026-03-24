export type Dimensions = {
  width: number;
  length: number;
  height: number;
};

export type Position3D = {
  x: number;
  y: number;
  z: number;
};

export type RotationYaw = 0 | 90;

export type OrderItemType = {
  id: number;
  name: string;
  width: number;
  length: number;
  height: number;
  weight: number;
  quantity: number;
};

export type OrderItemUnit = {
  unitId: string;
  itemTypeId: number;
  dimensions: Dimensions;
};

export type ContainerType = Dimensions;

export type Placement = {
  containerIndex: number;
  itemUnitId: string;
  itemTypeId: number;
  position: Position3D;
  rotationYaw: RotationYaw;
  size: Dimensions;
};

export type ContainerInstance = {
  containerIndex: number;
  placements: Placement[];
};

export type PackingValidation = {
  geometryValid: boolean;
  supportValid: boolean;
  completenessValid: boolean;
  deterministic: boolean;
  violations: string[];
};

export type PackingSummary = {
  totalUnits: number;
  placedUnits: number;
  unplacedUnits: number;
};

export type PackingTiming = {
  packingMs: number;
};

export type NonLastContainerEmptyVolumePostCheck = {
  thresholdPercent: number;
  checkedContainerCount: number;
  maxEmptyVolumePercent: number;
  failingContainerIndex: number | null;
  pass: boolean;
};

export type PackingPostCheck = {
  nonLastContainerEmptyVolume: NonLastContainerEmptyVolumePostCheck;
};

export type PackingResult = {
  usedContainerCount: number;
  containers: ContainerInstance[];
  unplacedItemUnitIds: string[];
  validation: PackingValidation;
  postCheck: PackingPostCheck;
  summary: PackingSummary;
  timing: PackingTiming;
};
