import { DEFAULT_TENANT_ID, getDemoTenantById } from "@/lib/demo-tenants";
import type { CompanyBiReport, CompanyProfile } from "./company-cabinet-demo-data";
import { COMPANY_PROFILES } from "./company-cabinet-demo-data";

export const filterVisibleReports = (
  reports: CompanyBiReport[],
  tenantId: string,
  userId: string,
): CompanyBiReport[] =>
  reports.filter(
    (report) =>
      report.tenantIds.includes(tenantId) &&
      report.showInCompanyCabinet &&
      (report.allowedUserIds.length === 0 || report.allowedUserIds.includes(userId)),
  );

export const getCompanyByTenantId = (tenantId: string): CompanyProfile => {
  const existing = COMPANY_PROFILES.find((profile) => profile.tenantId === tenantId);
  if (existing) {
    return existing;
  }

  const tenant = getDemoTenantById(tenantId);
  const fallbackId = tenant?.id ?? DEFAULT_TENANT_ID;
  const fallbackLabel = tenant?.label ?? "Company";

  return {
    tenantId: fallbackId,
    displayName: fallbackLabel,
    logo: tenant?.logo,
    description: "Company profile details will appear here once configured.",
    requisites: {
      legalParameters: [
        { id: "legal-name", label: "Legal name", value: fallbackLabel },
        { id: "tax-id", label: "Tax ID", value: "—" },
        { id: "legal-address", label: "Legal address", value: "—" },
      ],
    },
    files: [],
  };
};
