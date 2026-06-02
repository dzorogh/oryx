"use client";

import Image from "next/image";
import { Briefcase, MapPin } from "lucide-react";
import type { UserProfileData } from "../user-profile-demo-data";
import { formatTenure } from "../user-profile-utils";
import { WORK_STATUS_GRAPHIC_STYLES } from "../profile-design-v2-tokens";
import { ProfileIdentityEditDialog } from "../modals/profile-identity-edit-dialog";
import { ProfileHeroContactActions } from "./profile-hero-contacts";
import { ProfileStatusTooltip } from "./profile-status-tooltip";

type ProfileHeroV2Props = {
  profile: UserProfileData;
  displayName: string;
  showContacts?: boolean;
  canEditIdentity?: boolean;
  onPatch?: (patch: Partial<UserProfileData>) => void;
};

const MetaItem = ({ icon: Icon, label }: { icon: typeof MapPin; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
    <Icon className="size-4 shrink-0 text-indigo-500" aria-hidden />
    <span className="text-foreground/80">{label}</span>
  </span>
);

export const ProfileHeroV2 = ({
  profile,
  displayName,
  showContacts = false,
  canEditIdentity = false,
  onPatch,
}: ProfileHeroV2Props) => {
  const statusStyle = WORK_STATUS_GRAPHIC_STYLES[profile.workStatus];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div
          className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.25)_1px,_transparent_0)] [background-size:18px_18px]"
          aria-hidden
        />
        {canEditIdentity && onPatch ? (
          <ProfileIdentityEditDialog profile={profile} onPatch={onPatch} />
        ) : null}
      </div>

      <div className="flex flex-col items-center px-4 pb-5 text-center sm:px-6 sm:pb-6">
        <div className="relative z-10 -mt-16 shrink-0">
          <div className="size-32 overflow-hidden rounded-full ring-4 ring-card shadow-md sm:size-36">
            <Image
              src={profile.avatarUrl}
              alt=""
              width={144}
              height={144}
              className="size-full object-cover"
              unoptimized
            />
          </div>
        </div>

        <div className="mt-3 flex w-full flex-col items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{displayName}</h1>
          <ProfileStatusTooltip profile={profile}>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.pill}`}
            >
              <span className={`size-1.5 rounded-full ${statusStyle.dot}`} aria-hidden />
              {statusStyle.label}
            </span>
          </ProfileStatusTooltip>
          <p className="text-sm font-medium text-muted-foreground">{profile.position}</p>
        </div>

        <div className="mt-4 flex w-full flex-col items-center gap-2 border-t border-border/60 pt-4">
          <MetaItem icon={MapPin} label={profile.city} />
          <MetaItem
            icon={Briefcase}
            label={`${formatTenure(profile.technical.params.hireDate)} with us`}
          />
        </div>

        {showContacts ? (
          <ProfileHeroContactActions
            profile={profile}
            className="mt-4 w-full border-t border-border/60 pt-4"
          />
        ) : null}
      </div>
    </section>
  );
};
