"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useDemoTenantId } from "@/lib/use-demo-tenant-id";
import { CompanyCabinetHero } from "./company-cabinet-hero";
import {
  CAN_EDIT_COMPANY,
  COMPANY_BI_REPORTS,
  COMPANY_CABINET_CURRENT_USER_ID,
} from "./company-cabinet-demo-data";
import { filterVisibleReports, getCompanyByTenantId } from "./company-cabinet-utils";
import { CompanyFilesSection } from "./company-files-section";
import { CompanyReportsSection } from "./company-reports-section";
import { CompanyRequisitesSection } from "./company-requisites-section";

export const CompanyCabinetPage = () => {
  const tenantId = useDemoTenantId();

  const company = useMemo(() => getCompanyByTenantId(tenantId), [tenantId]);

  const visibleReports = useMemo(
    () => filterVisibleReports(COMPANY_BI_REPORTS, tenantId, COMPANY_CABINET_CURRENT_USER_ID),
    [tenantId],
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-3 sm:p-4">
        <div className="flex w-full flex-col gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/" />}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Company workspace</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <CompanyCabinetHero company={company} canEdit={CAN_EDIT_COMPANY} />

          <CompanyReportsSection reports={visibleReports} />

          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CompanyRequisitesSection requisites={company.requisites} />
            </div>
            <div className="lg:col-span-2">
              <CompanyFilesSection files={company.files} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
