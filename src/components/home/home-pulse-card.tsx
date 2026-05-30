import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HomeInfoCardBase } from "./home-info-card-base";

type HomePulseCardProps = {
  title: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export const HomePulseCard = ({
  title,
  meta,
  footer,
  actions,
  children,
  ariaLabel,
  className,
}: HomePulseCardProps) => (
  <HomeInfoCardBase
    className={cn("border-[var(--corportal-border-grey)] bg-card", className)}
    ariaLabel={ariaLabel}
    header={
      <>
        {meta}
        {actions}
      </>
    }
    footer={footer}
  >
    <div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{title}</h3>
      {children}
    </div>
  </HomeInfoCardBase>
);
