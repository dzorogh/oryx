"use client";

import Image from "next/image";
import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

type FavoriteReport = {
  id: number;
  title: string;
  href: string;
  previewAlt: string;
  previewSrc: string;
};

type FavoriteReportSeed = Omit<FavoriteReport, "previewAlt" | "previewSrc">;

const FAVORITE_REPORT_SEEDS: FavoriteReportSeed[] = [
  { id: 1, title: "Обзор продаж", href: "/pulse/dashboards/1" },
  { id: 2, title: "Здоровье запасов", href: "/pulse/dashboards/2" },
  { id: 3, title: "Операционные KPI", href: "/pulse/dashboards/3" },
  { id: 4, title: "Воронка заказов", href: "/pulse/dashboards/4" },
  { id: 5, title: "SLA и соблюдение сроков", href: "/pulse/dashboards/5" },
  { id: 6, title: "Логистика: сроки и пропускная способность", href: "/pulse/dashboards/6" },
];

const PREVIEW_BACKGROUNDS = [
  ["#101826", "#1d2f4f"],
  ["#12141f", "#263251"],
  ["#0f1c29", "#20405f"],
  ["#19131f", "#3a2953"],
  ["#122116", "#1f4a33"],
  ["#1b1a10", "#5d4f1f"],
] as const;

const encodeSvg = (value: string) =>
  encodeURIComponent(value)
    .replace(/%0A/g, "")
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/");

const createMockPreviewDataUri = (report: FavoriteReportSeed) => {
  const [topColor, bottomColor] = PREVIEW_BACKGROUNDS[(report.id - 1) % PREVIEW_BACKGROUNDS.length];
  const label = report.title.length > 30 ? `${report.title.slice(0, 27)}...` : report.title;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${topColor}"/>
          <stop offset="100%" stop-color="${bottomColor}"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect x="52" y="60" width="300" height="18" rx="9" fill="rgba(255,255,255,0.3)"/>
      <rect x="52" y="102" width="210" height="14" rx="7" fill="rgba(255,255,255,0.2)"/>
      <rect x="52" y="150" width="860" height="380" rx="18" fill="rgba(255,255,255,0.1)"/>
      <rect x="932" y="150" width="296" height="180" rx="18" fill="rgba(255,255,255,0.16)"/>
      <rect x="932" y="350" width="296" height="180" rx="18" fill="rgba(255,255,255,0.12)"/>
      <rect x="52" y="562" width="1176" height="104" rx="16" fill="rgba(10,14,24,0.44)"/>
      <text x="84" y="622" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="rgba(255,255,255,0.92)">
        ${label}
      </text>
      <text x="84" y="652" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)">
        Superset preview mock
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeSvg(svg)}`;
};

const FAVORITE_REPORTS: FavoriteReport[] = FAVORITE_REPORT_SEEDS.map((report) => ({
  ...report,
  previewAlt: `Мок-скриншот дашборда: ${report.title}`,
  previewSrc: createMockPreviewDataUri(report),
}));

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
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
      {FAVORITE_REPORTS.map((report) => (
        <li key={report.id} className="flex min-h-0">
          <Link
            href={report.href}
            className="group flex min-h-0 w-full flex-col gap-1 rounded-md border border-[var(--corportal-border-grey)] bg-card p-1 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Открыть избранный отчёт: ${report.title}`}
            tabIndex={0}
            onClick={handleDashboardClick}
            onKeyDown={handleDashboardKeyDown}
          >
            <div className="relative aspect-[16/8] overflow-hidden rounded-sm bg-muted">
              <Image
                src={report.previewSrc}
                alt={report.previewAlt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 16vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
                unoptimized
              />
            </div>
            <h3 className="line-clamp-2 px-1 pb-0.5 text-xs font-semibold leading-tight text-foreground">{report.title}</h3>
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

