import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HomeInfoCardBase } from "./home-info-card-base";

type HomeFeedCardProps = {
  title: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export const HomeFeedCard = ({
  title,
  meta,
  footer,
  actions,
  children,
  ariaLabel,
  className,
}: HomeFeedCardProps) => (
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
