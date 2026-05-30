export type DemoLanguage = {
  id: string;
  label: string;
  flagUrl: string;
};

const FLAG = {
  en: "/languages/flags/en.svg",
  ru: "/languages/flags/ru.svg",
  es: "/languages/flags/es.svg",
  de: "/languages/flags/de.svg",
} as const;

/** Demo languages for the user-menu switcher (square flag icons). */
export const DEMO_LANGUAGES: DemoLanguage[] = [
  { id: "en", label: "English", flagUrl: FLAG.en },
  { id: "ru", label: "Русский", flagUrl: FLAG.ru },
  { id: "es", label: "Español", flagUrl: FLAG.es },
  { id: "de", label: "Deutsch", flagUrl: FLAG.de },
];

export const DEFAULT_LANGUAGE_ID = DEMO_LANGUAGES[0]?.id ?? "en";
