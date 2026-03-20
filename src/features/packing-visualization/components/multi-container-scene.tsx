"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import type { ContainerInstance } from "@/domain/packing/types";
import { ItemMesh } from "./item-mesh";

type ContainerSize = {
  width: number;
  length: number;
  height: number;
};

type MultiContainerSceneProps = {
  containers: ContainerInstance[];
  containerSize: ContainerSize;
  /**
   * Gap between containers in millimeters (domain units).
   */
  spacingMm?: number;
};

export const MultiContainerScene = ({
  containers,
  containerSize,
  spacingMm,
}: MultiContainerSceneProps) => {
  type TooltipPayload = {
    itemUnitId: string;
    itemTypeName: string;
    width: number;
    length: number;
    height: number;
  };

  const sceneScale = 0.001;
  // Place containers side-by-side along the container "length" axis (z).
  // The gap is edge-to-edge between adjacent containers.
  const safeSpacingMm = spacingMm ?? containerSize.length / 2;

  const totalLengthMm =
    containers.length * containerSize.length + Math.max(0, containers.length - 1) * safeSpacingMm;

  const widthScene = containerSize.width * sceneScale;
  const heightScene = containerSize.height * sceneScale;
  const lengthScene = totalLengthMm * sceneScale;

  const center = {
    x: widthScene / 2,
    y: heightScene / 2,
    z: lengthScene / 2,
  };

  const cameraPosition: [number, number, number] = [
    Math.max(12, widthScene),
    Math.max(7, heightScene * 2.6),
    Math.max(10, lengthScene * 3.7),
  ];

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    payload: TooltipPayload;
    x: number;
    y: number;
  } | null>(null);

  const handleTooltip = (payload: TooltipPayload | null, clientPos: { x: number; y: number }) => {
    const root = wrapperRef.current;
    if (!root) return;

    if (!payload) {
      setTooltip(null);
      return;
    }

    const rect = root.getBoundingClientRect();
    const x = clientPos.x - rect.left;
    const y = clientPos.y - rect.top;

    setTooltip({ payload, x, y });
  };

  return (
    <div
      ref={wrapperRef}
      className="relative h-[680px] w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-900"
      aria-label="3D сцена всех контейнеров"
      onPointerLeave={() => setTooltip(null)}
    >
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-50 rounded-md border border-slate-400 bg-slate-950/90 px-2 py-1 text-xs text-slate-100 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
          role="tooltip"
          aria-label="Подсказка о товаре"
        >
          <div className="font-medium">{tooltip.payload.itemTypeName}</div>
          <div className="text-slate-300">
            <div>Ширина (width): {Math.round(tooltip.payload.width)} мм</div>
            <div>Высота (height): {Math.round(tooltip.payload.height)} мм</div>
            <div>Длина (length): {Math.round(tooltip.payload.length)} мм</div>
          </div>
        </div>
      ) : null}

      <Canvas
        camera={{
          position: cameraPosition,
          fov: 45,
          near: 0.01,
          far: 1000,
        }}
        onPointerMissed={() => setTooltip(null)}
        onPointerLeave={() => setTooltip(null)}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={cameraPosition} intensity={0.85} />

        <group scale={[sceneScale, sceneScale, sceneScale]}>
          {containers.map((container, index) => {
            const offsetZ = index * (containerSize.length + safeSpacingMm);

            return (
              <group
                key={container.containerIndex}
                position={[0, 0, offsetZ]}
                aria-label={`Контейнер ${container.containerIndex + 1}`}
              >
                {/* Container wireframe */}
                <mesh
                  position={[
                    containerSize.width / 2,
                    containerSize.height / 2,
                    containerSize.length / 2,
                  ]}
                  raycast={() => null}
                >
                  <boxGeometry
                    args={[containerSize.width, containerSize.height, containerSize.length]}
                  />
                  <meshBasicMaterial
                    color="#94a3b8"
                    wireframe
                    transparent
                    opacity={0.28}
                  />
                </mesh>

                {container.placements.map((placement) => (
                  <ItemMesh
                    key={placement.itemUnitId}
                    placement={placement}
                    onTooltip={handleTooltip}
                  />
                ))}

                {/* Ground plane for orientation */}
                <mesh
                  position={[
                    containerSize.width / 2,
                    0,
                    containerSize.length / 2,
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  raycast={() => null}
                >
                  <planeGeometry args={[containerSize.width, containerSize.length]} />
                  <meshBasicMaterial
                    color="#334155"
                    wireframe
                    transparent
                    opacity={0.18}
                  />
                </mesh>
              </group>
            );
          })}
        </group>

        <OrbitControls makeDefault target={[center.x, center.y, center.z]} enablePan={false} />
      </Canvas>
    </div>
  );
};

