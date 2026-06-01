import type { StaticImageData } from "next/image";

import ace1000Photo from "./ace-1000-photo.jpg";
import ace700Photo from "./ace-700-photo.jpg";
import cross300Photo from "./cross-300-photo.jpg";
import cross450Photo from "./cross-450-photo.jpg";
import crossE250Photo from "./cross-e250-photo.jpg";
import force1000Photo from "./force-1000-photo.jpg";
import force650Photo from "./force-650-photo.jpg";
import force750Photo from "./force-750-photo.jpg";
import gp300Photo from "./gp-300-photo.jpg";
import gp450Photo from "./gp-450-photo.jpg";
import gp650Photo from "./gp-650-photo.jpg";
import rst520Photo from "./rst-520-photo.jpg";
import rst620Photo from "./rst-620-photo.jpg";
import sprint200Photo from "./sprint-200-photo.jpg";
import urban180Photo from "./urban-180-photo.jpg";

export const STORE_DEMO_IMAGES = {
  ace1000Photo,
  ace700Photo,
  cross300Photo,
  cross450Photo,
  crossE250Photo,
  force1000Photo,
  force650Photo,
  force750Photo,
  gp300Photo,
  gp450Photo,
  gp650Photo,
  rst520Photo,
  rst620Photo,
  sprint200Photo,
  urban180Photo,
} as const satisfies Record<string, StaticImageData>;

/** All store demo photos (for product galleries). */
export const STORE_DEMO_IMAGE_LIST: StaticImageData[] = Object.values(STORE_DEMO_IMAGES);
