"use client";

import { Building2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROFILE_GRAPHIC_CHIP_CLASS } from "../profile-design-v2-tokens";
import { ProfileSectionCard } from "../profile-section-card";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";

type ProfileStructureSectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onOpenAdminParams: () => void;
};

const ListBlock = ({
  label,
  items,
  leadItems = [],
}: {
  label: string;
  items: string[];
  leadItems?: string[];
}) => (
  <div>
    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    {items.length === 0 ? (
      <p className="mt-1.5 text-xs text-muted-foreground">—</p>
    ) : (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => {
          const isLead = leadItems.includes(item);
          return (
            <span
              key={item}
              className={PROFILE_GRAPHIC_CHIP_CLASS}
              title={isLead ? `Head of ${item}` : undefined}
            >
              {isLead ? (
                <Crown
                  className="mr-1 inline size-3 -translate-y-px text-amber-500"
                  aria-label="Head of department"
                />
              ) : null}
              {item}
            </span>
          );
        })}
      </div>
    )}
  </div>
);

export const ProfileStructureSection = ({
  profile,
  ctx,
  onOpenAdminParams,
}: ProfileStructureSectionProps) => {
  const canEdit = canEditBlock("structure", ctx);

  return (
    <ProfileSectionCard
      id="profile-section-structure"
      title="Where I work"
      icon={Building2}
      headerExtra={
        canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={onOpenAdminParams}>
            Edit parameters
          </Button>
        ) : null
      }
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <ListBlock
          label="Departments"
          items={profile.departments}
          leadItems={profile.headOfDepartments}
        />
        <ListBlock label="Managers" items={profile.managers} />
        <ListBlock label="Location" items={profile.location ? [profile.location] : []} />
        <ListBlock label="District" items={profile.district ? [profile.district] : []} />
      </div>
    </ProfileSectionCard>
  );
};
