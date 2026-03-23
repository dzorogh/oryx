"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HomeBlockShellProps = {
  title: string;
  icon: LucideIcon;
  collapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCollapsed: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

export const HomeBlockShell = ({
  title,
  icon: Icon,
  collapsed,
  canMoveUp,
  canMoveDown,
  onHide,
  onMoveUp,
  onMoveDown,
  onToggleCollapsed,
  actions,
  children,
}: HomeBlockShellProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleMenuAction = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-card p-5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary p-2 text-primary-foreground">
            <Icon aria-hidden className="size-4" />
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <div ref={menuRef} className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Открыть меню блока ${title}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <EllipsisVertical aria-hidden className="size-5" />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-20 min-w-44 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-1 shadow-sm">
                <button
                  type="button"
                  className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
                  onClick={() => handleMenuAction(onHide)}
                >
                  Скрыть блок
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted",
                    !canMoveUp && "cursor-not-allowed opacity-50 hover:bg-transparent",
                  )}
                  disabled={!canMoveUp}
                  onClick={() => handleMenuAction(onMoveUp)}
                >
                  Переместить выше
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted",
                    !canMoveDown && "cursor-not-allowed opacity-50 hover:bg-transparent",
                  )}
                  disabled={!canMoveDown}
                  onClick={() => handleMenuAction(onMoveDown)}
                >
                  Переместить ниже
                </button>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={collapsed ? `Развернуть блок ${title}` : `Свернуть блок ${title}`}
            onClick={onToggleCollapsed}
          >
            <ChevronDown aria-hidden className={cn("size-5 transition-transform", collapsed && "-rotate-90")} />
          </Button>
        </div>
      </header>
      {collapsed ? null : children}
    </section>
  );
};
