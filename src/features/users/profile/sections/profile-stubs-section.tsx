"use client";

import { Calculator, GraduationCap } from "lucide-react";
import { ProfileSectionCard } from "../profile-section-card";
import { USER_PROFILE_TEST_ROWS } from "../user-profile-demo-data";

export const ProfileTestResultsSection = () => (
  <ProfileSectionCard title="Test results" icon={GraduationCap} count={USER_PROFILE_TEST_ROWS.length}>
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-[var(--corportal-border-grey)] text-muted-foreground">
            <th className="pb-2 pr-2 font-medium">Section</th>
            <th className="pb-2 pr-2 font-medium">Test</th>
            <th className="pb-2 pr-2 font-medium">Start</th>
            <th className="pb-2 pr-2 font-medium">End</th>
            <th className="pb-2 pr-2 font-medium">Score</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {USER_PROFILE_TEST_ROWS.map((row) => (
            <tr key={row.id} className="border-b border-border/30">
              <td className="py-1.5 pr-2">{row.section}</td>
              <td className="py-1.5 pr-2">{row.testName}</td>
              <td className="py-1.5 pr-2 tabular-nums">{row.startDate}</td>
              <td className="py-1.5 pr-2 tabular-nums">{row.endDate}</td>
              <td className="py-1.5 pr-2 tabular-nums">{row.score}</td>
              <td className="py-1.5 capitalize">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-[10px] text-muted-foreground">Demo placeholder — 50 rows.</p>
  </ProfileSectionCard>
);

export const ProfileCalculatorSection = () => (
  <ProfileSectionCard title="Calculator" icon={Calculator}>
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--corportal-border-grey)] bg-muted/20 p-6 text-center">
      <Calculator className="mb-2 size-8 text-muted-foreground" strokeWidth={1.25} aria-hidden />
      <p className="text-sm font-medium text-foreground">Calculator</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Large placeholder block for a future payroll or bonus calculator module.
      </p>
    </div>
  </ProfileSectionCard>
);
