"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeFilterChipProps = {
  active: boolean;
  children: ReactNode;
  ariaLabel?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "aria-label"> & {
    className?: string;
  };

export const HomeFilterChip = ({
  active,
  children,
  ariaLabel,
  className,
  type = "button",
  ...rest
}: HomeFilterChipProps) => (
  <button
    type={type}
    className={cn(
      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-[var(--corportal-border-grey)] bg-card text-foreground hover:bg-muted",
      className,
    )}
    aria-label={ariaLabel}
    aria-pressed={active}
    {...rest}
  >
    {children}
  </button>
);
