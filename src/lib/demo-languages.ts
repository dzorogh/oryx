import type { StaticImageData } from "next/image";

import { LANGUAGE_FLAGS } from "@/assets/languages/flags";

export type DemoLanguage = {
  id: string;
  label: string;
  flag: StaticImageData;
};

/** Demo languages for the user-menu switcher (square flag icons). */
export const DEMO_LANGUAGES: DemoLanguage[] = [
  { id: "en", label: "English", flag: LANGUAGE_FLAGS.en },
  { id: "ru", label: "Русский", flag: LANGUAGE_FLAGS.ru },
  { id: "es", label: "Español", flag: LANGUAGE_FLAGS.es },
  { id: "de", label: "Deutsch", flag: LANGUAGE_FLAGS.de },
];

export const DEFAULT_LANGUAGE_ID = DEMO_LANGUAGES[0]?.id ?? "en";
