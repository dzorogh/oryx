"use client";

import { X } from "lucide-react";
import { EMPLOYEE_OPTIONS } from "@/components/home/thanks-demo-data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const THANKS_FILTER_ALL = "all";

const SORTED_EMPLOYEES = [...EMPLOYEE_OPTIONS].sort((left, right) =>
  left.fullName.localeCompare(right.fullName),
);

const EMPLOYEE_FILTER_ITEMS = [
  { value: THANKS_FILTER_ALL, label: "Anyone" },
  ...SORTED_EMPLOYEES.map((employee) => ({
    value: employee.id,
    label: employee.fullName,
  })),
];

type ThanksPersonFiltersProps = {
  variant?: "standalone" | "embedded";
  senderId: string;
  recipientId: string;
  onSenderChange: (value: string) => void;
  onRecipientChange: (value: string) => void;
  onClear: () => void;
};

export const ThanksPersonFilters = ({
  variant = "standalone",
  senderId,
  recipientId,
  onSenderChange,
  onRecipientChange,
  onClear,
}: ThanksPersonFiltersProps) => {
  const hasActiveFilters =
    senderId !== THANKS_FILTER_ALL || recipientId !== THANKS_FILTER_ALL;
  const isEmbedded = variant === "embedded";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2",
        !isEmbedded &&
          "rounded-lg border border-[var(--corportal-border-grey)] bg-muted/40 px-3 py-2",
        isEmbedded && "lg:ml-auto",
      )}
      role="toolbar"
      aria-label="Filter thank-yous by sender and recipient"
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">From</span>
        <Select
          items={EMPLOYEE_FILTER_ITEMS}
          value={senderId}
          onValueChange={(value) => onSenderChange(value ?? THANKS_FILTER_ALL)}
        >
          <SelectTrigger
            id="thanks-filter-sender"
            size="sm"
            className="w-[10.5rem] bg-background"
            aria-label="Filter by sender"
          >
            <SelectValue placeholder="Anyone" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value={THANKS_FILTER_ALL}>Anyone</SelectItem>
              {SORTED_EMPLOYEES.map((employee) => (
                <SelectItem key={`sender-${employee.id}`} value={employee.id}>
                  {employee.fullName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">To</span>
        <Select
          items={EMPLOYEE_FILTER_ITEMS}
          value={recipientId}
          onValueChange={(value) => onRecipientChange(value ?? THANKS_FILTER_ALL)}
        >
          <SelectTrigger
            id="thanks-filter-recipient"
            size="sm"
            className="w-[10.5rem] bg-background"
            aria-label="Filter by recipient"
          >
            <SelectValue placeholder="Anyone" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value={THANKS_FILTER_ALL}>Anyone</SelectItem>
              {SORTED_EMPLOYEES.map((employee) => (
                <SelectItem key={`recipient-${employee.id}`} value={employee.id}>
                  {employee.fullName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          aria-label="Clear filters"
        >
          <X aria-hidden className="size-3.5" />
          Clear
        </Button>
      ) : null}
    </div>
  );
};
