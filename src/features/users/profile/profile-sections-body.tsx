"use client";

import type { ReactNode } from "react";
import { getProfileSectionDomId } from "./profile-section-nav";
import type { UserProfileController } from "./use-user-profile-controller";
import { ProfileCalendarSection } from "./sections/profile-calendar-section";
import { ProfileAttendanceSection } from "./sections/profile-attendance-section";
import { ProfileRolesSection } from "./sections/profile-roles-section";
import { ProfilePersonalSection } from "./sections/profile-personal-section";
import { ProfileDeputySection } from "./sections/profile-deputy-section";
import { ProfileDelegationSection } from "./sections/profile-delegation-section";
import { ProfileAssetsSection } from "./sections/profile-assets-section";
import {
  ProfileCalculatorSection,
  ProfileTestResultsSection,
} from "./sections/profile-stubs-section";
import { ProfileAdminRow } from "./sections/profile-admin-sections";
import type { ProfileSectionId } from "./user-profile-permissions";

type ProfileSectionsBodyProps = {
  controller: UserProfileController;
};

const SectionAnchor = ({
  section,
  children,
}: {
  section: ProfileSectionId;
  children: ReactNode;
}) => (
  <div id={getProfileSectionDomId(section)} className="scroll-mt-3">
    {children}
  </div>
);

export const ProfileSectionsBody = ({ controller }: ProfileSectionsBodyProps) => {
  const { profile, ctx, handlePatch, canView, modals } = controller;

  return (
    <>
      {canView("calendar") ? (
        <SectionAnchor section="calendar">
          <ProfileCalendarSection
            profile={profile}
            ctx={ctx}
            onOpenAbsences={() => modals.setAbsencesOpen(true)}
            onOpenTemplate={() => modals.setTemplateOpen(true)}
          />
        </SectionAnchor>
      ) : null}
      {canView("attendance") ? (
        <SectionAnchor section="attendance">
          <ProfileAttendanceSection profile={profile} />
        </SectionAnchor>
      ) : null}

      {canView("roles") ? (
        <SectionAnchor section="roles">
          <ProfileRolesSection
            profile={profile}
            ctx={ctx}
            onManageRoles={() => modals.setRolesOpen(true)}
          />
        </SectionAnchor>
      ) : null}
      {canView("personal") ? (
        <SectionAnchor section="personal">
          <ProfilePersonalSection profile={profile} ctx={ctx} onPatch={handlePatch} />
        </SectionAnchor>
      ) : null}

      {canView("deputy") ? (
        <SectionAnchor section="deputy">
          <ProfileDeputySection profile={profile} ctx={ctx} onPatch={handlePatch} />
        </SectionAnchor>
      ) : null}

      {canView("delegation") ? (
        <SectionAnchor section="delegation">
          <ProfileDelegationSection
            profile={profile}
            ctx={ctx}
            onManage={() => modals.setDelegationOpen(true)}
          />
        </SectionAnchor>
      ) : null}
      {canView("assets") ? (
        <SectionAnchor section="assets">
          <ProfileAssetsSection
            profile={profile}
            ctx={ctx}
            onAssign={() => modals.setAssetsOpen(true)}
          />
        </SectionAnchor>
      ) : null}

      {canView("testResults") ? (
        <SectionAnchor section="testResults">
          <ProfileTestResultsSection />
        </SectionAnchor>
      ) : null}
      {canView("calculator") ? (
        <SectionAnchor section="calculator">
          <ProfileCalculatorSection />
        </SectionAnchor>
      ) : null}

      <ProfileAdminRow
        profile={profile}
        ctx={ctx}
        onPatch={handlePatch}
        onOpenDocuments={() => modals.setDocumentsOpen(true)}
        onOpenTechnicalParams={() => modals.setTechnicalOpen(true)}
      />
    </>
  );
};
