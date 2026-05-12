"use client";

import { useMemo } from "react";
import Image from "next/image";
import { BIRTHDAY_PEOPLE, type BirthdayPerson } from "./birthdays-demo-data";
import { cn } from "@/lib/utils";

const HOME_BIRTHDAYS_LIMIT = 8;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const getNextBirthdayOccurrence = (person: BirthdayPerson, ref: Date): Date => {
  const y = ref.getFullYear();
  const candidate = new Date(y, person.month - 1, person.day);
  const today = startOfDay(ref);
  if (candidate < today) {
    return new Date(y + 1, person.month - 1, person.day);
  }
  return candidate;
};

const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
});

const dateDayFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
});

const dateMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
});

type BirthdayCardProps = {
  person: BirthdayPerson;
  occurrence: Date;
};

const BirthdayCard = ({ person, occurrence }: BirthdayCardProps) => {
  return (
    <article
      className={cn(
        "flex min-h-0 min-w-0 items-center gap-2 rounded-lg border p-2",
      )}
      aria-label={`День рождения: ${person.fullName}`}
    >
      <div
        className="flex w-14 shrink-0 flex-col items-center rounded-md bg-muted/30 px-1 py-1 text-center"
        aria-label={`Дата дня рождения: ${dateLabelFormatter.format(occurrence)}`}
      >
        <span className="text-xl font-bold leading-none text-foreground">{dateDayFormatter.format(occurrence)}</span>
        <span className="text-[10px] uppercase leading-4 text-muted-foreground">
          {dateMonthFormatter.format(occurrence).replace(".", "")}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Image
          src={person.avatarUrl}
          alt={`Аватар сотрудника ${person.fullName}`}
          width={26}
          height={26}
          className="size-6.5 shrink-0 rounded-full object-cover"
          loading="lazy"
          unoptimized
        />
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">{person.fullName}</h3>
          <p className="line-clamp-1 text-xs leading-tight text-muted-foreground">{person.department}</p>
        </div>
      </div>
    </article>
  );
};

export const HomeBirthdaysSection = () => {
  const now = useMemo(() => new Date(), []);

  const rows = useMemo(() => {
    const withDates = BIRTHDAY_PEOPLE.map((person) => {
      const occurrence = getNextBirthdayOccurrence(person, now);
      return { person, occurrence };
    });
    withDates.sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
    return withDates.slice(0, HOME_BIRTHDAYS_LIMIT);
  }, [now]);

  return (
    <div className="grid grid-cols-1 gap-2">
      {rows.map(({ person, occurrence }) => (
        <BirthdayCard key={person.id} person={person} occurrence={occurrence} />
      ))}
    </div>
  );
};
