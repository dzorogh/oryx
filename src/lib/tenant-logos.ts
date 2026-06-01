import type { StaticImageData } from "next/image";

import globaldrive from "../../public/tenants/logos/globaldrive.png";
import lunnarCapital from "../../public/tenants/logos/lunnar-capital.png";
import myTesting from "../../public/tenants/logos/my-testing.svg";
import oryxbms from "../../public/tenants/logos/oryxbms.png";
import sharmax from "../../public/tenants/logos/sharmax.png";

/** Tenant logo assets (static import — basePath applied at build time). */
export const TENANT_LOGOS = {
  globaldrive,
  lunnarCapital,
  myTesting,
  oryxbms,
  sharmax,
} as const satisfies Record<string, StaticImageData>;

export type TenantLogoAsset = (typeof TENANT_LOGOS)[keyof typeof TENANT_LOGOS];
