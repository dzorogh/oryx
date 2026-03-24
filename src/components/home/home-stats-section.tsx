"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { STATS_KPI_METRICS } from "./stats-demo-data";

const formatRub = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

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
    </div>
  );
};
