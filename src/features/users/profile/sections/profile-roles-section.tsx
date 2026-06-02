"use client";

import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSectionCard } from "../profile-section-card";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";

type ProfileRolesSectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onManageRoles: () => void;
};

export const ProfileRolesSection = ({
  profile,
  ctx,
  onManageRoles,
}: ProfileRolesSectionProps) => {
  const canEdit = canEditBlock("roles", ctx);

  const abilitiesByModule = profile.abilities.reduce<
    Record<string, typeof profile.abilities>
  >((acc, ability) => {
    if (!acc[ability.moduleLabel]) {
      acc[ability.moduleLabel] = [];
    }
    acc[ability.moduleLabel].push(ability);
    return acc;
  }, {});

  return (
    <ProfileSectionCard
      title="Roles & access"
      icon={Shield}
      headerExtra={
        canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={onManageRoles}>
            Manage roles
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
            Tenant roles
          </p>
          <ul className="space-y-2">
            {profile.tenantRoles.map((tr) => (
              <li
                key={tr.tenantId}
                className="rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2"
              >
                <p className="text-xs font-semibold">{tr.tenantName}</p>
                <p className="text-xs text-muted-foreground">{tr.roles.join(", ")}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
            Instance roles
          </p>
          <p className="text-xs">{profile.instanceRoles.join(", ") || "—"}</p>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
            Abilities (combined)
          </p>
          <div className="space-y-2">
            {Object.entries(abilitiesByModule).map(([module, items]) => (
              <div key={module}>
                <p className="text-xs font-medium">{module}</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {a.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProfileSectionCard>
  );
};
