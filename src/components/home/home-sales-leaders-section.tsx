"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeAvatarRing } from "./home-avatar-ring";
import { HomeFilterChip } from "./home-filter-chip";
import {
  FEBRUARY_SALES_LEADERS,
  STATS_DIRECTION_TABS,
  type StatsDirection,
} from "./stats-demo-data";

const formatRubPlain = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

const LEADER_ROW_CARD_CLASS: Record<number, string> = {
  1: "bg-card",
  2: "bg-card",
  3: "bg-card",
};

const TOP_RANK_RIBBON_CLASS: Record<number, string> = {
  1: "bg-gradient-to-r from-amber-600 to-yellow-500 text-white",
  2: "bg-gradient-to-r from-slate-600 to-slate-500 text-white",
  3: "bg-gradient-to-r from-orange-800 to-amber-700 text-white",
};

const TOP_RANK_ICON = {
  1: Crown,
  2: Crown,
  3: Crown,
} as const;

const RankMedal = ({ rank }: { rank: number }) => {
  if (rank <= 3) {
    const topRankClass =
      rank === 1
        ? "bg-amber-500 text-white ring-1 ring-amber-300/90"
        : rank === 2
          ? "bg-slate-500 text-white ring-1 ring-slate-300/90"
          : "bg-amber-700 text-white ring-1 ring-amber-400/80";

    return (
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold tabular-nums",
          topRankClass,
        )}
        aria-label={`${rank} место`}
      >
        {rank}
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
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
        circleClass,
      )}
      aria-label={`${rank} место`}
    >
      {rank}
    </span>
  );
};

export const HomeSalesLeadersSection = () => {
  const [direction, setDirection] = useState<StatsDirection>("all");
  const leaders = FEBRUARY_SALES_LEADERS.slice(0, 4);

  const tabIds = useMemo(
    () => STATS_DIRECTION_TABS.map((tab) => `sales-leaders-dir-${tab.id}`),
    [],
  );

  const activeTabId = tabIds[STATS_DIRECTION_TABS.findIndex((tab) => tab.id === direction)] ?? tabIds[0];

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (index + 1) % STATS_DIRECTION_TABS.length;
      document.getElementById(tabIds[nextIndex])?.focus();
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prevIndex = (index - 1 + STATS_DIRECTION_TABS.length) % STATS_DIRECTION_TABS.length;
      document.getElementById(tabIds[prevIndex])?.focus();
    }
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby="sales-leaderboard-heading">

      <div
        role="tablist"
        aria-label="Направления для рейтинга продаж"
        className="mb-2 flex shrink-0 flex-wrap items-center gap-1"
      >
        {STATS_DIRECTION_TABS.map((tab, index) => {
          const selected = direction === tab.id;
          return (
            <HomeFilterChip
              key={tab.id}
              id={tabIds[index]}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              aria-controls="sales-leaderboard-panel"
              onClick={() => setDirection(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              active={selected}
            >
              {tab.label}
            </HomeFilterChip>
          );
        })}
      </div>

      <div
        id="sales-leaderboard-panel"
        role="tabpanel"
        aria-labelledby={activeTabId}
        className="flex min-h-0 flex-col"
      >
        <ul className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {leaders.map((row) => {
            const cardClass = LEADER_ROW_CARD_CLASS[row.rank] ?? "";
            const turnoverLabel = `${formatRubPlain(row.turnoverRub)} ₽`;

            return (
              <li key={row.rank} className="flex min-h-0 flex-col">
                <Link
                  href={row.profileHref}
                  className={cn(
                    "relative flex min-h-0 flex-1 flex-col gap-1 overflow-hidden rounded-lg border border-[var(--corportal-border-grey)] bg-card px-2.5 py-2 transition-colors hover:border-primary/35 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    cardClass,
                  )}
                  aria-label={`Открыть профиль: ${row.name}, оборот ${turnoverLabel}`}
                >
                  {row.rank <= 3 ? (
                    <>
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/75 to-transparent"
                        aria-hidden
                      />
                      <div
                        className={cn(
                          "absolute -right-7 top-2 z-10 flex w-24 rotate-45 items-center justify-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
                          TOP_RANK_RIBBON_CLASS[row.rank as keyof typeof TOP_RANK_RIBBON_CLASS],
                        )}
                      >
                        {(() => {
                          const TopRankIcon = TOP_RANK_ICON[row.rank as keyof typeof TOP_RANK_ICON];
                          return <TopRankIcon className="size-3" aria-hidden />;
                        })()}
                        <span>{`TOP ${row.rank}`}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex min-h-0 items-center gap-2">
                    <RankMedal rank={row.rank} />
                    <HomeAvatarRing src={row.avatarUrl} alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="block w-full truncate text-left text-sm font-medium text-primary">
                        {row.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate whitespace-nowrap text-xs leading-snug text-muted-foreground">
                      Оборот продаж
                    </div>
                    <div className="whitespace-nowrap text-xs font-bold tabular-nums leading-none text-foreground sm:text-sm">
                      {turnoverLabel}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
