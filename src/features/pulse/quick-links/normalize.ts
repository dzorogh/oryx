import { z } from "zod";
import { DEFAULT_PULSE_QUICK_LINKS } from "./defaults";
import type { PulseQuickLink } from "./types";

const BLOCKED_HREF_PATTERN = /^(javascript|data|vbscript):/i;

const isAllowedExternalHref = (href: string): boolean => {
  try {
    const url = new URL(href);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:" ||
      url.protocol === "tel:"
    );
  } catch {
    return false;
  }
};

export const isValidQuickLinkHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (!trimmed || BLOCKED_HREF_PATTERN.test(trimmed) || trimmed.startsWith("//")) {
    return false;
  }

  if (trimmed.startsWith("/")) {
    return true;
  }

  return isAllowedExternalHref(trimmed);
};

export const isExternalQuickLinkHref = (href: string): boolean => {
  const trimmed = href.trim();
  return !trimmed.startsWith("/") && isAllowedExternalHref(trimmed);
};

const quickLinkHrefSchema = z
  .string()
  .trim()
  .refine((value) => isValidQuickLinkHref(value), {
    message: "Href must be an internal path or a safe external URL",
  });

export const pulseQuickLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
  href: quickLinkHrefSchema,
});

const pulseQuickLinksSchema = z.array(pulseQuickLinkSchema);

export const normalizeQuickLinks = (input: unknown): PulseQuickLink[] => {
  const parsed = pulseQuickLinksSchema.safeParse(input);
  if (!parsed.success || parsed.data.length === 0) {
    return DEFAULT_PULSE_QUICK_LINKS.map((link) => ({ ...link }));
  }
  return parsed.data;
};

export const loadQuickLinksFromStorage = (raw: string | null): PulseQuickLink[] => {
  if (!raw) {
    return DEFAULT_PULSE_QUICK_LINKS.map((link) => ({ ...link }));
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeQuickLinks(parsed);
  } catch {
    return DEFAULT_PULSE_QUICK_LINKS.map((link) => ({ ...link }));
  }
};
