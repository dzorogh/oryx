import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeActionMenuItemProps = {
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export const HomeActionMenuItem = ({
  children,
  className,
  type = "button",
  disabled,
  ...rest
}: HomeActionMenuItemProps) => (
  <button
    type={type}
    className={cn(
      "flex w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted",
      disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      className,
    )}
    disabled={disabled}
    {...rest}
  >
    {children}
  </button>
);
