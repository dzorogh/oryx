"use client";

import Link from "next/link";
import { STATS_KPI_METRICS } from "./stats-demo-data";
import { HomeAvatarRing } from "./home-avatar-ring";

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
  profileHref,
}: {
  title: string;
  valueDisplay: string;
  leaderName: string;
  avatarUrl: string;
  profileHref: string;
}) => (
  <Link
    href={profileHref}
    className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 rounded-xl border border-border bg-card px-3 py-3 text-card-foreground no-underline transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:px-3 lg:py-2.5"
    aria-label={`${title}: ${valueDisplay}. Open profile: ${leaderName}`}
  >
    <h3 className="text-md font-bold leading-snug tracking-tight">{title}</h3>
    <p className="text-xl font-bold tabular-nums leading-none tracking-tight">{valueDisplay}</p>
    <div className="mt-auto flex min-w-0 items-center gap-2">
      <HomeAvatarRing src={avatarUrl} alt="" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{leaderName}</p>
    </div>
  </Link>
);

export const HomeStatsSection = () => {
  return (
    <div className="grid grid-cols-1 gap-2 lg:items-start lg:gap-2">
      <div
        className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Top metrics"
      >
        {STATS_KPI_METRICS.map((metric) => (
          <div key={metric.id} className="flex min-h-0 min-w-0">
            <CompactKpiCard
              title={metric.title}
              valueDisplay={
                metric.format === "rub" ? formatRub(metric.value) : metric.value.toLocaleString("ru-RU")
              }
              leaderName={metric.leaderName}
              avatarUrl={metric.avatarUrl}
              profileHref={metric.profileHref}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
