"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

type FavoriteReport = {
  id: number;
  title: string;
  href: string;
};

const FAVORITE_REPORTS: FavoriteReport[] = [
  { id: 1, title: "Обзор продаж", href: "/pulse/dashboards/1" },
  { id: 2, title: "Здоровье запасов", href: "/pulse/dashboards/2" },
  { id: 3, title: "Операционные KPI", href: "/pulse/dashboards/3" },
  { id: 4, title: "Воронка заказов", href: "/pulse/dashboards/4" },
  { id: 5, title: "SLA и соблюдение сроков", href: "/pulse/dashboards/5" },
  { id: 6, title: "Логистика: сроки и пропускная способность", href: "/pulse/dashboards/6" },
];

const getReportMonogram = (title: string) => {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "R";
  }

  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

const handleDashboardClick = (_event: ReactMouseEvent<HTMLAnchorElement>) => {
  // Навигация выполняется самим Next.js Link; обработчик нужен для единообразия доступности.
};

const handleDashboardKeyDown = (event: ReactKeyboardEvent<HTMLAnchorElement>) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  event.currentTarget.click();
};

export const HomeFavoriteReportsSection = () => (
  <nav aria-label="Избранные отчёты">
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FAVORITE_REPORTS.map((report) => (
        <li key={report.id} className="flex min-h-0">
          <Link
            href={report.href}
            className="group relative flex min-h-0 w-full overflow-hidden rounded-xl border border-[var(--corportal-border-grey)] bg-card text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Открыть избранный отчёт: ${report.title}`}
            tabIndex={0}
            onClick={handleDashboardClick}
            onKeyDown={handleDashboardKeyDown}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-100 transition-opacity group-hover:opacity-90"
              aria-hidden
            >
              <div className="absolute -left-12 -top-12 size-28 rounded-full bg-primary/12 blur-xl" />
              <div className="absolute -bottom-12 -right-12 size-28 rounded-full bg-violet-500/12 blur-xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted/35" />
            </div>

            <div className="relative flex h-full w-full flex-col gap-3 p-3">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--corportal-border-grey)] bg-background text-xs font-semibold tracking-wide text-foreground"
                  aria-hidden
                >
                  {getReportMonogram(report.title)}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </div>

              <div className="pt-1">
                <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{report.title}</h3>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

