import type { Metadata } from "next";
import { CompanyCabinetPage } from "@/features/pulse/company/company-cabinet-page";

export const metadata: Metadata = {
  title: "Company workspace | Oryx BMS",
  description: "Company profile, documents, and BI reports",
};

const PulseCompanyPage = () => <CompanyCabinetPage />;

export default PulseCompanyPage;
