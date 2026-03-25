export const MOBILE_ASIDE_OPEN_EVENT = "mobile-aside:open" as const;

export const openMobileAside = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(MOBILE_ASIDE_OPEN_EVENT));
};

