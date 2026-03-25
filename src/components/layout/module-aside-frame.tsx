"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { MODULE_ASIDE_DOCK_CLASS } from "@/components/layout/module-layout-tokens";
import { cn } from "@/lib/utils";
import { MOBILE_ASIDE_OPEN_EVENT } from "@/lib/mobile-aside-events";

type ModuleAsideFrameProps = {
  title: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

export const ModuleAsideFrame = ({ title, ariaLabel, className, children }: ModuleAsideFrameProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const asideInner = useMemo(
    () => (
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="flex shrink-0 items-center gap-1">
          <span className="min-w-0 truncate text-sm font-bold leading-[1.66] text-foreground">{title}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">{children}</div>
      </div>
    ),
    [children, title],
  );

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(MOBILE_ASIDE_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(MOBILE_ASIDE_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // Чтобы избежать React/ESLint предупреждений о синхронных setState в эффектах,
    // закрываем оверлей в следующем тике.
    const timer = window.setTimeout(() => setIsOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => setIsOpen(false);

  return (
    <>
      <LeftDockShell
        className={cn(MODULE_ASIDE_DOCK_CLASS, className, "hidden sm:flex")}
        ariaLabel={ariaLabel}
      >
        {asideInner}
      </LeftDockShell>

      {isOpen ? (
        <div
          className="fixed inset-0 z-60 sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <LeftDockShell
            className={cn(
              MODULE_ASIDE_DOCK_CLASS,
              className,
              "left-0 w-full border-r-0 z-60 overflow-hidden",
            )}
            ariaLabel={ariaLabel}
          >
            {asideInner}
          </LeftDockShell>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-[70] inline-flex size-9 items-center justify-center rounded-md bg-card text-foreground shadow-sm"
            aria-label="Закрыть"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}
    </>
  );
};
