"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Акцент блока, оставлен для совместимости API. */
export type HomeBlockAccent = "violet" | "teal" | "rose" | "amber";

type ButtonProps = ComponentProps<typeof Button>;

/** Один элемент `actions`: функция для пропа `render` у `Button` (напр. `Link` как корень). */
export type HomeBlockHeaderAction = NonNullable<ButtonProps["render"]>;

type HomeBlockShellProps = {
  title: string;
  icon: LucideIcon;
  /** Цвет круга иконки в шапке; фон секции не меняет. */
  accent?: HomeBlockAccent;
  collapsed: boolean;
  onHide: () => void;
  onToggleCollapsed: () => void;
  /** Плоский массив функций `render` для кнопок в шапке. */
  actions?: HomeBlockHeaderAction[];
  /** Контент справа от заголовка (например, фильтры на десктопе). */
  headerExtra?: ReactNode;
  children: ReactNode;
};

export const HomeBlockShell = ({
  title,
  icon: _icon,
  accent = "violet",
  collapsed,
  onHide,
  onToggleCollapsed,
  actions,
  headerExtra,
  children,
}: HomeBlockShellProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  void _icon;
  void accent;

  const handleMenuAction = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-4 py-0 group-data-[size=sm]/card:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2 className="shrink-0 whitespace-nowrap text-sm font-bold leading-tight tracking-tight text-foreground sm:text-base">
            {title}
          </h2>
          {headerExtra ? (
            <div className="hidden min-w-0 flex-1 items-center gap-1 md:flex">{headerExtra}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Open block menu: ${title}`}
                >
                  <EllipsisVertical aria-hidden className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              {actions ?
                <>
                  {actions.map((render, index) => (
                    <DropdownMenuItem
                      key={`home-block-action-menu-${index}`}
                      render={render}
                      onClick={() => setMenuOpen(false)}
                    />
                  ))}
                  <DropdownMenuSeparator />
                </>
                : null
              }

              <DropdownMenuItem onClick={() => handleMenuAction(onToggleCollapsed)}>
                {collapsed ? "Expand block" : "Collapse block"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMenuAction(onHide)}>
                Hide block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      {collapsed ? null : <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
};
