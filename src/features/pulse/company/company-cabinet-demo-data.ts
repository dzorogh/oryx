import type { StaticImageData } from "next/image";

import { TENANT_LOGOS } from "@/lib/tenant-logos";

export type CompanyParameter = {
  id: string;
  label: string;
  value: string;
};

export type CompanyRequisites = {
  legalParameters: CompanyParameter[];
};

export type CompanyFile = {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
  href: string;
  downloadHref?: string;
};

export type CompanyBiReport = {
  id: string;
  title: string;
  href: string;
  showInCompanyCabinet: boolean;
  allowedUserIds: string[];
  tenantIds: string[];
};

export type CompanyProfile = {
  tenantId: string;
  displayName: string;
  logo?: StaticImageData;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  requisites: CompanyRequisites;
  files: CompanyFile[];
};

/** Demo current user — matches Thanks page convention. */
export const COMPANY_CABINET_CURRENT_USER_ID = "emp-12";

// TODO: wire from auth/RBAC when available.
export const CAN_EDIT_COMPANY = true;

export const COMPANY_BI_REPORTS: CompanyBiReport[] = [
  {
    id: "report-sales-overview",
    title: "Sales overview",
    href: "/analytics/dashboards",
    showInCompanyCabinet: true,
    allowedUserIds: [],
    tenantIds: ["tenant-globaldrive", "tenant-sharmax-by"],
  },
  {
    id: "report-inventory-health",
    title: "Inventory health",
    href: "/analytics/stocks",
    showInCompanyCabinet: true,
    allowedUserIds: [],
    tenantIds: ["tenant-globaldrive", "tenant-oryxbms"],
  },
  {
    id: "report-operational-kpis",
    title: "Operational KPIs",
    href: "/analytics/dashboard-compact",
    showInCompanyCabinet: true,
    allowedUserIds: [COMPANY_CABINET_CURRENT_USER_ID],
    tenantIds: ["tenant-globaldrive", "tenant-lunnar-capital"],
  },
  {
    id: "report-order-funnel",
    title: "Order funnel",
    href: "/analytics/daily-report",
    showInCompanyCabinet: true,
    allowedUserIds: ["emp-99"],
    tenantIds: ["tenant-globaldrive"],
  },
  {
    id: "report-sla-compliance",
    title: "SLA and deadline compliance",
    href: "/analytics/dashboards",
    showInCompanyCabinet: false,
    allowedUserIds: [],
    tenantIds: ["tenant-globaldrive"],
  },
  {
    id: "report-logistics",
    title: "Logistics: timelines and throughput",
    href: "/analytics/stocks",
    showInCompanyCabinet: true,
    allowedUserIds: [],
    tenantIds: ["tenant-sharmax-by", "tenant-sharmax-kz"],
  },
];

const GLOBALDRIVE_FILES: CompanyFile[] = [
  {
    id: "file-gd-charter",
    name: "Company charter.pdf",
    sizeLabel: "1.2 MB",
    uploadedAt: "2025-11-14T10:00:00.000Z",
    href: "/library/documents",
  },
  {
    id: "file-gd-contract-template",
    name: "Standard supply contract template.docx",
    sizeLabel: "340 KB",
    uploadedAt: "2026-01-08T14:30:00.000Z",
    href: "/library/documents",
  },
  {
    id: "file-gd-brand-guidelines",
    name: "Brand guidelines 2026.pdf",
    sizeLabel: "4.8 MB",
    uploadedAt: "2026-02-20T09:15:00.000Z",
    href: "/library/documents",
  },
];

const SHARMAX_FILES: CompanyFile[] = [
  {
    id: "file-sm-dealer-agreement",
    name: "Dealer agreement.pdf",
    sizeLabel: "890 KB",
    uploadedAt: "2025-09-03T11:00:00.000Z",
    href: "/library/documents",
  },
];

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    tenantId: "tenant-globaldrive",
    displayName: "Globaldrive",
    logo: TENANT_LOGOS.globaldrive,
    description:
      "International distributor of powersports, marine, and outdoor equipment with regional hubs across EMEA.",
    website: "https://globaldrive.example",
    email: "info@globaldrive.example",
    phone: "+7 (495) 123-45-67",
    address: "Moscow, Presnenskaya embankment, 12",
    requisites: {
      legalParameters: [
        { id: "legal-name", label: "Legal name", value: 'LLC "Globaldrive"' },
        { id: "short-name", label: "Short name", value: "Globaldrive" },
        { id: "tax-id", label: "Tax ID (INN)", value: "7701234567" },
        { id: "tax-reason-code", label: "Tax reason code (KPP)", value: "770101001" },
        { id: "registration-number", label: "Registration (OGRN)", value: "1027700123456" },
        { id: "registration-date", label: "Registration date", value: "15 March 2010" },
        { id: "legal-form", label: "Legal form", value: "Limited liability company" },
        {
          id: "legal-address",
          label: "Legal address",
          value:
            "123112, Moscow, Presnenskaya embankment, 12, Federation Tower East, floor 40, office 401",
        },
        {
          id: "actual-address",
          label: "Actual address",
          value:
            "141402, Moscow region, Khimki urban district, Leningradskaya street, 39, logistics center Globaldrive, warehouse 7, gate 3",
        },
        {
          id: "okved",
          label: "Primary OKVED",
          value:
            "45.31 — Wholesale of motor vehicle parts and accessories, including powersports, marine, and outdoor equipment components",
        },
        { id: "okpo", label: "OKPO", value: "87654321" },
        { id: "general-director", label: "General director", value: "Ivan Petrov" },
        { id: "vat-status", label: "VAT status", value: "VAT payer (20%)" },
      ],
    },
    files: GLOBALDRIVE_FILES,
  },
  {
    tenantId: "tenant-lunnar-capital",
    displayName: "Lunnar Capital",
    logo: TENANT_LOGOS.lunnarCapital,
    description: "Investment and holding company managing portfolio assets in retail and logistics.",
    website: "https://lunnar-capital.example",
    email: "contact@lunnar-capital.example",
    phone: "+7 (812) 987-65-43",
    address: "Saint Petersburg, Nevsky prospect, 28",
    requisites: {
      legalParameters: [
        { id: "legal-name", label: "Legal name", value: 'LLC "Lunnar Capital"' },
        { id: "tax-id", label: "Tax ID (INN)", value: "7802345678" },
        { id: "tax-reason-code", label: "Tax reason code (KPP)", value: "780201001" },
        { id: "registration-number", label: "Registration (OGRN)", value: "1027800234567" },
        { id: "legal-address", label: "Legal address", value: "191186, Saint Petersburg, Nevsky prospect, 28" },
      ],
    },
    files: [],
  },
  {
    tenantId: "tenant-oryxbms",
    displayName: "OryxBMS",
    logo: TENANT_LOGOS.oryxbms,
    description: "Business management platform for distributed teams, retail, and operations.",
    website: "https://oryxbms.example",
    email: "hello@oryxbms.example",
    phone: "+971 4 123 4567",
    address: "Dubai, Business Bay, Bay Square, Building 7",
    requisites: {
      legalParameters: [
        { id: "legal-name", label: "Legal name", value: "Oryx BMS FZ-LLC" },
        { id: "tax-id", label: "Tax registration number (TRN)", value: "100123456700003" },
        {
          id: "legal-address",
          label: "Registered address",
          value: "Dubai, Business Bay, Bay Square, Building 7, office 1204",
        },
        { id: "trade-license", label: "Trade license", value: "CN-1234567" },
      ],
    },
    files: [
      {
        id: "file-oryx-platform-overview",
        name: "Platform overview.pdf",
        sizeLabel: "2.1 MB",
        uploadedAt: "2026-03-01T08:00:00.000Z",
        href: "/library/documents",
      },
    ],
  },
  {
    tenantId: "tenant-sharmax-by",
    displayName: "Sharmax Belarus",
    logo: TENANT_LOGOS.sharmax,
    description: "Official Sharmax dealer network hub for Belarus and nearby markets.",
    website: "https://sharmax.example/by",
    email: "by@sharmax.example",
    phone: "+375 (17) 234-56-78",
    address: "Minsk, Pobediteley avenue, 9",
    requisites: {
      legalParameters: [
        { id: "legal-name", label: "Legal name", value: 'LLC "Sharmax Belarus"' },
        { id: "tax-id", label: "UNP", value: "190876543" },
        { id: "registration-number", label: "Registration number", value: "1908765430123" },
        { id: "legal-address", label: "Legal address", value: "220020, Minsk, Pobediteley avenue, 9" },
      ],
    },
    files: SHARMAX_FILES,
  },
];
