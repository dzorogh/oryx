"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ContainerInstance } from "@/domain/packing/types";
import { ItemMesh } from "./item-mesh";

type ContainerSceneProps = {
  container: ContainerInstance;
  containerSize: {
    width: number;
    length: number;
    height: number;
  };
};

export const ContainerScene = ({ container, containerSize }: ContainerSceneProps) => {
  const sceneScale = 0.001;
  const center = {
    x: (containerSize.width * sceneScale) / 2,
    y: (containerSize.height * sceneScale) / 2,
    z: (containerSize.length * sceneScale) / 2,
  };

  return (
    <div
      className="h-[680px] w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-900"
      aria-label={`3D сцена контейнера ${container.containerIndex + 1}`}
    >
      <Canvas
        camera={{
          position: [12, 7, 10],
          fov: 45,
          near: 0.01,
          far: 1000,
        }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[12, 14, 10]} intensity={0.85} />

        <group scale={[sceneScale, sceneScale, sceneScale]}>
          <mesh
            position={[
              containerSize.width / 2,
              containerSize.height / 2,
              containerSize.length / 2
            ]}
          >
            <boxGeometry args={[containerSize.width, containerSize.height, containerSize.length]} />
            <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.28} />
          </mesh>

          {container.placements.map((placement) => (
            <ItemMesh key={placement.itemUnitId} placement={placement} />
          ))}

          {/* Ground plane for orientation (y=0) */}
          <mesh
            position={[
              containerSize.width / 2,
              0,
              containerSize.length / 2,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[containerSize.width, containerSize.length]} />
            <meshBasicMaterial color="#334155" wireframe transparent opacity={0.18} />
          </mesh>
        </group>

        <OrbitControls makeDefault target={[center.x, center.y, center.z]} enablePan={false} />
      </Canvas>
    </div>
  );
};
