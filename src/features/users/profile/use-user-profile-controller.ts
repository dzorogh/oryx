"use client";

import { useCallback, useMemo, useState } from "react";
import {
  USER_PROFILE_BI_REPORTS,
  USER_PROFILE_CURRENT_USER_ID,
  type UserProfileData,
} from "./user-profile-demo-data";
import {
  canEditBlock,
  canViewBlock,
  getEffectiveViewerMode,
  type ViewerContext,
} from "./user-profile-permissions";
import { useProfileViewerMode } from "./use-profile-viewer-mode";
import { filterVisibleProfileReports, useProfileTenantId } from "./user-profile-utils";

export const useUserProfileController = (initialProfile: UserProfileData) => {
  const [profile, setProfile] = useState(initialProfile);
  const [viewerMode, setViewerMode] = useProfileViewerMode();
  const tenantId = useProfileTenantId();

  const [absencesOpen, setAbsencesOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [delegationOpen, setDelegationOpen] = useState(false);

  const effectiveMode = getEffectiveViewerMode(
    viewerMode,
    profile.id,
    USER_PROFILE_CURRENT_USER_ID,
  );

  const ctx: ViewerContext = useMemo(
    () => ({
      viewerMode: effectiveMode,
      profileUserId: profile.id,
      currentUserId: USER_PROFILE_CURRENT_USER_ID,
      workStatus: profile.workStatus,
    }),
    [effectiveMode, profile.id, profile.workStatus],
  );

  const displayName = profile.names.en;

  const visibleReports = useMemo(
    () =>
      filterVisibleProfileReports(
        USER_PROFILE_BI_REPORTS,
        tenantId,
        effectiveMode === "admin" ? profile.id : USER_PROFILE_CURRENT_USER_ID,
      ),
    [tenantId, effectiveMode, profile.id],
  );

  const handlePatch = useCallback((patch: Partial<UserProfileData>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const canView = useCallback((block: Parameters<typeof canViewBlock>[0]) => canViewBlock(block, ctx), [ctx]);
  const canEdit = useCallback((block: Parameters<typeof canEditBlock>[0]) => canEditBlock(block, ctx), [ctx]);

  return {
    profile,
    displayName,
    ctx,
    viewerMode,
    setViewerMode,
    visibleReports,
    handlePatch,
    canView,
    canEdit,
    modals: {
      absencesOpen,
      setAbsencesOpen,
      templateOpen,
      setTemplateOpen,
      assetsOpen,
      setAssetsOpen,
      rolesOpen,
      setRolesOpen,
      documentsOpen,
      setDocumentsOpen,
      technicalOpen,
      setTechnicalOpen,
      delegationOpen,
      setDelegationOpen,
    },
  };
};

export type UserProfileController = ReturnType<typeof useUserProfileController>;
