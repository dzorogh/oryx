"use client";

import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HomeActionMenuItem } from "./home-action-menu-item";

/** Акцент цветного круга иконки (палитра Corportal / канбан). */
export type HomeBlockAccent = "violet" | "teal" | "rose" | "amber";

const ACCENT_ICON_CLASS: Record<HomeBlockAccent, string> = {
  violet: "bg-corportal-accent-violet-soft text-corportal-accent-violet-on-soft",
  teal: "bg-corportal-accent-teal-soft text-corportal-accent-teal-on-soft",
  rose: "bg-corportal-accent-rose-soft text-corportal-accent-rose-on-soft",
  amber: "bg-corportal-accent-amber-soft text-corportal-accent-amber-on-soft",
};

type ButtonProps = ComponentProps<typeof Button>;

/** Один элемент `actions`: функция для пропа `render` у `Button` (напр. `Link` как корень). */
export type HomeBlockHeaderAction = NonNullable<ButtonProps["render"]>;

type HomeBlockShellProps = {
  title: string;
  icon: LucideIcon;
  /** Цвет круга иконки в шапке; фон секции не меняет. */
  accent?: HomeBlockAccent;
  collapsed: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onHide: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCollapsed: () => void;
  /** Плоский массив функций `render` для кнопок в шапке. */
  actions?: HomeBlockHeaderAction[];
  children: ReactNode;
};

export const HomeBlockShell = ({
  title,
  icon: Icon,
  accent = "violet",
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
    <Card className="overflow-visible">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-full p-2", ACCENT_ICON_CLASS[accent])}>
            <Icon aria-hidden className="size-4" />
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {actions?.map((render, index) => (
            <Button
              key={`home-block-action-${index}`}
              type="button"
              variant="outline"
              size="default"
              nativeButton={false}
              render={render}
            />
          ))}
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
                <HomeActionMenuItem onClick={() => handleMenuAction(onHide)}>
                  Скрыть блок
                </HomeActionMenuItem>
                <HomeActionMenuItem
                  disabled={!canMoveUp}
                  onClick={() => handleMenuAction(onMoveUp)}
                >
                  Переместить выше
                </HomeActionMenuItem>
                <HomeActionMenuItem
                  disabled={!canMoveDown}
                  onClick={() => handleMenuAction(onMoveDown)}
                >
                  Переместить ниже
                </HomeActionMenuItem>
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
      </CardHeader>
      {collapsed ? null : <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
};
