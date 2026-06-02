import type { ProfileViewerMode } from "./use-profile-viewer-mode";
import type { WorkStatus } from "./user-profile-demo-data";

export type ProfileSectionId =
  | "identity"
  | "workStatus"
  | "contacts"
  | "structure"
  | "testResults"
  | "calculator"
  | "calendar"
  | "attendance"
  | "roles"
  | "personal"
  | "deputy"
  | "reports"
  | "delegation"
  | "assets"
  | "documents"
  | "technical"
  | "technicalParams"
  | "password"
  | "notifications";

export type ViewerContext = {
  viewerMode: ProfileViewerMode;
  profileUserId: string;
  currentUserId: string;
  workStatus: WorkStatus;
};

/**
 * Demo: the viewer-mode toggle is authoritative. "As myself" always means the
 * current user is looking at their own account (editable), regardless of which
 * demo profile id is open in the URL.
 */
export const resolveViewerRole = (ctx: ViewerContext): ProfileViewerMode => ctx.viewerMode;

export const canViewBlock = (section: ProfileSectionId, ctx: ViewerContext): boolean => {
  const role = resolveViewerRole(ctx);

  switch (section) {
    case "identity":
    case "workStatus":
    case "contacts":
    case "personal":
    case "reports":
      return true;
    case "structure":
      return role !== "other" || true;
    case "testResults":
    case "calculator":
      return role !== "other";
    case "calendar":
      return role !== "other";
    case "attendance":
      return role === "self" || role === "manager" || role === "admin";
    case "roles":
      return role !== "other";
    case "deputy":
      return (
        ctx.workStatus === "on_vacation" &&
        (role === "self" || role === "manager" || role === "admin")
      );
    case "delegation":
      return role !== "other";
    case "assets":
      return role !== "other";
    case "documents":
    case "technical":
    case "technicalParams":
      return role === "admin";
    case "password":
      return role === "self" || role === "admin";
    case "notifications":
      return role !== "other";
    default:
      return false;
  }
};

export const canEditBlock = (section: ProfileSectionId, ctx: ViewerContext): boolean => {
  const role = resolveViewerRole(ctx);

  if (role === "other") {
    return false;
  }

  switch (section) {
    case "identity":
      return role === "self" || role === "manager" || role === "admin";
    case "workStatus":
      return role === "self" || role === "manager" || role === "admin";
    case "contacts":
      return role === "self" || role === "admin";
    case "personal":
    case "notifications":
      return role === "self" || role === "admin";
    case "structure":
    case "technicalParams":
    case "documents":
    case "roles":
      return role === "admin";
    case "calendar":
      return role === "manager" || role === "admin";
    case "assets":
      return role === "manager" || role === "admin";
    case "deputy":
      return role === "self";
    case "delegation":
      return role === "self" || role === "admin";
    case "password":
      return role === "self" || role === "admin";
    default:
      return false;
  }
};

/**
 * Demo: the chosen viewer mode is used as-is. In production this is where the
 * real viewer role (from auth/RBAC) would be resolved relative to the profile.
 */
export const getEffectiveViewerMode = (
  storedMode: ProfileViewerMode,
  _profileUserId: string,
  _currentUserId: string,
): ProfileViewerMode => storedMode;
