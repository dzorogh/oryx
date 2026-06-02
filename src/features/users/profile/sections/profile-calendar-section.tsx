"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSectionCard } from "../profile-section-card";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type ProfileCalendarSectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onOpenAbsences: () => void;
  onOpenTemplate: () => void;
};

export const ProfileCalendarSection = ({
  profile,
  ctx,
  onOpenAbsences,
  onOpenTemplate,
}: ProfileCalendarSectionProps) => {
  const canEdit = canEditBlock("calendar", ctx);

  return (
    <ProfileSectionCard
      title="Work schedule"
      icon={CalendarDays}
      headerExtra={
        canEdit ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onOpenAbsences}>
              Absences
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onOpenTemplate}>
              Schedule template
            </Button>
          </>
        ) : null
      }
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">{profile.calendarMonthLabel}</p>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {profile.calendarDays.map((day, idx) => {
          const bg =
            day.state === "vacation"
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
              : day.state === "weekend"
                ? "bg-muted text-muted-foreground"
                : day.state === "sick"
                  ? "bg-rose-500/15"
                  : "bg-card";
          return (
            <div
              key={`${day.dayNumber}-${idx}`}
              className={`flex min-h-9 flex-col items-center justify-center rounded-md border border-border/50 px-0.5 py-1 text-[10px] ${bg} ${day.isToday ? "ring-2 ring-primary" : ""} ${!day.inCurrentMonth ? "opacity-40" : ""}`}
              title={day.timeRange ?? day.label}
            >
              <span className="font-semibold tabular-nums">{day.dayNumber}</span>
            </div>
          );
        })}
      </div>
    </ProfileSectionCard>
  );
};
