"use client";

import type { RefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Button } from "@/components/ui/button";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

type SceneOrbitToolbarProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>;
};

export const SceneOrbitToolbar = ({ controlsRef }: SceneOrbitToolbarProps) => {
  const handleZoomIn = () => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    controls.dollyIn();
  };

  const handleZoomOut = () => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    controls.dollyOut();
  };

  const handleReset = () => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    controls.reset();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-2">
      <div className="pointer-events-auto flex flex-col gap-1 rounded-md border border-border bg-background/90 p-1 shadow-md backdrop-blur-sm">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-9"
          aria-label="Приблизить"
          onClick={handleZoomIn}
        >
          <ZoomIn className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-9"
          aria-label="Отдалить"
          onClick={handleZoomOut}
        >
          <ZoomOut className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-9"
          aria-label="Сбросить вид и масштаб"
          onClick={handleReset}
        >
          <RotateCcw className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
};
