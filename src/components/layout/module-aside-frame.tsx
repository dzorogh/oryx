"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { RAIL_FOOTER_ITEMS, RAIL_PRIMARY_ITEMS, TenantSwitcher } from "@/components/layout/nav-rail";
import { MODULE_ASIDE_DOCK_CLASS } from "@/components/layout/module-layout-tokens";
import { Button } from "@/components/ui/button";
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
          className="fixed inset-0 z-[60] sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <LeftDockShell
            className={cn(
              MODULE_ASIDE_DOCK_CLASS,
              className,
              "left-0 w-full border-r-0 z-[60] overflow-hidden",
            )}
            ariaLabel={ariaLabel}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border p-2">
                <div className="flex items-center justify-start gap-2 pb-2">
                  <TenantSwitcher />
                </div>
                <div className="space-y-1">
                  {RAIL_PRIMARY_ITEMS.map((item) => {
                    const active = item.match === "/" ? pathname === "/" : pathname?.startsWith(item.match);
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.label}
                        variant={active ? "secondary" : "ghost"}
                        size="default"
                        nativeButton={false}
                        className="h-10 w-full justify-start gap-3"
                        render={
                          <Link
                            href={item.href}
                            onClick={handleClose}
                            aria-label={item.label}
                            aria-current={active ? "page" : undefined}
                            className="inline-flex w-full items-center gap-3"
                          />
                        }
                      >
                        <Icon aria-hidden className="size-4" />
                        <span className="text-sm">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="space-y-1">
                  {RAIL_FOOTER_ITEMS.map((item) => {
                    const active = pathname?.startsWith(item.match);
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.label}
                        variant={active ? "secondary" : "ghost"}
                        size="default"
                        nativeButton={false}
                        className="h-10 w-full justify-start gap-3"
                        render={
                          <Link
                            href={item.href}
                            onClick={handleClose}
                            aria-label={item.label}
                            aria-current={active ? "page" : undefined}
                            className="inline-flex w-full items-center gap-3"
                          />
                        }
                      >
                        <Icon aria-hidden className="size-4" />
                        <span className="text-sm">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {asideInner}
              </div>
            </div>
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
