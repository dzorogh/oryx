"use client";

import { useMemo } from "react";
import Image from "next/image";
import { BIRTHDAY_PEOPLE, type BirthdayPerson } from "./birthdays-demo-data";

const HOME_BIRTHDAYS_LIMIT = 7;

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

const BirthdayCard = ({ person, occurrence, daysUntil }: BirthdayCardProps) => (
  <article
    className="flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-3"
    aria-label={`День рождения: ${person.fullName}`}
  >
    <div className="flex shrink-0 items-start justify-between gap-2">
      <span className="text-xs font-medium text-primary">{getRelativeLabel(daysUntil)}</span>
      <span className="shrink-0 text-right text-xs text-muted-foreground">
        {dateLabelFormatter.format(occurrence)}
      </span>
    </div>
    <div className="flex items-center gap-2">
      <Image
        src={person.avatarUrl}
        alt={`Аватар сотрудника ${person.fullName}`}
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full border border-[var(--corportal-border-grey)] object-cover"
        loading="lazy"
        unoptimized
      />
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{person.fullName}</h3>
    </div>
    <p className="text-xs leading-snug text-muted-foreground line-clamp-2">
      {person.department} · {person.role}
    </p>
  </article>
);

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(7,minmax(0,1fr))]">
      {rows.map(({ person, occurrence, daysUntil }) => (
        <BirthdayCard key={person.id} person={person} occurrence={occurrence} daysUntil={daysUntil} />
      ))}
    </div>
  );
};
