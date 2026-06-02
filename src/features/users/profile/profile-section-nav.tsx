"use client";

import { cn } from "@/lib/utils";
import type { ProfileSectionId } from "./user-profile-permissions";

export type ProfileNavItem = {
  section: ProfileSectionId;
  label: string;
};

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  { section: "reports", label: "Your dashboards" },
  { section: "calendar", label: "Work schedule" },
  { section: "attendance", label: "Attendance" },
  { section: "roles", label: "Roles & access" },
  { section: "personal", label: "About me" },
  { section: "deputy", label: "Deputy" },
  { section: "delegation", label: "Delegation" },
  { section: "assets", label: "Assets" },
  { section: "testResults", label: "Test results" },
  { section: "calculator", label: "Calculator" },
  { section: "documents", label: "Documents" },
  { section: "technical", label: "Technical data" },
  { section: "technicalParams", label: "Technical parameters" },
  { section: "password", label: "Password" },
  { section: "notifications", label: "Notifications" },
];

export const getProfileSectionDomId = (section: ProfileSectionId) =>
  `profile-section-${section}`;

export const buildProfileNavItems = (
  canView: (section: ProfileSectionId) => boolean,
): ProfileNavItem[] => PROFILE_NAV_ITEMS.filter((item) => canView(item.section));

type ProfileSectionNavProps = {
  items: ProfileNavItem[];
  className?: string;
};

export const ProfileSectionNav = ({ items, className }: ProfileSectionNavProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Profile sections"
      className={cn(
        "rounded-xl border border-border/70 bg-card ring-1 ring-[var(--corportal-border-grey)]",
        className,
      )}
    >
      <p className="border-b border-[var(--corportal-border-grey)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5 p-2">
        {items.map((item) => (
          <li key={item.section}>
            <a
              href={`#${getProfileSectionDomId(item.section)}`}
              className="block rounded-md px-2.5 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
