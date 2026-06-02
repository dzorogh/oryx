"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";
import { ProfileFieldLabel } from "../profile-field-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileSectionCard } from "../profile-section-card";
import { ProfileMiniFormFooter } from "../profile-mini-form-footer";
import { DELEGATE_PICKER_OPTIONS } from "../user-profile-demo-data";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";

type ProfileDeputySectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onPatch: (patch: Partial<UserProfileData>) => void;
};

export const ProfileDeputySection = ({ profile, ctx, onPatch }: ProfileDeputySectionProps) => {
  const canEdit = canEditBlock("deputy", ctx);
  const [deputyId, setDeputyId] = useState(profile.deputyUserId ?? "");

  const deputyLabel =
    DELEGATE_PICKER_OPTIONS.find((o) => o.id === profile.deputyUserId)?.label ??
    profile.deputyName ??
    "—";

  return (
    <ProfileSectionCard title="Deputy" icon={UserCheck}>
      {canEdit ? (
        <>
          <div className="space-y-1">
            <ProfileFieldLabel>Substitute while on vacation</ProfileFieldLabel>
            <Select
              value={deputyId}
              onValueChange={(v) => setDeputyId(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {DELEGATE_PICKER_OPTIONS.filter((o) => o.id !== profile.id).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ProfileMiniFormFooter
            onSave={() => {
              const picked = DELEGATE_PICKER_OPTIONS.find((o) => o.id === deputyId);
              onPatch({
                deputyUserId: deputyId || undefined,
                deputyName: picked?.label,
              });
            }}
            onCancel={() => setDeputyId(profile.deputyUserId ?? "")}
          />
        </>
      ) : (
        <p className="text-sm">{deputyLabel}</p>
      )}
    </ProfileSectionCard>
  );
};
