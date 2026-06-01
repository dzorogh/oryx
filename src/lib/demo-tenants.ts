import type { StaticImageData } from "next/image";

import { TENANT_LOGOS } from "@/assets/tenants/logos";

export type DemoTenant = {
  id: string;
  label: string;
  logo: StaticImageData;
};

/** Demo tenants for the user-menu switcher (logos are square icons, no text). */
export const DEMO_TENANTS: DemoTenant[] = [
  { id: "tenant-globaldrive", label: "Globaldrive", logo: TENANT_LOGOS.globaldrive },
  { id: "tenant-lunnar-capital", label: "Lunnar Capital", logo: TENANT_LOGOS.lunnarCapital },
  { id: "tenant-my-testing", label: "My Testing", logo: TENANT_LOGOS.myTesting },
  { id: "tenant-oryxbms", label: "OryxBMS", logo: TENANT_LOGOS.oryxbms },
  { id: "tenant-sharmax-by", label: "Sharmax Belarus", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-kz", label: "Sharmax Kazakhstan", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-mx", label: "Sharmax Mexico", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-om", label: "Sharmax Oman", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-qa", label: "Sharmax Qatar", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-sa", label: "Sharmax Saudi", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-es", label: "Sharmax Spain", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-ae", label: "Sharmax UAE", logo: TENANT_LOGOS.sharmax },
  { id: "tenant-sharmax-uz", label: "Sharmax Uzbekistan", logo: TENANT_LOGOS.sharmax },
];

export const DEFAULT_TENANT_ID = DEMO_TENANTS[0]?.id ?? "tenant-globaldrive";

export const getDemoTenantById = (id: string): DemoTenant | undefined =>
  DEMO_TENANTS.find((tenant) => tenant.id === id);
