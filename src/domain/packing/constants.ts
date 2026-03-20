import type { ContainerType, OrderItemType } from "./types";

// Single editable source of truth for packing inputs.
export const PACKING_SETTINGS: {
  container: ContainerType;
  order: OrderItemType[];
} = {
  container: {
    width: 12032,
    length: 2352,
    height: 2698,
  },
  order: [
  {
    id: 1,
    name: "Force 1100 EFI",
    width: 1300,
    length: 2300,
    height: 1260,
    weight: 545,
    quantity: 2,
  },
  {
    id: 8,
    name: "Force 720",
    width: 1192,
    length: 2300,
    height: 887,
    weight: 443,
    quantity: 9,
  },
  {
    id: 41,
    name: "RST 240 Ultra",
    width: 570,
    length: 1900,
    height: 870,
    weight: 167,
    quantity: 9,
  },
  {
    id: 6336,
    name: "RST 501 Ultra",
    width: 740,
    length: 2170,
    height: 1200,
    weight: 207,
    quantity: 2,
  },
  {
    id: 6352,
    name: "GP 601 Ultra",
    width: 770,
    length: 2170,
    height: 1250,
    weight: 240,
    quantity: 2,
  },
  {
    id: 6360,
    name: "RR 240 Ultra",
    width: 620,
    length: 2120,
    height: 870,
    weight: 180,
    quantity: 9,
  },
  {
    id: 31006,
    name: "Ace 1000",
    width: 1130,
    length: 3150,
    height: 1260,
    weight: 417,
    quantity: 1,
  },
  ],
};

export const CONTAINER_DIMENSIONS: ContainerType = PACKING_SETTINGS.container;
export const FIXED_ORDER: OrderItemType[] = PACKING_SETTINGS.order;
