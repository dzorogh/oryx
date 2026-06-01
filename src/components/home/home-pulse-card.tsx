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
  href?: string;
};

export const HomePulseCard = ({
  title,
  meta,
  footer,
  actions,
  children,
  ariaLabel,
  className,
  href,
}: HomePulseCardProps) => (
  <HomeInfoCardBase
    href={href}
    className={className}
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
