// english-ui:ignore-file
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useMemo, useRef, useState, type RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ContainerInstance, OrderItemType } from "@/domain/packing/types";
import { cn } from "@/lib/utils";
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

export type MultiContainerSceneContainer = ContainerInstance & {
  /** Per-container size; falls back to `containerSize`. */
  size?: ContainerSize;
  /** Type code shown on the floor label (e.g. 40HC). */
  typeCode?: string;
  /** Precomputed fill percent; otherwise derived from placements. */
  fillPercent?: number;
};

type MultiContainerSceneProps = {
  containers: MultiContainerSceneContainer[];
  /** Default / legacy single size for all containers. */
  containerSize: ContainerSize;
  orderItems: OrderItemType[];
  /**
   * Gap between containers in millimeters (domain units).
   */
  spacingMm?: number;
  className?: string;
};

export const MultiContainerScene = ({
  containers,
  containerSize,
  orderItems,
  spacingMm,
  className,
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

  const resolved = useMemo(
    () =>
      containers.map((container) => ({
        ...container,
        size: container.size ?? containerSize,
      })),
    [containers, containerSize],
  );

  // Place containers side-by-side along the container "length" axis (z).
  const { safeSpacingMm, center, cameraPosition, sceneSyncKey, sceneScale, offsets } = useMemo(() => {
    const scale = 0.001;
    const maxLength = Math.max(...resolved.map((c) => c.size.length), containerSize.length);
    const safe = spacingMm ?? maxLength / 2;
    let cursor = 0;
    const offs: number[] = [];
    for (const container of resolved) {
      offs.push(cursor);
      cursor += container.size.length + safe;
    }
    const totalLengthMm = Math.max(cursor - safe, maxLength);
    const maxWidth = Math.max(...resolved.map((c) => c.size.width), containerSize.width);
    const maxHeight = Math.max(...resolved.map((c) => c.size.height), containerSize.height);
    const widthScene = maxWidth * scale;
    const heightScene = maxHeight * scale;
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
    const syncKey = `${cam[0]},${cam[1]},${cam[2]}|${c.x},${c.y},${c.z}|${resolved.length}`;
    return {
      safeSpacingMm: safe,
      center: c,
      cameraPosition: cam,
      sceneSyncKey: syncKey,
      sceneScale: scale,
      offsets: offs,
    };
  }, [resolved, containerSize, spacingMm]);

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
      className={cn("relative h-[min(680px,70vh)] w-full overflow-hidden rounded-xl border", className)}
      aria-label="3D-сцена всех контейнеров"
      onPointerLeave={() => setTooltip(null)}
    >
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-50 rounded-md border border-slate-400 bg-slate-950/90 px-2 py-1 text-xs text-slate-100 shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
          role="tooltip"
          aria-label="Подсказка по товару"
        >
          <div className="font-medium">{tooltip.payload.itemTypeName}</div>
          <div className="text-slate-300">
            <div>Ширина: {Math.round(tooltip.payload.width)} мм</div>
            <div>Высота: {Math.round(tooltip.payload.height)} мм</div>
            <div>Длина: {Math.round(tooltip.payload.length)} мм</div>
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
          {resolved.map((container, index) => {
            const size = container.size;
            const offsetZ = offsets[index] ?? index * (size.length + safeSpacingMm);
            const containerVolume = size.width * size.height * size.length;
            const filledVolume = container.placements.reduce(
              (sum, p) => sum + p.size.width * p.size.height * p.size.length,
              0,
            );
            const percentFilled =
              container.fillPercent ?? (containerVolume > 0 ? (filledVolume / containerVolume) * 100 : 0);
            const typeLabel = container.typeCode ?? `Контейнер ${container.containerIndex + 1}`;
            const dimStr = `${Math.round(size.width)} × ${Math.round(size.length)} × ${Math.round(size.height)} мм`;
            const textContent = `${typeLabel}\n${dimStr}\nЗаполнение: ${percentFilled.toFixed(1)}%`;

            return (
              <group
                key={container.containerIndex}
                position={[0, 0, offsetZ]}
                name={typeLabel}
              >
                <mesh
                  position={[size.width / 2, size.height / 2, size.length / 2]}
                  raycast={() => null}
                >
                  <boxGeometry args={[size.width, size.height, size.length]} />
                  <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.28} />
                </mesh>

                {container.placements.map((placement) => (
                  <ItemMesh
                    key={placement.itemUnitId}
                    placement={placement}
                    orderItems={orderItems}
                    onTooltip={handleTooltip}
                  />
                ))}

                <mesh
                  position={[size.width / 2, 0, size.length / 2]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  raycast={() => null}
                >
                  <planeGeometry args={[size.width, size.length]} />
                  <meshBasicMaterial color="#334155" wireframe transparent opacity={0.18} />
                </mesh>

                <Text
                  position={[size.width + 400, 2, size.length / 2]}
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
