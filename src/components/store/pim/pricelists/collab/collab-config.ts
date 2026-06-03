export const COLLAB_ROOM = "oryx-pricelists";

export const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://127.0.0.1:1234";

export type CollabUser = {
  name: string;
  color: string;
  /** Portrait avatar (deterministic per identity). */
  avatarUrl: string;
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

/** Deterministic portrait avatar for a presence identity. */
export const getUserAvatarUrl = (seed: string): string =>
  `https://i.pravatar.cc/64?u=${encodeURIComponent(seed)}`;

const createRandomUser = (): CollabUser => {
  const name = `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
  // Unique seed so two tabs that happen to pick the same name still differ.
  const seed = `${name}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    name,
    color: pick(USER_COLORS),
    avatarUrl: getUserAvatarUrl(seed),
  };
};

const USER_STORAGE_KEY = "oryx-pricelists-user";
const TAB_ID_STORAGE_KEY = "oryx-pricelists-tab-id";

/** Drop awareness entries that miss a recent heartbeat (ms). */
export const PRESENCE_STALE_MS = 15_000;

export const PRESENCE_HEARTBEAT_MS = 5_000;

/** Coalesce rapid editing-presence changes (focus/blur, select open/close). */
export const PRESENCE_DEBOUNCE_MS = 100;

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
        const avatarUrl =
          typeof parsed.avatarUrl === "string" && parsed.avatarUrl.length > 0
            ? parsed.avatarUrl
            : getUserAvatarUrl(parsed.name);
        return { name: parsed.name, color: parsed.color, avatarUrl };
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
