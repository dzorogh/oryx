"use client";

import { useMemo } from "react";
import { ProfileBreadcrumb } from "./profile-breadcrumb";
import { ProfileModals } from "./modals/profile-modals";
import { ProfileHeroV2 } from "./sections/profile-hero-v2";
import { ProfileReportsV2 } from "./sections/profile-reports-v2";
import { ProfileStructureSection } from "./sections/profile-structure-section";
import { ProfileSectionsBody } from "./profile-sections-body";
import { buildProfileNavItems, ProfileSectionNav } from "./profile-section-nav";
import { ProfileToolbar } from "./profile-toolbar";
import type { UserProfileData } from "./user-profile-demo-data";
import { useUserProfileController } from "./use-user-profile-controller";

type UserProfilePageProps = {
  initialProfile: UserProfileData;
};

export const UserProfilePage = ({ initialProfile }: UserProfilePageProps) => {
  const controller = useUserProfileController(initialProfile);
  const {
    profile,
    displayName,
    ctx,
    visibleReports,
    handlePatch,
    canView,
    canEdit,
    viewerMode,
    setViewerMode,
    modals,
  } = controller;

  const navItems = useMemo(() => buildProfileNavItems(canView), [canView]);

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-3 sm:p-4">
        <div className="flex w-full flex-col gap-3">
          <ProfileBreadcrumb displayName={displayName} />

          <ProfileToolbar viewerMode={viewerMode} onViewerModeChange={setViewerMode} />

          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
            <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
              <ProfileHeroV2
                profile={profile}
                displayName={displayName}
                showContacts={canView("contacts")}
                canEditIdentity={canEdit("identity")}
                onPatch={handlePatch}
              />

              {canView("structure") ? (
                <ProfileStructureSection
                  profile={profile}
                  ctx={ctx}
                  onOpenAdminParams={() => modals.setTechnicalOpen(true)}
                />
              ) : null}

              <ProfileSectionNav items={navItems} />
            </aside>

            <div className="flex min-w-0 flex-col gap-3">
              {canView("reports") ? <ProfileReportsV2 reports={visibleReports} /> : null}
              <ProfileSectionsBody controller={controller} />
            </div>
          </div>
        </div>
      </section>

      <ProfileModals profile={profile} onPatch={handlePatch} {...modals} />
    </main>
  );
};
