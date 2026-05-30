"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getThanksEmployeeAvatarUrl,
  type ThankYouEntry,
} from "@/features/pulse/thanks/thanks-demo-data";
import { cn } from "@/lib/utils";

export type ThankYouEntryCardVariant = "received" | "sent" | "all";

type ThankYouEntryCardProps = {
  entry: ThankYouEntry;
  variant: ThankYouEntryCardVariant;
  className?: string;
};

type PersonAvatarProps = {
  personId: string;
  name: string;
  className?: string;
};

const PersonAvatar = ({ personId, name, className }: PersonAvatarProps) => {
  const avatarUrl = getThanksEmployeeAvatarUrl(personId);

  return (
    <div
      className={cn(
        "relative size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-teal-500/20",
        className,
      )}
    >
      <Image src={avatarUrl} alt={name} fill sizes="56px" className="object-cover" />
    </div>
  );
};

type PersonRowProps = {
  label: string;
  personId: string;
  name: string;
  department: string;
  dateLabel?: string;
  dateTime?: string;
};

const PersonRow = ({ label, personId, name, department, dateLabel, dateTime }: PersonRowProps) => (
  <div className="flex min-w-0 items-start gap-3">
    <PersonAvatar personId={personId} name={name} />
    <div className="min-w-0 flex-1 pt-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 text-pretty text-sm font-semibold leading-snug text-foreground">
          {name}
        </p>
        {dateLabel ? (
          <time
            dateTime={dateTime ?? dateLabel}
            className="shrink-0 text-xs whitespace-nowrap text-muted-foreground"
          >
            {dateLabel}
          </time>
        ) : null}
      </div>
      <Badge variant="outline" className="mt-1 h-5 font-normal">
        {department}
      </Badge>
    </div>
  </div>
);

type PersonChipProps = {
  label: string;
  personId: string;
  name: string;
  department: string;
};

const PersonChip = ({ label, personId, name, department }: PersonChipProps) => (
  <div className="flex min-w-0 flex-1 items-start gap-3 sm:min-w-[12rem] sm:max-w-[min(100%,20rem)]">
    <PersonAvatar personId={personId} name={name} />
    <div className="min-w-0 pt-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-pretty text-sm font-semibold leading-snug text-foreground">{name}</p>
      <Badge variant="outline" className="mt-0.5 h-5 font-normal">
        {department}
      </Badge>
    </div>
  </div>
);

const AllTabPeopleRow = ({ entry }: { entry: ThankYouEntry }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:gap-6">
    <PersonChip
      label="From"
      personId={entry.senderId}
      name={entry.senderName}
      department={entry.senderDepartment}
    />
    <ArrowRight
      aria-hidden
      className="mx-auto size-4 shrink-0 text-muted-foreground sm:mx-0"
    />
    <PersonChip
      label="To"
      personId={entry.recipientId}
      name={entry.recipientName}
      department={entry.recipientDepartment}
    />
  </div>
);

export const ThankYouEntryCard = ({ entry, variant, className }: ThankYouEntryCardProps) => {
  const dateId = `thanks-date-${entry.id}`;

  if (variant === "all") {
    return (
      <Card size="sm" className={cn("ring-1 ring-foreground/10", className)}>
        <CardContent className="flex flex-col gap-3 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <AllTabPeopleRow entry={entry} />
            <time
              id={dateId}
              dateTime={entry.sentAtLabel}
              className="shrink-0 text-xs text-muted-foreground sm:pt-1 sm:text-right"
            >
              {entry.sentAtLabel}
            </time>
          </div>
          <p className="border-t border-border/60 pt-3 text-sm leading-relaxed text-foreground">
            {entry.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" className={cn("ring-1 ring-foreground/10", className)}>
      <CardContent className="flex flex-col gap-3 pt-0">
        <PersonRow
          label={variant === "received" ? "From" : "To"}
          personId={variant === "received" ? entry.senderId : entry.recipientId}
          name={variant === "received" ? entry.senderName : entry.recipientName}
          department={
            variant === "received" ? entry.senderDepartment : entry.recipientDepartment
          }
          dateLabel={entry.sentAtLabel}
          dateTime={entry.sentAtLabel}
        />

        <p className="line-clamp-3 text-sm leading-relaxed text-foreground">{entry.message}</p>
      </CardContent>
    </Card>
  );
};
