"use client";

import { cn } from "@/lib/utils";
import { buildProfileContactItems } from "../profile-contact-utils";
import type { UserProfileData } from "../user-profile-demo-data";

type ProfileHeroContactActionsProps = {
  profile: UserProfileData;
  className?: string;
};

export const ProfileHeroContactActions = ({ profile, className }: ProfileHeroContactActionsProps) => {
  const items = buildProfileContactItems(profile);

  return (
    <nav
      aria-label="Contact actions"
      className={cn("flex flex-wrap items-center justify-center gap-2", className)}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isPreferred = item.channel === profile.preferredChannel;

        return (
          <a
            key={item.channel}
            href={item.href}
            {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
            aria-label={`${item.label}: ${item.value}${isPreferred ? " (preferred)" : ""}`}
            title={item.label}
            className={cn(
              "relative flex size-9 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
              isPreferred
                ? "border-indigo-300 bg-indigo-600 text-white hover:bg-indigo-700"
                : "border-border/70 bg-background text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {isPreferred ? (
              <span
                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-card"
                aria-hidden
              />
            ) : null}
          </a>
        );
      })}
    </nav>
  );
};
