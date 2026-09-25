const KEY = "oryx-dialog-highlight";
const HIGHLIGHT_MS = 4000;

export type HighlightMark = {
  documentId: string;
  lineIds: string[];
  at: number;
};

export const markHighlightedRows = (documentId: string, lineIds: string[]) => {
  if (typeof sessionStorage === "undefined" || !documentId || lineIds.length === 0) return;
  const mark: HighlightMark = { documentId, lineIds, at: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(mark));
};

export const takeHighlightedRows = (documentId: string): string[] => {
  if (typeof sessionStorage === "undefined") return [];
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<HighlightMark>;
    const lineIds = Array.isArray(parsed.lineIds)
      ? parsed.lineIds.filter((item): item is string => typeof item === "string")
      : [];
    const fresh = typeof parsed.at === "number" && Date.now() - parsed.at < HIGHLIGHT_MS;
    if (parsed.documentId !== documentId || !fresh) return [];
    sessionStorage.removeItem(KEY);
    return lineIds;
  } catch {
    sessionStorage.removeItem(KEY);
    return [];
  }
};

export const HIGHLIGHT_ROW_CLASS = "bg-amber-100 dark:bg-amber-900/40";
