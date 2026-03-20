"use client";

import { useMemo, useState } from "react";
import type { OrderItemType, Placement } from "@/domain/packing/types";
import { BoxGeometry, Color, EdgesGeometry, LineBasicMaterial } from "three";
import { useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

type ItemMeshProps = {
  placement: Placement;
  orderItems: OrderItemType[];
  onTooltip?: (
    payload:
      | {
          itemUnitId: string;
          itemTypeName: string;
          width: number;
          length: number;
          height: number;
        }
      | null,
    clientPos: { x: number; y: number },
  ) => void;
};

const buildColorByTypeId = (itemTypeId: number) => {
  // Deterministic color mapping by SKU/type.
  // Using golden angle provides better separation between nearby typeIds.
  const hue = (itemTypeId * 137.508) % 360;
  const saturation = 0.78;
  const lightness = 0.56;

  const color = new Color();
  color.setHSL(hue / 360, saturation, lightness);
  return color;
};

export const ItemMesh = ({ placement, orderItems, onTooltip }: ItemMeshProps) => {
  const color = useMemo(() => buildColorByTypeId(placement.itemTypeId), [placement.itemTypeId]);
  const [isHovered, setIsHovered] = useState(false);
  useCursor(isHovered, "pointer");

  const x = placement.position.x + placement.size.width / 2;
  const y = placement.position.z + placement.size.height / 2;
  const z = placement.position.y + placement.size.length / 2;

  const width = placement.size.width;
  const height = placement.size.height;
  const length = placement.size.length;

  const boxGeometry = useMemo(() => new BoxGeometry(width, height, length), [width, height, length]);
  const edgesGeometry = useMemo(() => new EdgesGeometry(boxGeometry), [boxGeometry]);

  const rotation = useMemo<[number, number, number]>(() => [0, 0, 0], []);

  const edgeMaterial = useMemo(() => {
    const edgeColor = isHovered ? color.clone().multiplyScalar(0.9) : color.clone().multiplyScalar(0.25);
    return new LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: isHovered ? 1 : 0.85,
    });
  }, [color, isHovered]);

  const itemTypeName = useMemo(() => {
    return orderItems.find((x) => x.id === placement.itemTypeId)?.name ?? `Type#${placement.itemTypeId}`;
  }, [orderItems, placement.itemTypeId]);

  const payload = useMemo(
    () => ({
      itemUnitId: placement.itemUnitId,
      itemTypeName,
      width,
      length,
      height,
    }),
    [height, itemTypeName, length, placement.itemUnitId, width],
  );

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    const topObject = e.intersections[0]?.object;
    const isTop = topObject === e.object;
    setIsHovered(isTop);

    if (isTop) {
      onTooltip?.(payload, { x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const topObject = e.intersections[0]?.object;
    const isTop = topObject === e.object;
    if (isTop !== isHovered) setIsHovered(isTop);

    if (isTop) {
      onTooltip?.(payload, { x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    setIsHovered(false);
    onTooltip?.(null, { x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <mesh
        position={[x, y, z]}
        rotation={rotation}
        castShadow
        receiveShadow
        geometry={boxGeometry}
        userData={{ itemMesh: true, itemUnitId: placement.itemUnitId }}
        onPointerOver={handlePointerOver}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.45 : 0.18}
        />
      </mesh>

      {/* Edges improve depth perception and prevent "merging" of adjacent boxes. */}
      <lineSegments
        position={[x, y, z]}
        rotation={rotation}
        geometry={edgesGeometry}
        material={edgeMaterial}
        raycast={() => null}
      />
    </>
  );
};
