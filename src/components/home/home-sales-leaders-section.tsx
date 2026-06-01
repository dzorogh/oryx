"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Crown, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HomeAvatarRing } from "./home-avatar-ring";
import { HomeFilterChip } from "./home-filter-chip";
import {
  getSalesRankingRows,
  SALES_RANKING_DIMENSION_OPTIONS,
  STATS_DIRECTION_TABS,
  type SalesRankingDimension,
  type SalesRankingRow,
  type StatsDirection,
} from "./stats-demo-data";

const SALES_LEADERS_COMPACT_COUNT = 3;
const SALES_LEADERS_EXPANDED_COUNT = 5;

const formatRubPlain = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

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

const SALES_RANKING_DIMENSION_ITEMS = SALES_RANKING_DIMENSION_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
}));

const DIMENSION_ENTITY_LABEL: Record<SalesRankingDimension, string> = {
  employees: "profile",
  locations: "location",
  regions: "region",
};

type HomeSalesLeadersFiltersProps = {
  direction: StatsDirection;
  onDirectionChange: (direction: StatsDirection) => void;
  dimension: SalesRankingDimension;
  onDimensionChange: (dimension: SalesRankingDimension) => void;
  className?: string;
};

export const HomeSalesLeadersFilters = ({
  direction,
  onDirectionChange,
  dimension,
  onDimensionChange,
  className,
}: HomeSalesLeadersFiltersProps) => {
  const tabIds = useMemo(
    () => STATS_DIRECTION_TABS.map((tab) => `sales-leaders-dir-${tab.id}`),
    [],
  );

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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select
        items={SALES_RANKING_DIMENSION_ITEMS}
        value={dimension}
        onValueChange={(value) => {
          if (value === "employees" || value === "locations" || value === "regions") {
            onDimensionChange(value);
          }
        }}
      >
        <SelectTrigger
          id="sales-ranking-dimension"
          size="sm"
          className="w-[9.5rem] shrink-0 bg-background"
          aria-label="Ranking view"
        >
          <SelectValue placeholder="Employees" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {SALES_RANKING_DIMENSION_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div
        role="tablist"
        aria-label="Sales ranking directions"
        className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
      >
        {STATS_DIRECTION_TABS.map((tab, index) => {
          const selected = direction === tab.id;
          return (
            <HomeFilterChip
              key={tab.id}
              size="sm"
              id={tabIds[index]}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              aria-controls="sales-leaderboard-panel"
              onClick={() => onDirectionChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              active={selected}
            >
              {tab.label}
            </HomeFilterChip>
          );
        })}
      </div>
    </div>
  );
};

const RankingRowIcon = ({ dimension }: { dimension: SalesRankingDimension }) => {
  const Icon = dimension === "regions" ? MapPin : Building2;
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
};

type HomeSalesLeadersSectionProps = {
  direction?: StatsDirection;
  onDirectionChange?: (direction: StatsDirection) => void;
  dimension?: SalesRankingDimension;
  onDimensionChange?: (dimension: SalesRankingDimension) => void;
  hideFilters?: boolean;
};

export const HomeSalesLeadersSection = ({
  direction: directionProp,
  onDirectionChange,
  dimension: dimensionProp,
  onDimensionChange,
  hideFilters = false,
}: HomeSalesLeadersSectionProps = {}) => {
  const [internalDirection, setInternalDirection] = useState<StatsDirection>("all");
  const [internalDimension, setInternalDimension] = useState<SalesRankingDimension>("employees");
  const direction = directionProp ?? internalDirection;
  const dimension = dimensionProp ?? internalDimension;
  const leaders = useMemo(
    () => getSalesRankingRows(dimension, SALES_LEADERS_EXPANDED_COUNT),
    [dimension],
  );

  const tabIds = useMemo(
    () => STATS_DIRECTION_TABS.map((tab) => `sales-leaders-dir-${tab.id}`),
    [],
  );

  const activeTabId = tabIds[STATS_DIRECTION_TABS.findIndex((tab) => tab.id === direction)] ?? tabIds[0];

  const handleDirectionChange = (nextDirection: StatsDirection) => {
    onDirectionChange?.(nextDirection);
    if (directionProp === undefined) {
      setInternalDirection(nextDirection);
    }
  };

  const handleDimensionChange = (nextDimension: SalesRankingDimension) => {
    onDimensionChange?.(nextDimension);
    if (dimensionProp === undefined) {
      setInternalDimension(nextDimension);
    }
  };

  const showTopRibbon = dimension === "employees";

  return (
    <section className="flex min-h-0 min-w-0 flex-col" aria-labelledby="sales-leaderboard-heading">
      {hideFilters ? null : (
        <HomeSalesLeadersFilters
          direction={direction}
          onDirectionChange={handleDirectionChange}
          dimension={dimension}
          onDimensionChange={handleDimensionChange}
          className="mb-1.5 shrink-0"
        />
      )}

      <div
        id="sales-leaderboard-panel"
        role="tabpanel"
        aria-labelledby={activeTabId}
        className="flex min-h-0 flex-col"
      >
        <ul className="grid min-h-0 grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-5">
          {leaders.map((row: SalesRankingRow) => {
            const turnoverLabel = `${formatRubPlain(row.turnoverRub)} ₽`;
            const isExpandedOnly = row.rank > SALES_LEADERS_COMPACT_COUNT;
            const entityLabel = DIMENSION_ENTITY_LABEL[dimension];

            return (
              <li
                key={`${dimension}-${row.rank}`}
                className={cn("flex min-h-0 flex-col", isExpandedOnly && "hidden 2xl:flex")}
              >
                <Link
                  href={row.href}
                  className="relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden rounded-lg border border-border bg-card px-2 py-1.5 text-card-foreground no-underline transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Open ${entityLabel}: ${row.name}, turnover ${turnoverLabel}`}
                >
                  {showTopRibbon && row.rank <= 3 ? (
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
                  ) : null}
                  <div className="flex min-h-0 items-center gap-1.5">
                    {row.avatarUrl ? (
                      <HomeAvatarRing src={row.avatarUrl} alt="" />
                    ) : (
                      <RankingRowIcon dimension={dimension} />
                    )}
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</p>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="truncate whitespace-nowrap text-xs leading-snug text-muted-foreground">
                      Sales turnover
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
