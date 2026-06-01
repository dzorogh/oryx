import type { StaticImageData } from "next/image";

import de from "./de.svg";
import en from "./en.svg";
import es from "./es.svg";
import ru from "./ru.svg";

export const LANGUAGE_FLAGS = {
  de,
  en,
  es,
  ru,
} as const satisfies Record<string, StaticImageData>;

export type LanguageFlagAsset = (typeof LANGUAGE_FLAGS)[keyof typeof LANGUAGE_FLAGS];
