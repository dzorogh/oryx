"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProfileFieldLabel } from "../profile-field-label";
import { ProfileSectionCard } from "../profile-section-card";
import { ProfileMiniFormFooter } from "../profile-mini-form-footer";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";
import { computeAge, formatBirthdayDisplay } from "../user-profile-utils";

type ProfilePersonalSectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onPatch: (patch: Partial<UserProfileData>) => void;
};

export const ProfilePersonalSection = ({
  profile,
  ctx,
  onPatch,
}: ProfilePersonalSectionProps) => {
  const canEdit = canEditBlock("personal", ctx);
  const [draft, setDraft] = useState(profile);
  const hideYear = profile.personal.hideBirthYear && !canEdit;

  const birthdayDisplay = formatBirthdayDisplay(
    profile.personal.birthday,
    profile.personal.hideBirthYear,
  );
  const ageDisplay = profile.personal.hideBirthYear
    ? "Hidden"
    : String(computeAge(profile.personal.birthday));

  if (!canEdit) {
    const items: { label: string; value: string }[] = [
      { label: "Gender", value: profile.personal.gender },
      { label: "Birthday", value: birthdayDisplay },
      ...(hideYear ? [] : [{ label: "Age", value: ageDisplay }]),
      { label: "Hobbies", value: profile.personal.hobbies },
      { label: "Sports", value: profile.personal.sports },
      { label: "Music artists", value: profile.personal.musicArtists },
      { label: "Favorite movie", value: profile.personal.favoriteMovie },
      { label: "Favorite book", value: profile.personal.favoriteBook },
    ];

    return (
      <ProfileSectionCard title="About me" icon={Heart}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="space-y-0.5">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm text-foreground">{item.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard title="About me" icon={Heart}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <ProfileFieldLabel htmlFor="personal-gender">Gender</ProfileFieldLabel>
          <Input
            id="personal-gender"
            value={draft.personal.gender}
            onChange={(e) =>
              setDraft({
                ...draft,
                personal: { ...draft.personal, gender: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-1">
          <ProfileFieldLabel htmlFor="personal-birthday">Birthday (ISO)</ProfileFieldLabel>
          <Input
            id="personal-birthday"
            value={draft.personal.birthday}
            onChange={(e) =>
              setDraft({
                ...draft,
                personal: { ...draft.personal, birthday: e.target.value },
              })
            }
          />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id="hide-year"
            checked={draft.personal.hideBirthYear}
            onCheckedChange={(checked) =>
              setDraft({
                ...draft,
                personal: { ...draft.personal, hideBirthYear: checked === true },
              })
            }
          />
          <ProfileFieldLabel htmlFor="hide-year" className="text-xs font-normal">
            Hide birth year and age from others
          </ProfileFieldLabel>
        </div>
        {[
          ["hobbies", "Hobbies"],
          ["sports", "Sports"],
          ["musicArtists", "Music artists"],
          ["favoriteMovie", "Favorite movie"],
          ["favoriteBook", "Favorite book"],
        ].map(([key, label]) => (
          <div key={key} className="space-y-1 sm:col-span-2">
            <ProfileFieldLabel htmlFor={`personal-${key}`}>{label}</ProfileFieldLabel>
            <Input
              id={`personal-${key}`}
              value={draft.personal[key as keyof typeof draft.personal] as string}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  personal: { ...draft.personal, [key]: e.target.value },
                })
              }
            />
          </div>
        ))}
      </div>
      <ProfileMiniFormFooter
        onSave={() => onPatch({ personal: draft.personal })}
        onCancel={() => setDraft(profile)}
      />
    </ProfileSectionCard>
  );
};
