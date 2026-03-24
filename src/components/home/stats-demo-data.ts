/** Вкладки направлений (демо: одинаковый топ для всех). */
export type StatsDirection = "all" | "vmis" | "motto" | "sports" | "accessories" | "hr";

export const STATS_DIRECTION_TABS: { id: StatsDirection; label: string }[] = [
  { id: "all", label: "Все направления" },
  { id: "vmis", label: "VMIS" },
  { id: "motto", label: "MOTTO" },
  { id: "sports", label: "SPORTS" },
  { id: "accessories", label: "Accessories" },
  { id: "hr", label: "HR" },
];

export type KpiMetricId = "sales_today" | "sales_week" | "calls_today";

export type KpiMetric = {
  id: KpiMetricId;
  title: string;
  value: number;
  format: "rub" | "count";
  leaderName: string;
  avatarUrl: string;
};

/** Контент со скриншота KPI. */
export const STATS_KPI_METRICS: KpiMetric[] = [
  {
    id: "sales_today",
    title: "Топ продаж за сегодня",
    value: 2_249_900,
    format: "rub",
    leaderName: "Луканов Константин",
    avatarUrl: "https://i.pravatar.cc/128?u=lukanov-konstantin",
  },
  {
    id: "sales_week",
    title: "Топ продаж за неделю",
    value: 2_249_900,
    format: "rub",
    leaderName: "Луканов Константин",
    avatarUrl: "https://i.pravatar.cc/128?u=lukanov-konstantin-week",
  },
  {
    id: "calls_today",
    title: "Топ звонков за сегодня",
    value: 321,
    format: "count",
    leaderName: "Авдеева Евгения",
    avatarUrl: "https://i.pravatar.cc/128?u=avdeeva-evgenia",
  },
];

export type FebruarySalesLeader = {
  rank: number;
  name: string;
  /** Короткая подпись для оси графика. */
  shortLabel: string;
  turnoverRub: number;
  avatarUrl: string;
};

/** Топ-5 за февраль (контент со скриншота). */
export const FEBRUARY_SALES_LEADERS: FebruarySalesLeader[] = [
  {
    rank: 1,
    name: "Константинов Рафис",
    shortLabel: "Константинов Р.",
    turnoverRub: 11_277_365,
    avatarUrl: "https://i.pravatar.cc/128?u=konstantinov-rafis",
  },
  {
    rank: 2,
    name: "Эшанкулов Александр",
    shortLabel: "Эшанкулов А.",
    turnoverRub: 11_054_910,
    avatarUrl: "https://i.pravatar.cc/128?u=eshankulov-alex",
  },
  {
    rank: 3,
    name: "Дехтяренко Максим",
    shortLabel: "Дехтяренко М.",
    turnoverRub: 10_263_243,
    avatarUrl: "https://i.pravatar.cc/128?u=dekhtyarenko-max",
  },
  {
    rank: 4,
    name: "Миронов Алексей",
    shortLabel: "Миронов А.",
    turnoverRub: 9_766_289,
    avatarUrl: "https://i.pravatar.cc/128?u=mironov-alex",
  },
  {
    rank: 5,
    name: "Жиганов Данила",
    shortLabel: "Жиганов Д.",
    turnoverRub: 9_353_416,
    avatarUrl: "https://i.pravatar.cc/128?u=zhiganov-danila",
  },
];
