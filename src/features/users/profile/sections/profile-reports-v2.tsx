"use client";

import { FileBarChart2 } from "lucide-react";
import { ReportLinkCard } from "@/components/home/report-link-card";
import { ProfileSectionCard } from "../profile-section-card";
import type { ProfileBiReport } from "../user-profile-demo-data";

type ProfileReportsV2Props = {
  reports: ProfileBiReport[];
};

export const ProfileReportsV2 = ({ reports }: ProfileReportsV2Props) => (
  <ProfileSectionCard
    id="profile-section-reports"
    title="Your dashboards"
    icon={FileBarChart2}
    count={reports.length}
  >
    {reports.length === 0 ? (
      <p className="text-sm text-muted-foreground">No dashboards linked yet — check back soon.</p>
    ) : (
      <nav aria-label="Reports">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <li key={report.id} className="flex min-h-0">
              <ReportLinkCard
                title={report.title}
                href={report.href}
                ariaLabel={`Open report: ${report.title}`}
              />
            </li>
          ))}
        </ul>
      </nav>
    )}
  </ProfileSectionCard>
);
