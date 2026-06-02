"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  PROFILE_CARD_CLASS,
  PROFILE_COUNT_BADGE_CLASS,
  PROFILE_SECTION_HEADER_CLASS,
  PROFILE_SECTION_ICON_CLASS,
} from "./profile-section-styles";

type ProfileSectionCardProps = {
  title: string;
  icon: LucideIcon;
  count?: number;
  headerExtra?: ReactNode;
  children: ReactNode;
  id?: string;
};

export const ProfileSectionCard = ({
  title,
  icon: Icon,
  count,
  headerExtra,
  children,
  id,
}: ProfileSectionCardProps) => (
  <Card id={id} size="sm" className={PROFILE_CARD_CLASS}>
    <div className={PROFILE_SECTION_HEADER_CLASS}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={PROFILE_SECTION_ICON_CLASS} aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {count !== undefined ? (
          <span className={PROFILE_COUNT_BADGE_CLASS}>{count}</span>
        ) : null}
      </div>
      {headerExtra ? (
        <div className="flex shrink-0 items-center gap-2">{headerExtra}</div>
      ) : null}
    </div>
    <div className="p-3 sm:p-3.5">{children}</div>
  </Card>
);
