import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProfileFieldLabelProps = {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export const ProfileFieldLabel = ({ htmlFor, children, className }: ProfileFieldLabelProps) => (
  <label
    htmlFor={htmlFor}
    className={cn("text-xs font-medium text-foreground", className)}
  >
    {children}
  </label>
);
