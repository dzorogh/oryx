import type { StaticImageData } from "next/image";

import globaldrive from "./globaldrive.png";
import lunnarCapital from "./lunnar-capital.png";
import myTesting from "./my-testing.svg";
import oryxbms from "./oryxbms.png";
import sharmax from "./sharmax.png";

export const TENANT_LOGOS = {
  globaldrive,
  lunnarCapital,
  myTesting,
  oryxbms,
  sharmax,
} as const satisfies Record<string, StaticImageData>;

export type TenantLogoAsset = (typeof TENANT_LOGOS)[keyof typeof TENANT_LOGOS];
