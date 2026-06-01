import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const cardClassName =
  "flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card p-2";

type HomeInfoCardBaseProps = {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
  className?: string;
  href?: string;
};

export const HomeInfoCardBase = ({
  header,
  children,
  footer,
  ariaLabel,
  className,
  href,
}: HomeInfoCardBaseProps) => {
  const content = (
    <>
      {header ? <div className="flex shrink-0 items-start justify-between gap-1.5">{header}</div> : null}
      <div className="min-h-0 flex-1">{children}</div>
      {footer ? <div className="flex shrink-0 items-end justify-between gap-1.5">{footer}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          cardClassName,
          "text-card-foreground no-underline transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          className,
        )}
        aria-label={ariaLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className={cn(cardClassName, className)} aria-label={ariaLabel}>
      {content}
    </article>
  );
};
