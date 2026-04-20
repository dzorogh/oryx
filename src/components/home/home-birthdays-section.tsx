"use client";

import { useMemo } from "react";
import Image from "next/image";
import { PartyPopper } from "lucide-react";
import { BIRTHDAY_PEOPLE, type BirthdayPerson } from "./birthdays-demo-data";
import { cn } from "@/lib/utils";
import { HomeDateMetaText } from "./home-date-meta-text";

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

const getDaysUntil = (occurrence: Date, ref: Date) => {
  const today = startOfDay(ref);
  const o = startOfDay(occurrence);
  return Math.round((o.getTime() - today.getTime()) / 86_400_000);
};

const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
});

const daysWordRu = (n: number): string => {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) {
    return "дней";
  }
  if (d === 1) {
    return "день";
  }
  if (d >= 2 && d <= 4) {
    return "дня";
  }
  return "дней";
};

const getRelativeLabel = (daysUntil: number): string => {
  if (daysUntil === 0) {
    return "Сегодня";
  }
  if (daysUntil === 1) {
    return "Завтра";
  }
  return `Через ${daysUntil} ${daysWordRu(daysUntil)}`;
};

type BirthdayCardProps = {
  person: BirthdayPerson;
  occurrence: Date;
  daysUntil: number;
};

const BirthdayCard = ({ person, occurrence, daysUntil }: BirthdayCardProps) => {
  const isToday = daysUntil === 0;

  return (
    <article
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col gap-1.5 rounded-lg border p-2.5",
      )}
      aria-label={`День рождения: ${person.fullName}`}
    >
      <div className="flex h-4 shrink-0 items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium",
            isToday ? "text-corportal-accent-amber-on-soft" : "text-primary",
          )}
        >
          {isToday ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-corportal-accent-amber/20 px-1.5 py-0.5"
              aria-label="Сегодня день рождения"
            >
              <PartyPopper aria-hidden className="size-3" />
              {getRelativeLabel(daysUntil)}
            </span>
          ) : (
            getRelativeLabel(daysUntil)
          )}
        </span>
        <HomeDateMetaText>{dateLabelFormatter.format(occurrence)}</HomeDateMetaText>
      </div>
      <div className="flex items-center gap-2">
        <Image
          src={person.avatarUrl}
          alt={`Аватар сотрудника ${person.fullName}`}
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full border border-[var(--corportal-border-grey)] object-cover"
          loading="lazy"
          unoptimized
        />
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">{person.fullName}</h3>
      </div>
      <p className="line-clamp-1 text-xs leading-snug text-muted-foreground">{person.department}</p>
    </article>
  );
};

export const HomeBirthdaysSection = () => {
  const now = useMemo(() => new Date(), []);

  const rows = useMemo(() => {
    const withDates = BIRTHDAY_PEOPLE.map((person) => {
      const occurrence = getNextBirthdayOccurrence(person, now);
      const daysUntil = getDaysUntil(occurrence, now);
      return { person, occurrence, daysUntil };
    });
    withDates.sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
    return withDates.slice(0, HOME_BIRTHDAYS_LIMIT);
  }, [now]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
      {rows.map(({ person, occurrence, daysUntil }) => (
        <BirthdayCard key={person.id} person={person} occurrence={occurrence} daysUntil={daysUntil} />
      ))}
    </div>
  );
};
