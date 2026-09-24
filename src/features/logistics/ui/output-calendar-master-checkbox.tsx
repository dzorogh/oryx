// english-ui:ignore-file
"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@/lib/utils";

/** Feature checkbox that can show MinusIcon for indeterminate (base Checkbox always uses Check). */
export const CalendarMasterCheckbox = ({
  checked,
  indeterminate,
  onCheckedChange,
  className,
  id,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  id?: string;
}) => (
  <CheckboxPrimitive.Root
    id={id}
    data-slot="checkbox"
    checked={checked}
    indeterminate={indeterminate}
    onCheckedChange={(value) => onCheckedChange(value === true)}
    className={cn(
      "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
      className,
    )}
  >
    <CheckboxPrimitive.Indicator
      data-slot="checkbox-indicator"
      className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
    >
      {indeterminate ? <MinusIcon /> : <CheckIcon />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);
