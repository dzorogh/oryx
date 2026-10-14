import {
  AlignLeft,
  Banknote,
  Calendar,
  CalendarRange,
  CircleDot,
  Hash,
  ListChecks,
  Paperclip,
  SquareCheck,
  SquareChevronDown,
  Type,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { RequestFieldType } from "@/features/tracker/requests/request-forms";
import { cn } from "@/lib/utils";

const ICONS: Record<RequestFieldType, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  money: Banknote,
  date: Calendar,
  period: CalendarRange,
  select: SquareChevronDown,
  radio: CircleDot,
  multi: ListChecks,
  person: UserRound,
  checkbox: SquareCheck,
  file: Paperclip,
};

export const BuilderFieldIcon = ({ type, className }: { type: RequestFieldType; className?: string }) => {
  const Icon = ICONS[type];
  return (
    <span
      aria-hidden
      className={cn("grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground", className)}
    >
      <Icon className="size-3.5" />
    </span>
  );
};
