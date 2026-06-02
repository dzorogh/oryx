"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSectionCard } from "../profile-section-card";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";

type ProfileDelegationSectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onManage: () => void;
};

export const ProfileDelegationSection = ({
  profile,
  ctx,
  onManage,
}: ProfileDelegationSectionProps) => {
  const canEdit = canEditBlock("delegation", ctx);

  return (
    <ProfileSectionCard
      title="Access delegation"
      icon={Share2}
      count={profile.delegations.length}
      headerExtra={
        canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={onManage}>
            Manage
          </Button>
        ) : null
      }
    >
      {profile.delegations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active delegations.</p>
      ) : (
        <ul className="space-y-2">
          {profile.delegations.map((d, i) => (
            <li
              key={`${d.delegateUserId}-${i}`}
              className="rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2 text-xs"
            >
              <p className="font-semibold">{d.delegateName}</p>
              <p className="text-muted-foreground">{d.abilityIds.length} abilities</p>
            </li>
          ))}
        </ul>
      )}
    </ProfileSectionCard>
  );
};
