"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useMemo, useRef, useState, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ContainerInstance, OrderItemType } from "@/domain/packing/types";
import { ItemMesh } from "./item-mesh";
import { SceneOrbitToolbar } from "./scene-orbit-toolbar";

type OrbitControlsSyncProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  sceneSyncKey: string;
};

const OrbitControlsSync = ({ controlsRef, sceneSyncKey }: OrbitControlsSyncProps) => {
  const lastSyncedKey = useRef<string | null>(null);
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    if (lastSyncedKey.current === sceneSyncKey) {
      return;
    }
    lastSyncedKey.current = sceneSyncKey;
    controls.saveState();
  });
  return null;
};

type ContainerSize = {
  width: number;
  length: number;
  height: number;
};

type MultiContainerSceneProps = {
  containers: ContainerInstance[];
  containerSize: ContainerSize;
  orderItems: OrderItemType[];
  /**
   * Gap between containers in millimeters (domain units).
   */
  spacingMm?: number;
};

export const MultiContainerScene = ({
  containers,
  containerSize,
  orderItems,
  spacingMm,
}: MultiContainerSceneProps) => {
  type TooltipPayload = {
    itemUnitId: string;
    itemTypeName: string;
    width: number;
    length: number;
    height: number;
  };

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);

  // Place containers side-by-side along the container "length" axis (z).
  // The gap is edge-to-edge between adjacent containers.
  const { safeSpacingMm, center, cameraPosition, sceneSyncKey, sceneScale } = useMemo(() => {
    const scale = 0.001;
    const safe = spacingMm ?? containerSize.length / 2;
    const totalLengthMm =
      containers.length * containerSize.length + Math.max(0, containers.length - 1) * safe;
    const widthScene = containerSize.width * scale;
    const heightScene = containerSize.height * scale;
    const lengthScene = totalLengthMm * scale;
    const c = {
      x: widthScene / 2,
      y: heightScene / 2,
      z: lengthScene / 2,
    };
    const cam: [number, number, number] = [
      Math.max(12, widthScene),
      Math.max(7, heightScene * 1),
      Math.max(10, lengthScene * 3),
    ];
    const syncKey = `${cam[0]},${cam[1]},${cam[2]}|${c.x},${c.y},${c.z}|${containers.length}`;
    return {
      safeSpacingMm: safe,
      center: c,
      cameraPosition: cam,
      sceneSyncKey: syncKey,
      sceneScale: scale,
    };
  }, [containers, containerSize, spacingMm]);

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
      className="relative h-[min(680px,70vh)] w-full overflow-hidden rounded-xl border"
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
        className="h-full w-full"
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
            const containerVolume = containerSize.width * containerSize.height * containerSize.length;
            const filledVolume = container.placements.reduce((sum, p) => sum + (p.size.width * p.size.height * p.size.length), 0);
            const percentFilled = (filledVolume / containerVolume) * 100;
            const dimStr = `${Math.round(containerSize.width)} × ${Math.round(containerSize.length)} × ${Math.round(containerSize.height)} мм`;
            const textContent = `Контейнер ${container.containerIndex + 1}\nРазмеры: ${dimStr}\nЗаполненность: ${percentFilled.toFixed(1)}%`;

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
                    orderItems={orderItems}
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

                {/* Container info text on the floor, on the right (narrow) side */}
                <Text
                  position={[
                    containerSize.width + 400, // right side, outside the container
                    2, // slightly above the floor
                    containerSize.length / 2 // centered along the narrow edge
                  ]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={200}
                  color="#94a3b8"
                  anchorX="left"
                  anchorY="middle"
                  textAlign="left"
                  lineHeight={1.2}
                >
                  {textContent}
                </Text>
              </group>
            );
          })}
        </group>

        <OrbitControls
          ref={orbitControlsRef}
          makeDefault
          target={[center.x, center.y, center.z]}
          enablePan={false}
        />
        <OrbitControlsSync controlsRef={orbitControlsRef} sceneSyncKey={sceneSyncKey} />
      </Canvas>
      <SceneOrbitToolbar controlsRef={orbitControlsRef} />
    </div>
  );
};

