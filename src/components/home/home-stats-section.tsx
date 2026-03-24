"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FEBRUARY_SALES_LEADERS,
  STATS_DIRECTION_TABS,
  STATS_KPI_METRICS,
  type StatsDirection,
} from "./stats-demo-data";

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const formatRubPlain = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

/** Цвет нижней полоски по месту в рейтинге. */
const LEADER_ROW_BAR_CLASS: Record<number, string> = {
  1: "bg-violet-500",
  2: "bg-sky-500",
  3: "bg-teal-500",
  4: "bg-amber-500",
  5: "bg-rose-500",
};

const RankMedal = ({ rank }: { rank: number }) => {
  if (rank <= 3) {
    const tone =
      rank === 1
        ? "text-amber-500"
        : rank === 2
          ? "text-slate-400"
          : "text-amber-800";
    return (
      <span className="flex w-7 shrink-0 justify-center">
        <Medal className={cn("size-5", tone)} strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{rank} место</span>
      </span>
    );
  }

  const circleClass =
    rank === 4
      ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80"
      : "bg-rose-100 text-rose-900 ring-1 ring-rose-200/80";

  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        circleClass,
      )}
      aria-label={`${rank} место`}
    >
      {rank}
    </span>
  );
};

const CompactKpiCard = ({
  title,
  valueDisplay,
  leaderName,
  avatarUrl,
}: {
  title: string;
  valueDisplay: string;
  leaderName: string;
  avatarUrl: string;
}) => (
  <article
    className={cn(
      "flex min-h-0 flex-col gap-2.5 rounded-xl border border-[var(--corportal-border-grey)] bg-card px-4 py-3.5 lg:px-3.5 lg:py-3",
    )}
  >
    <div className="space-y-2">
      <h3 className="text-md font-bold leading-snug tracking-tight text-foreground">{title}</h3>
    </div>
    <div className="flex items-center gap-6">
      <p className="text-xl font-bold tabular-nums leading-none tracking-tight text-foreground">{valueDisplay}</p>
      <div className="mt-auto flex items-center gap-2.5">
        <div className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
          <Image src={avatarUrl} alt="" fill className="object-cover" sizes="28px" />
        </div>
        <button
          type="button"
          className="min-w-0 truncate text-left text-sm font-medium text-primary underline-offset-2 hover:underline"
          aria-label={`Профиль: ${leaderName}`}
        >
          {leaderName}
        </button>
      </div>
    </div>
  </article>
);

export const HomeStatsSection = () => {
  const [direction, setDirection] = useState<StatsDirection>("all");

  const leaders = FEBRUARY_SALES_LEADERS;

  const maxLeaderTurnover = useMemo(
    () => Math.max(...leaders.map((l) => l.turnoverRub), 1),
    [leaders],
  );

  const tabIds = useMemo(
    () => STATS_DIRECTION_TABS.map((t) => `stats-dir-${t.id}`),
    [],
  );

  const activeTabId = tabIds[STATS_DIRECTION_TABS.findIndex((t) => t.id === direction)] ?? tabIds[0];

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % STATS_DIRECTION_TABS.length;
      document.getElementById(tabIds[next])?.focus();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prev = (index - 1 + STATS_DIRECTION_TABS.length) % STATS_DIRECTION_TABS.length;
      document.getElementById(tabIds[prev])?.focus();
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 lg:items-start lg:gap-3">
      <div
        className="flex min-h-0 flex-wrap gap-3"
        aria-label="Топы по показателям"
      >
        {STATS_KPI_METRICS.map((metric) => (
          <div key={metric.id} className="flex min-h-0">
            <CompactKpiCard
              title={metric.title}
              valueDisplay={
                metric.format === "rub" ? formatRub(metric.value) : metric.value.toLocaleString("ru-RU")
              }
              leaderName={metric.leaderName}
              avatarUrl={metric.avatarUrl}
            />
          </div>
        ))}
      </div>

      <section
        className="flex min-h-0 min-w-0 flex-col rounded-xl border border-[var(--corportal-border-grey)] bg-card p-3"
        aria-labelledby="stats-leaderboard-heading"
      >
        <header className="mb-3 shrink-0">
          <h3
            id="stats-leaderboard-heading"
            className="text-md font-bold leading-snug tracking-tight text-foreground"
          >
            Лучшие специалисты по продажам за февраль
          </h3>
        </header>

        <div
          role="tablist"
          aria-label="Направления для рейтинга продаж"
          className="mb-2 flex shrink-0 flex-wrap items-center gap-1"
        >
          {STATS_DIRECTION_TABS.map((tab, index) => {
            const selected = direction === tab.id;
            return (
              <button
                key={tab.id}
                id={tabIds[index]}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                aria-controls="stats-leaderboard-panel"
                onClick={() => setDirection(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-[var(--corportal-border-grey)] bg-card text-foreground hover:bg-muted",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          id="stats-leaderboard-panel"
          role="tabpanel"
          aria-labelledby={activeTabId}
          className="flex min-h-0 flex-col"
        >
          <ul className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {leaders.map((row) => {
              const sharePct = (row.turnoverRub / maxLeaderTurnover) * 100;
              const barWidthPct = Math.min(100, Math.round(sharePct * 10) / 10);
              const barClass = LEADER_ROW_BAR_CLASS[row.rank] ?? LEADER_ROW_BAR_CLASS[5];
              const turnoverLabel = `${formatRubPlain(row.turnoverRub)} ₽`;
              return (
                <li key={row.rank} className="flex min-h-0 flex-col">
                  <div
                    className="relative flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--corportal-border-grey)] bg-card px-2.5 py-2 gap-1"
                    aria-label={`${row.name}, оборот ${turnoverLabel}, ${barWidthPct.toFixed(1)} процента от оборота лидера`}
                  >
                    <div className="flex min-h-0 items-center gap-2">
                      <RankMedal rank={row.rank} />
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                        <Image src={row.avatarUrl} alt="" fill className="object-cover" sizes="28px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="block w-full truncate text-left text-sm font-medium text-primary underline-offset-2 hover:underline"
                          aria-label={`Карточка сотрудника: ${row.name}`}
                        >
                          {row.name}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="text-xs leading-snug text-muted-foreground line-clamp-2">
                        Оборот продаж
                      </div>
                      <div className="text-sm font-bold tabular-nums leading-none text-foreground">{turnoverLabel}</div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className={cn("h-full rounded-full", barClass)} style={{ width: `${barWidthPct}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
};
