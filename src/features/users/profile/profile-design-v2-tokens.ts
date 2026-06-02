import type { WorkStatus } from "./user-profile-demo-data";

/**
 * Profile design tokens. Intentionally restrained: a single calm accent (indigo)
 * plus neutral surfaces. Status colors are kept because they carry meaning.
 */

/** Neutral chip/tag used for list values. */
export const PROFILE_GRAPHIC_CHIP_CLASS =
  "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground/80";

export const WORK_STATUS_GRAPHIC_STYLES: Record<
  WorkStatus,
  { label: string; pill: string; dot: string }
> = {
  working: {
    label: "Working",
    pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  day_off: {
    label: "Day off",
    pill: "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  on_vacation: {
    label: "On vacation",
    pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  sick_leave: {
    label: "Sick leave",
    pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  off_hours: {
    label: "Off hours",
    pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-500/20 dark:bg-slate-500/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};
