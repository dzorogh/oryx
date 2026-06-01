"use client";

import { ReportLinkCard } from "./report-link-card";

const FAVORITE_REPORTS = [
  { id: 1, title: "Sales overview", href: "/pulse/dashboards/1" },
  { id: 2, title: "Inventory health", href: "/pulse/dashboards/2" },
  { id: 3, title: "Operational KPIs", href: "/pulse/dashboards/3" },
  { id: 4, title: "Order funnel", href: "/pulse/dashboards/4" },
  { id: 5, title: "SLA and deadline compliance", href: "/pulse/dashboards/5" },
  { id: 6, title: "Logistics: timelines and throughput", href: "/pulse/dashboards/6" },
] as const;

export const HomeFavoriteReportsSection = () => (
  <nav aria-label="Favorite reports">
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {FAVORITE_REPORTS.map((report) => (
        <li key={report.id} className="flex min-h-0">
          <ReportLinkCard
            title={report.title}
            href={report.href}
            ariaLabel={`Open favorite report: ${report.title}`}
          />
        </li>
      ))}
    </ul>
  </nav>
);
