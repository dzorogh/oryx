import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type HomeFieldSurfaceBaseProps = {
  className?: string;
};

type HomeFieldSurfaceInputProps = HomeFieldSurfaceBaseProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  };

type HomeFieldSurfaceTextareaProps = HomeFieldSurfaceBaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: "textarea";
  };

type HomeFieldSurfaceProps = HomeFieldSurfaceInputProps | HomeFieldSurfaceTextareaProps;

const baseClassName =
  "w-full rounded-lg border border-[var(--corportal-border-grey)] bg-card text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50";

export const HomeFieldSurface = (props: HomeFieldSurfaceProps) => {
  if (props.as === "textarea") {
    const { as: _, className, ...rest } = props;
    return <textarea className={cn(baseClassName, className)} {...rest} />;
  }

  const { as: _, className, type = "text", ...rest } = props;
  return <input type={type} className={cn(baseClassName, className)} {...rest} />;
};
