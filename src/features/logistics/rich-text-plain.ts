const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export const isRichTextHtml = (value: string): boolean => /<[a-z][^>]*>/i.test(value);

export const richTextToPlain = (value: string | null | undefined): string => {
  if (!value) return "";
  if (!isRichTextHtml(value)) return value.trim();
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
};
