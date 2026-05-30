"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PULSE_QUICK_LINKS, PULSE_QUICK_LINKS_STORAGE_KEY } from "./defaults";
import { isValidQuickLinkHref, loadQuickLinksFromStorage } from "./normalize";
import type { PulseQuickLink, PulseQuickLinkPatch } from "./types";

const createLinkId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `quick-link-${Date.now()}`;
};

const reorderArray = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const usePulseQuickLinks = () => {
  const [links, setLinks] = useState<PulseQuickLink[]>(DEFAULT_PULSE_QUICK_LINKS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const nextLinks = loadQuickLinksFromStorage(window.localStorage.getItem(PULSE_QUICK_LINKS_STORAGE_KEY));
    setTimeout(() => {
      setLinks(nextLinks);
      setIsLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    window.localStorage.setItem(PULSE_QUICK_LINKS_STORAGE_KEY, JSON.stringify(links));
  }, [links, isLoading]);

  const addLink = useCallback((label: string, href: string): boolean => {
    const trimmedLabel = label.trim();
    const trimmedHref = href.trim();

    if (!trimmedLabel || !isValidQuickLinkHref(trimmedHref)) {
      return false;
    }

    setLinks((prev) => [...prev, { id: createLinkId(), label: trimmedLabel, href: trimmedHref }]);
    return true;
  }, []);

  const updateLink = useCallback((id: string, patch: PulseQuickLinkPatch): boolean => {
    const nextLabel = patch.label?.trim();
    const nextHref = patch.href?.trim();

    if (patch.label !== undefined && !nextLabel) {
      return false;
    }

    if (patch.href !== undefined && (!nextHref || !isValidQuickLinkHref(nextHref))) {
      return false;
    }

    setLinks((prev) =>
      prev.map((link) => {
        if (link.id !== id) {
          return link;
        }

        return {
          ...link,
          ...(nextLabel !== undefined ? { label: nextLabel } : {}),
          ...(nextHref !== undefined ? { href: nextHref } : {}),
        };
      }),
    );
    return true;
  }, []);

  const removeLink = useCallback((id: string): boolean => {
    let removed = false;

    setLinks((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      removed = true;
      return prev.filter((link) => link.id !== id);
    });

    return removed;
  }, []);

  const reorderLinks = useCallback((fromIndex: number, toIndex: number) => {
    setLinks((prev) => reorderArray(prev, fromIndex, toIndex));
  }, []);

  const resetToDefaults = useCallback(() => {
    setLinks(DEFAULT_PULSE_QUICK_LINKS.map((link) => ({ ...link })));
  }, []);

  return {
    links,
    isLoading,
    addLink,
    updateLink,
    removeLink,
    reorderLinks,
    resetToDefaults,
  };
};
