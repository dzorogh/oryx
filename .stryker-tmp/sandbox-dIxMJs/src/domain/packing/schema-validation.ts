// @ts-nocheck
import { z } from "zod";
import type { OrderItemType, PackingResult } from "./types";

const orderItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  width: z.number().positive(),
  length: z.number().positive(),
  height: z.number().positive(),
  weight: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

const packingResultSchema = z.object({
  usedContainerCount: z.number().int().nonnegative(),
  containers: z.array(
    z.object({
      containerIndex: z.number().int().nonnegative(),
      placements: z.array(
        z.object({
          containerIndex: z.number().int().nonnegative(),
          itemUnitId: z.string().min(1),
          itemTypeId: z.number().int(),
          position: z.object({
            x: z.number(),
            y: z.number(),
            z: z.number(),
          }),
          rotationYaw: z.union([z.literal(0), z.literal(90)]),
          size: z.object({
            width: z.number().positive(),
            length: z.number().positive(),
            height: z.number().positive(),
          }),
        }),
      ),
    }),
  ),
  unplacedItemUnitIds: z.array(z.string().min(1)),
  validation: z.object({
    geometryValid: z.boolean(),
    supportValid: z.boolean(),
    completenessValid: z.boolean(),
    deterministic: z.boolean(),
    violations: z.array(z.string()),
  }),
  summary: z.object({
    totalUnits: z.number().int().nonnegative(),
    placedUnits: z.number().int().nonnegative(),
    unplacedUnits: z.number().int().nonnegative(),
  }),
  timing: z.object({
    packingMs: z.number().nonnegative(),
  }),
});

export const validateOrderSchema = (order: unknown): OrderItemType[] => {
  return z.array(orderItemSchema).parse(order);
};

export const validatePackingResultSchema = (input: unknown): PackingResult => {
  return packingResultSchema.parse(input) as PackingResult;
};
