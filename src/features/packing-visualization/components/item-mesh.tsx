"use client";

import { useMemo } from "react";
import type { Placement } from "@/domain/packing/types";

type ItemMeshProps = {
  placement: Placement;
};

const buildColorByTypeId = (itemTypeId: number) => {
  // Deterministic color mapping by SKU/type.
  // Using golden angle provides better separation between nearby typeIds.
  const hue = (itemTypeId * 137.508) % 360;
  const lightness = 56;

  return `hsl(${hue} 78% ${lightness}%)`;
};

export const ItemMesh = ({ placement }: ItemMeshProps) => {
  const color = useMemo(() => buildColorByTypeId(placement.itemTypeId), [placement.itemTypeId]);

  const x = placement.position.x + placement.size.width / 2;
  const y = placement.position.z + placement.size.height / 2;
  const z = placement.position.y + placement.size.length / 2;

  return (
    <mesh position={[x, y, z]} castShadow receiveShadow>
      <boxGeometry args={[placement.size.width, placement.size.height, placement.size.length]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} />
    </mesh>
  );
};
