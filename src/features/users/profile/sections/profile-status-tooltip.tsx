"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserProfileData } from "../user-profile-demo-data";
import { WORK_STATUS_LABELS } from "../user-profile-demo-data";

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : null);

type ProfileStatusTooltipProps = {
  profile: UserProfileData;
  children: ReactNode;
};

export const ProfileStatusTooltip = ({ profile, children }: ProfileStatusTooltipProps) => {
  const workdayStart = formatTime(profile.workdayStart);
  const workdayEnd = formatTime(profile.workdayEnd);
  const vacationEnd = formatDate(profile.vacationEnd);
  const hasSchedule = Boolean(workdayStart || vacationEnd);

  return (
    <TooltipProvider delay={150} closeDelay={0}>
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} className="inline-flex cursor-help" />}>
          {children}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex max-w-xs flex-col items-start gap-0.5 text-left">
          <span className="font-semibold">{WORK_STATUS_LABELS[profile.workStatus]}</span>
          {workdayStart ? (
            <span>
              Workday {workdayStart} – {workdayEnd ?? "—"}
            </span>
          ) : null}
          {vacationEnd ? <span>Vacation ends {vacationEnd}</span> : null}
          {!hasSchedule ? <span>No schedule details</span> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
