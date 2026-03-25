"use client";

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
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {FAVORITE_REPORTS.map((report) => (
        <li key={report.id}>
          <Link
            href={report.href}
            className="flex min-h-[52px] items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Открыть избранный отчёт: ${report.title}`}
            tabIndex={0}
            onClick={handleDashboardClick}
            onKeyDown={handleDashboardKeyDown}
          >
            <span className="line-clamp-2">{report.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

