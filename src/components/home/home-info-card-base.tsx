import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeInfoCardBaseProps = {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export const HomeInfoCardBase = ({
  header,
  children,
  footer,
  ariaLabel,
  className,
}: HomeInfoCardBaseProps) => (
  <article
    className={cn(
      "flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-2",
      className,
    )}
    aria-label={ariaLabel}
  >
    {header ? <div className="flex shrink-0 items-start justify-between gap-1.5">{header}</div> : null}
    <div className="min-h-0 flex-1">{children}</div>
    {footer ? <div className="flex shrink-0 items-end justify-between gap-1.5">{footer}</div> : null}
  </article>
);
