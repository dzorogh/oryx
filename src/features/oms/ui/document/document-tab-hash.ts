/** Tab id from a location hash (`#movements` or `#co:movements`); null when it names no known tab. */
export const tabIdFromHash = (hash: string, tabIds: readonly string[]): string | null => {
  const raw = hash.replace(/^#/, "");
  if (!raw) {
    return null;
  }
  const id = raw.includes(":") ? (raw.split(":").pop() ?? "") : raw;
  return tabIds.includes(id) ? id : null;
};

/** Opens a `DocumentTabs` tab on the page through the hash (`DocumentTabs` listens to `hashchange`). */
export const openDocumentTab = (id: string) => {
  window.location.hash = id;
};
