export type DemoTenant = {
  id: string;
  label: string;
  logoUrl: string;
};

const LOGO = {
  globaldrive: "/tenants/logos/globaldrive.png",
  lunnarCapital: "/tenants/logos/lunnar-capital.png",
  myTesting: "/tenants/logos/my-testing.svg",
  oryxbms: "/tenants/logos/oryxbms.png",
  sharmax: "/tenants/logos/sharmax.png",
} as const;

/** Demo tenants for the user-menu switcher (logos are square icons, no text). */
export const DEMO_TENANTS: DemoTenant[] = [
  { id: "tenant-globaldrive", label: "Globaldrive", logoUrl: LOGO.globaldrive },
  { id: "tenant-lunnar-capital", label: "Lunnar Capital", logoUrl: LOGO.lunnarCapital },
  { id: "tenant-my-testing", label: "My Testing", logoUrl: LOGO.myTesting },
  { id: "tenant-oryxbms", label: "OryxBMS", logoUrl: LOGO.oryxbms },
  { id: "tenant-sharmax-by", label: "Sharmax Belarus", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-kz", label: "Sharmax Kazakhstan", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-mx", label: "Sharmax Mexico", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-om", label: "Sharmax Oman", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-qa", label: "Sharmax Qatar", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-sa", label: "Sharmax Saudi", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-es", label: "Sharmax Spain", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-ae", label: "Sharmax UAE", logoUrl: LOGO.sharmax },
  { id: "tenant-sharmax-uz", label: "Sharmax Uzbekistan", logoUrl: LOGO.sharmax },
];

export const DEFAULT_TENANT_ID = DEMO_TENANTS[0]?.id ?? "tenant-globaldrive";

export const getDemoTenantById = (id: string): DemoTenant | undefined =>
  DEMO_TENANTS.find((tenant) => tenant.id === id);
