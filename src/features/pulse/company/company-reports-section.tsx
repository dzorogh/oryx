"use client";

import { FileBarChart2 } from "lucide-react";
import { ReportLinkCard } from "@/components/home/report-link-card";
import { Card } from "@/components/ui/card";
import {
  COMPANY_COUNT_BADGE_CLASS,
  COMPANY_SECTION_ICON_CLASS,
} from "./company-icon-styles";
import type { CompanyBiReport } from "./company-cabinet-demo-data";

type CompanyReportsSectionProps = {
  reports: CompanyBiReport[];
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
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {reports.map((report) => (
              <li key={report.id} className="flex min-h-0 min-w-0">
                <ReportLinkCard title={report.title} href={report.href} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  </Card>
);
