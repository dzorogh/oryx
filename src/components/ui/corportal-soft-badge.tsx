import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CorportalSoftBadgeProps = {
  children: ReactNode;
  /** Цветной фон и текст (Tailwind-классы или токены `bg-corportal-*`). */
  className?: string;
  icon?: LucideIcon;
  /** Доп. классы для иконки (цвет штриха). */
  iconClassName?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children" | "className">;

/**
 * Единый мягкий бейдж: статусы идей, приоритеты задач и др.
 * Компактный размер и скругление как у бейджа приоритета (rounded-sm, плотные отступы).
 */
export const CorportalSoftBadge = ({
  children,
  className,
  icon: Icon,
  iconClassName,
  ...rest
}: CorportalSoftBadgeProps) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-normal leading-snug",
      className,
    )}
    {...rest}
  >
    {Icon ? (
      <Icon aria-hidden className={cn("size-4 shrink-0", iconClassName)} strokeWidth={2} />
    ) : null}
    <span className="min-w-0 whitespace-nowrap">{children}</span>
  </span>
);
