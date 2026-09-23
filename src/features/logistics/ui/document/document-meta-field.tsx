// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DocumentMetaField = ({
  label,
  children,
  className,
  wide,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) => (
  <div className={cn("min-w-0 border-l border-border/60 px-5 py-2.5 first:border-l-0", wide && "sm:col-span-2", className)}>
    <dt className="mb-0.5 truncate text-xs whitespace-nowrap text-muted-foreground">{label}</dt>
    {/* -ml-2/pl-2 leaves room for ghost controls that shift left by -ml-2, so overflow-hidden does not clip their hover border. */}
    <dd className="m-0 -ml-2 flex h-8 min-w-0 items-center gap-1.5 overflow-hidden pl-2 text-sm font-medium whitespace-nowrap [&_[data-slot=badge]]:h-6 [&_[data-slot=status-pill]]:h-6">
      {children}
    </dd>
  </div>
);

export const DocumentMetaEmpty = () => <span className="text-muted-foreground/50">—</span>;

/** Russian plural for calendar day count: 1 день, 2–4 дня, 5–20 дней, 21 день, 22 дня, 11–14 дней. */
export const dayWord = (days: number): string => {
  const n = Math.abs(Math.trunc(days));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return "день";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return "дня";
  }
  return "дней";
};

/** Ghost date control for document header meta — one line, 32px, field chrome only on hover/focus. */
export const DocumentMetaDateInput = ({
  id,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
  overdueDays: days = 0,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  overdueDays?: number;
}) => {
  const overdue = days > 0;
  const empty = !value;
  const word = dayWord(days);
  const overdueTitle = `Просрочен на ${days} ${word}`;
  return (
    <span className="relative inline-flex h-8 min-w-0 items-center gap-1.5">
      {empty ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 z-[1] px-2 text-sm font-medium text-muted-foreground/50"
        >
          —
        </span>
      ) : null}
      <input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        title={overdue ? overdueTitle : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "-ml-2 h-8 max-w-[11rem] cursor-pointer rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium outline-none",
          "[color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute",
          "hover:border-border hover:bg-muted/50 focus-visible:border-border focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
          empty ? "text-transparent" : overdue ? "text-amber-700" : "text-foreground",
          disabled && "cursor-default opacity-70 hover:border-transparent hover:bg-transparent",
        )}
      />
      {overdue ? (
        <>
          <span className="text-xs font-medium text-amber-700" title={overdueTitle}>
            −{days} дн.
          </span>
          <span className="sr-only">{overdueTitle}</span>
        </>
      ) : null}
    </span>
  );
};

/** Calendar days overdue relative to today (local). Positive = overdue. */
export const overdueDays = (expectedEndOn: string | null | undefined, today = new Date()): number => {
  if (!expectedEndOn) {
    return 0;
  }
  const end = new Date(`${expectedEndOn}T00:00:00`);
  if (Number.isNaN(end.getTime())) {
    return 0;
  }
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = startOfToday.getTime() - end.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
};

/** Russian plural for «N позиция/позиции/позиций». */
export const pluralPositions = (count: number): string => {
  const n = Math.abs(Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "позиций";
  if (mod10 === 1 && mod100 !== 11) {
    word = "позиция";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = "позиции";
  }
  return `${n} ${word}`;
};
