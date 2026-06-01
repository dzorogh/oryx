/** Вкладки направлений (демо: одинаковый топ для всех). */
export type StatsDirection = "all" | "vmis" | "motto" | "sports" | "accessories" | "hr";

export const STATS_DIRECTION_TABS: { id: StatsDirection; label: string }[] = [
  { id: "all", label: "All directions" },
  { id: "vmis", label: "VMIS" },
  { id: "motto", label: "MOTTO" },
  { id: "sports", label: "SPORTS" },
  { id: "accessories", label: "Accessories" },
  { id: "hr", label: "HR" },
];

export type KpiMetricId = "sales_today" | "sales_week" | "calls_today" | "calls_week";

export type KpiMetric = {
  id: KpiMetricId;
  title: string;
  value: number;
  format: "rub" | "count";
  leaderName: string;
  avatarUrl: string;
  profileHref: string;
};

/** Контент со скриншота KPI. */
export const STATS_KPI_METRICS: KpiMetric[] = [
  {
    id: "sales_today",
    title: "Top sales today",
    value: 2_249_900,
    format: "rub",
    leaderName: "Konstantin Lukanov",
    avatarUrl: "https://i.pravatar.cc/128?u=lukanov-konstantin",
    profileHref: "/team/users/7101",
  },
  {
    id: "sales_week",
    title: "Top sales this week",
    value: 2_249_900,
    format: "rub",
    leaderName: "Konstantin Lukanov",
    avatarUrl: "https://i.pravatar.cc/128?u=lukanov-konstantin-week",
    profileHref: "/team/users/7101",
  },
  {
    id: "calls_today",
    title: "Top calls today",
    value: 321,
    format: "count",
    leaderName: "Evgenia Avdeeva",
    avatarUrl: "https://i.pravatar.cc/128?u=avdeeva-evgenia",
    profileHref: "/team/users/7102",
  },
  {
    id: "calls_week",
    title: "Top calls this week",
    value: 3210,
    format: "count",
    leaderName: "Evgenia Avdeeva",
    avatarUrl: "https://i.pravatar.cc/128?u=avdeeva-evgenia-week",
    profileHref: "/team/users/7102",
  },
];

/** Второй уровень рейтинга на главной: сотрудники, локации или регионы. */
export type SalesRankingDimension = "employees" | "locations" | "regions";

export const SALES_RANKING_DIMENSION_OPTIONS: { id: SalesRankingDimension; label: string }[] = [
  { id: "employees", label: "Employees" },
  { id: "locations", label: "Locations" },
  { id: "regions", label: "Regions" },
];

export type SalesRankingRow = {
  rank: number;
  name: string;
  turnoverRub: number;
  href: string;
  avatarUrl?: string;
};

export type FebruarySalesLeader = {
  rank: number;
  name: string;
  /** Короткая подпись для оси графика. */
  shortLabel: string;
  turnoverRub: number;
  avatarUrl: string;
  profileHref: string;
};

const mapLeadersToRankingRows = (leaders: FebruarySalesLeader[]): SalesRankingRow[] =>
  leaders.map((leader) => ({
    rank: leader.rank,
    name: leader.name,
    turnoverRub: leader.turnoverRub,
    href: leader.profileHref,
    avatarUrl: leader.avatarUrl,
  }));

/** Топ-6 за февраль (контент со скриншота). */
export const FEBRUARY_SALES_LEADERS: FebruarySalesLeader[] = [
  {
    rank: 1,
    name: "Rafis Konstantinov",
    shortLabel: "Konstantinov R.",
    turnoverRub: 11_277_365,
    avatarUrl: "https://i.pravatar.cc/128?u=konstantinov-rafis",
    profileHref: "/team/users/1",
  },
  {
    rank: 2,
    name: "Alexander Eshankulov",
    shortLabel: "Eshankulov A.",
    turnoverRub: 11_054_910,
    avatarUrl: "https://i.pravatar.cc/128?u=eshankulov-alex",
    profileHref: "/team/users/6081",
  },
  {
    rank: 3,
    name: "Maxim Dekhtyarenko",
    shortLabel: "Dekhtyarenko M.",
    turnoverRub: 10_263_243,
    avatarUrl: "https://i.pravatar.cc/128?u=dekhtyarenko-max",
    profileHref: "/team/users/2973",
  },
  {
    rank: 4,
    name: "Alexey Mironov",
    shortLabel: "Mironov A.",
    turnoverRub: 9_766_289,
    avatarUrl: "https://i.pravatar.cc/128?u=mironov-alex",
    profileHref: "/team/users/2496",
  },
  {
    rank: 5,
    name: "Danila Zhiganov",
    shortLabel: "Zhiganov D.",
    turnoverRub: 9_353_416,
    avatarUrl: "https://i.pravatar.cc/128?u=zhiganov-danila",
    profileHref: "/team/users/5558",
  },
  {
    rank: 6,
    name: "Nikita Gromov",
    shortLabel: "Gromov N.",
    turnoverRub: 8_917_240,
    avatarUrl: "https://i.pravatar.cc/128?u=gromov-nikita",
    profileHref: "/team/users/4022",
  },
];

const FEBRUARY_SALES_LOCATIONS: SalesRankingRow[] = [
  { rank: 1, name: "Moscow Central Hub", turnoverRub: 14_820_000, href: "/pulse/company?location=moscow-central" },
  { rank: 2, name: "East Warehouse", turnoverRub: 12_940_500, href: "/pulse/company?location=east-warehouse" },
  { rank: 3, name: "Saint Petersburg Office", turnoverRub: 11_605_200, href: "/pulse/company?location=saint-petersburg" },
  { rank: 4, name: "Kazan Retail Point", turnoverRub: 9_880_400, href: "/pulse/company?location=kazan-retail" },
  { rank: 5, name: "Novosibirsk Depot", turnoverRub: 8_712_900, href: "/pulse/company?location=novosibirsk-depot" },
];

const FEBRUARY_SALES_REGIONS: SalesRankingRow[] = [
  { rank: 1, name: "Central", turnoverRub: 28_400_000, href: "/pulse/company?region=central" },
  { rank: 2, name: "Volga", turnoverRub: 19_750_000, href: "/pulse/company?region=volga" },
  { rank: 3, name: "North-West", turnoverRub: 16_320_000, href: "/pulse/company?region=north-west" },
  { rank: 4, name: "Siberia", turnoverRub: 12_480_000, href: "/pulse/company?region=siberia" },
  { rank: 5, name: "South", turnoverRub: 10_905_000, href: "/pulse/company?region=south" },
];

/** Демо-рейтинг по выбранному измерению (направление пока не меняет набор). */
export const getSalesRankingRows = (
  dimension: SalesRankingDimension,
  limit = 5,
): SalesRankingRow[] => {
  const rows =
    dimension === "employees"
      ? mapLeadersToRankingRows(FEBRUARY_SALES_LEADERS)
      : dimension === "locations"
        ? FEBRUARY_SALES_LOCATIONS
        : FEBRUARY_SALES_REGIONS;

  return rows.slice(0, limit);
};
