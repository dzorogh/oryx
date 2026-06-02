export const COLLAB_ROOM = "oryx-pricelists";

export const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://127.0.0.1:1234";

export type CollabUser = {
  name: string;
  color: string;
};

const USER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const ADJECTIVES = ["Swift", "Calm", "Bright", "Bold", "Keen", "Lucky", "Quiet", "Brave"];
const ANIMALS = ["Otter", "Falcon", "Lynx", "Heron", "Bison", "Marten", "Ibex", "Crane"];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const createRandomUser = (): CollabUser => ({
  name: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`,
  color: pick(USER_COLORS),
});

const USER_STORAGE_KEY = "oryx-pricelists-user";
const TAB_ID_STORAGE_KEY = "oryx-pricelists-tab-id";

/** Drop awareness entries that miss a recent heartbeat (ms). */
export const PRESENCE_STALE_MS = 15_000;

export const PRESENCE_HEARTBEAT_MS = 5_000;

/**
 * One stable identity per browser tab. Stored in sessionStorage so reloading
 * the tab keeps the same user, while every new tab is a distinct user.
 */
export const getOrCreateUser = (): CollabUser => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return createRandomUser();
  }

  const stored = window.sessionStorage.getItem(USER_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<CollabUser>;
      if (typeof parsed.name === "string" && typeof parsed.color === "string") {
        return { name: parsed.name, color: parsed.color };
      }
    } catch {
      // Ignore malformed value and recreate below.
    }
  }

  const user = createRandomUser();
  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return user;
};

/** Stable id for this browser tab (survives reload, unique per tab). */
export const getOrCreateTabId = (): string => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return `tab-${Math.random().toString(36).slice(2, 11)}`;
  }

  const stored = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const tabId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2, 11)}`;
  window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId);
  return tabId;
};

export const getUserInitials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
