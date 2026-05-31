"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import {
  THANKS_CURRENT_USER_DEPARTMENT,
  THANKS_CURRENT_USER_ID,
  THANKS_CURRENT_USER_NAME,
  type ThankYouEntry,
} from "@/features/pulse/thanks/thanks-demo-data";
import { cn } from "@/lib/utils";

const MESSAGE_MAX_LENGTH = 280;

type ThanksFormProps = {
  idPrefix?: string;
  onSent?: (entry: ThankYouEntry) => void;
};

const formatSentAtLabel = () =>
  new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const ThanksForm = ({ idPrefix = "thanks", onSent }: ThanksFormProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const recipientOptions = useMemo(
    () => EMPLOYEE_OPTIONS.filter((employee) => employee.id !== THANKS_CURRENT_USER_ID),
    [],
  );

  const recipientSelectItems = useMemo(
    () =>
      recipientOptions.map((employee) => ({
        value: employee.id,
        label: employee.fullName,
      })),
    [recipientOptions],
  );

  const handleSubmit = () => {
    if (!selectedEmployeeId || !message.trim()) {
      return;
    }

    const recipient = recipientOptions.find((employee) => employee.id === selectedEmployeeId);
    if (!recipient) {
      return;
    }

    const entry: ThankYouEntry = {
      id: `ty-new-${Date.now()}`,
      senderId: THANKS_CURRENT_USER_ID,
      senderName: THANKS_CURRENT_USER_NAME,
      senderDepartment: THANKS_CURRENT_USER_DEPARTMENT,
      recipientId: recipient.id,
      recipientName: recipient.fullName,
      recipientDepartment: recipient.department,
      message: message.trim(),
      sentAtLabel: formatSentAtLabel(),
    };

    onSent?.(entry);
    toast.success("Thank-you sent");
    setSelectedEmployeeId(null);
    setMessage("");
  };

  const employeeSelectId = `${idPrefix}-employee-select`;
  const messageInputId = `${idPrefix}-message`;
  const remainingChars = MESSAGE_MAX_LENGTH - message.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={employeeSelectId} className="text-sm font-medium text-foreground">
          Colleague
        </label>
        <Select
          items={recipientSelectItems}
          value={selectedEmployeeId ?? ""}
          onValueChange={(value) => {
            setSelectedEmployeeId(value ?? null);
          }}
        >
          <SelectTrigger id={employeeSelectId} className="w-full" aria-label="Select colleague">
            <SelectValue placeholder="Select a colleague" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {recipientOptions.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  <span className="flex flex-col gap-0.5">
                    <span>{employee.fullName}</span>
                    <span className="text-xs text-muted-foreground">{employee.department}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={messageInputId} className="text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id={messageInputId}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={4}
          placeholder="e.g. Thanks for helping with the release!"
          aria-label="Thank-you message"
          aria-invalid={isOverLimit}
          className={cn(
            "flex min-h-[96px] w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            isOverLimit && "border-destructive focus-visible:ring-destructive/20",
          )}
        />
        <p
          className={cn(
            "text-right text-xs tabular-nums",
            isOverLimit ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {remainingChars} characters left
        </p>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedEmployeeId || !message.trim() || isOverLimit}
        aria-label="Send thank-you"
        className="w-full sm:w-auto"
      >
        Send
      </Button>

      <p className="text-xs leading-snug text-muted-foreground">
        You can thank any colleague once per month.
      </p>
    </div>
  );
};
