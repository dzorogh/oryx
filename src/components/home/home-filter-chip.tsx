"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HomeFilterChipProps = {
  active: boolean;
  children: ReactNode;
  ariaLabel?: string;
  /** `sm` — list toolbars; `xs` — compact filters inside home blocks. */
  size?: NonNullable<ComponentProps<typeof Button>["size"]>;
} & Omit<ComponentProps<typeof Button>, "className" | "children" | "variant" | "size"> & {
    className?: string;
  };

export const HomeFilterChip = ({
  active,
  children,
  ariaLabel,
  size = "sm",
  className,
  type = "button",
  ...rest
}: HomeFilterChipProps) => (
  <Button
    type={type}
    variant={active ? "default" : "outline"}
    size={size}
    className={cn(
      !active && "border-[var(--corportal-border-grey)] bg-card hover:bg-muted",
      className,
    )}
    aria-label={ariaLabel}
    aria-pressed={active}
    {...rest}
  >
    {children}
  </Button>
);
