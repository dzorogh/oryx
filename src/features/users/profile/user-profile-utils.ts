import { useDemoTenantId } from "@/lib/use-demo-tenant-id";
import type { ProfileBiReport } from "./user-profile-demo-data";

export const formatTenure = (hireDateIso: string): string => {
  const hire = new Date(hireDateIso);
  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  let months = now.getMonth() - hire.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    return "—";
  }
  const yPart = years === 1 ? "1 year" : `${years} years`;
  const mPart = months === 1 ? "1 month" : `${months} months`;
  if (years === 0) {
    return mPart;
  }
  if (months === 0) {
    return yPart;
  }
  return `${yPart} ${mPart}`;
};

export const computeAge = (birthdayIso: string): number => {
  const birth = new Date(birthdayIso);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

export const formatBirthdayDisplay = (
  birthdayIso: string,
  hideBirthYear: boolean,
): string => {
  const d = new Date(birthdayIso);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  if (hideBirthYear) {
    return `${day} ${month}`;
  }
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

export const filterVisibleProfileReports = (
  reports: ProfileBiReport[],
  tenantId: string,
  viewerUserId: string,
): ProfileBiReport[] =>
  reports.filter(
    (r) =>
      r.showInProfile &&
      r.tenantIds.includes(tenantId) &&
      (r.allowedUserIds.length === 0 || r.allowedUserIds.includes(viewerUserId)),
  );

export const useProfileTenantId = (): string => useDemoTenantId();
