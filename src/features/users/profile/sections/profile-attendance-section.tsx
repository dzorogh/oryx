"use client";

import { Clock } from "lucide-react";
import { ProfileSectionCard } from "../profile-section-card";
import { PROFILE_EMPTY_STATE_CLASS } from "../profile-section-styles";
import type { UserProfileData } from "../user-profile-demo-data";

type ProfileAttendanceSectionProps = {
  profile: UserProfileData;
};

export const ProfileAttendanceSection = ({ profile }: ProfileAttendanceSectionProps) => (
  <ProfileSectionCard title="Attendance" icon={Clock} count={profile.attendance.length}>
    {profile.attendance.length === 0 ? (
      <div className={PROFILE_EMPTY_STATE_CLASS}>
        <p className="text-sm text-muted-foreground">No attendance records.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--corportal-border-grey)] text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Date</th>
              <th className="pb-2 pr-3 font-medium">Check-in</th>
              <th className="pb-2 pr-3 font-medium">Check-out</th>
              <th className="pb-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {profile.attendance.map((row) => (
              <tr key={row.id} className="border-b border-border/40">
                <td className="py-2 pr-3 tabular-nums">{row.date}</td>
                <td className="py-2 pr-3 tabular-nums">{row.checkIn}</td>
                <td className="py-2 pr-3 tabular-nums">{row.checkOut}</td>
                <td className="py-2 text-muted-foreground">{row.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </ProfileSectionCard>
);
