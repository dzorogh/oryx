// @ts-nocheck
import type { ContainerType, OrderItemType } from "./types";

export type OrderPreset = {
  orderId: number;
  label: string;
  order: OrderItemType[];
};

// Single editable source of truth for container dimensions.
export const CONTAINER_DIMENSIONS: ContainerType = {
  width: 12032,
  length: 2352,
  height: 2698,
};

// Multiple order presets for switching in UI and API.
export const ORDER_PRESETS: OrderPreset[] = [
  {
    orderId: 59,
    label: "Заказ №59",
    order: [
      {
        id: 50,
        name: "Scooter Tank 150",
        width: 565,
        length: 1780,
        height: 855,
        weight: 1,
        quantity: 39,
      },
      {
        id: 36,
        name: "FX 200",
        width: 570,
        length: 1880,
        height: 870,
        weight: 1,
        quantity: 36,
      },
    ],
  },
  {
    orderId: 69,
    label: "Заказ №69",
    order: [
      {
        id: 3,
        name: "Cross 180 RX",
        width: 770,
        length: 1360,
        height: 650,
        weight: 1,
        quantity: 1,
      },
      {
        id: 9,
        name: "Cross E-200",
        width: 700,
        length: 1150,
        height: 610,
        weight: 1,
        quantity: 200,
      },
    ],
  },
  {
    orderId: 77,
    label: "Заказ №77",
    order: [
      {
        id: 1,
        name: "Force 1100 EFI",
        width: 1300,
        length: 2300,
        height: 1260,
        weight: 545,
        quantity: 3,
      },
      {
        id: 8,
        name: "Force 720",
        width: 1192,
        length: 2300,
        height: 887,
        weight: 443,
        quantity: 4,
      },
      {
        id: 6288,
        name: "Force 420 Cyber EFI",
        width: 1145,
        length: 1960,
        height: 860,
        weight: 1,
        quantity: 20,
      },
    ],
  },
  {
    orderId: 91,
    label: "Заказ №91",
    order: [
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
        id: 41,
        name: "RST 240 Ultra",
        width: 570,
        length: 1900,
        height: 870,
        weight: 167,
        quantity: 9,
      },
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
        id: 31006,
        name: "Ace 1000",
        width: 1130,
        length: 3150,
        height: 1260,
        weight: 417,
        quantity: 1,
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
        id: 8,
        name: "Force 720",
        width: 1192,
        length: 2300,
        height: 887,
        weight: 443,
        quantity: 9,
      },
    ],
  },
  {
    orderId: 1000,
    label: "Заказ №1000",
    order: [
      {
        id: 10001,
        name: "Box 500x500",
        width: 500,
        length: 500,
        height: 500,
        weight: 1,
        quantity: 1000,
      },
    ],
  },
];

export const DEFAULT_ORDER_ID = ORDER_PRESETS[0].orderId;

export const getOrderPresetById = (orderId: number): OrderPreset => {
  return ORDER_PRESETS.find((preset) => preset.orderId === orderId) ?? ORDER_PRESETS[0];
};
