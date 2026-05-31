"use client";

import Link from "next/link";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { ArrowUpRight, FileBarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  COMPANY_COUNT_BADGE_CLASS,
  COMPANY_INLINE_ICON_CLASS,
  COMPANY_REPORT_MONOGRAM_CLASS,
  COMPANY_SECTION_ICON_CLASS,
} from "./company-icon-styles";
import type { CompanyBiReport } from "./company-cabinet-demo-data";

type CompanyReportsSectionProps = {
  reports: CompanyBiReport[];
};

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

const handleReportClick = (_event: ReactMouseEvent<HTMLAnchorElement>) => {
  // Navigation is handled by Next.js Link.
};

const handleReportKeyDown = (event: ReactKeyboardEvent<HTMLAnchorElement>) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  event.currentTarget.click();
};

export const CompanyReportsSection = ({ reports }: CompanyReportsSectionProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0">
    <div className="flex items-center justify-between gap-2 border-b border-[var(--corportal-border-grey)] px-3 py-2 sm:px-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <FileBarChart2 className={COMPANY_SECTION_ICON_CLASS} aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Reports</h2>
        <span className={COMPANY_COUNT_BADGE_CLASS}>{reports.length}</span>
      </div>
      <p className="hidden text-[11px] text-muted-foreground sm:block">Quick access to your dashboards</p>
    </div>

    <div className="p-2 sm:p-2.5">
      {reports.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--corportal-border-grey)] bg-muted/20 px-3 py-4">
          <FileBarChart2 className={COMPANY_SECTION_ICON_CLASS} strokeWidth={1.5} aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">No reports available</p>
            <p className="text-xs text-muted-foreground">
              Reports enabled for this workspace and your account will show up here.
            </p>
          </div>
        </div>
      ) : (
        <nav aria-label="Reports">
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reports.map((report) => (
              <li key={report.id} className="min-w-0">
                <Link
                  href={report.href}
                  className="group flex min-w-0 items-center gap-2.5 rounded-lg border border-[var(--corportal-border-grey)] bg-gradient-to-r from-card to-muted/20 px-2.5 py-2 transition-all hover:border-foreground/15 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`Open report: ${report.title}`}
                  tabIndex={0}
                  onClick={handleReportClick}
                  onKeyDown={handleReportKeyDown}
                >
                  <span className={COMPANY_REPORT_MONOGRAM_CLASS} aria-hidden>
                    {getReportMonogram(report.title)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {report.title}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className={`${COMPANY_INLINE_ICON_CLASS} transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-foreground`}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  </Card>
);
