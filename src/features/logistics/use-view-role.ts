"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { loadRoleVisibility } from "@/features/logistics/logistics-api";
import { parseViewRole, type RoleVisibilityRule, type ViewRole } from "@/features/logistics/order-view-role";

const ROLE_STORAGE_KEY = "oryx:view-role";
const ROLE_CHANGE_EVENT = "oryx:view-role-change";

const subscribeRole = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(ROLE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(ROLE_CHANGE_EVENT, onChange);
  };
};

const readRole = (): ViewRole => parseViewRole(window.localStorage.getItem(ROLE_STORAGE_KEY));

const serverRole = (): ViewRole => "manager";

const NO_RULES: RoleVisibilityRule[] = [];

const rulesRequests = new Map<string, Promise<RoleVisibilityRule[]>>();

/** One request per page while the tab lives; a failed request is retried on the next mount. */
const loadRulesOnce = (page: string): Promise<RoleVisibilityRule[]> => {
  const cached = rulesRequests.get(page);
  if (cached) return cached;
  const request = loadRoleVisibility(page).catch((caught: unknown) => {
    rulesRequests.delete(page);
    throw caught;
  });
  rulesRequests.set(page, request);
  return request;
};

export type RoleVisibilityState = {
  role: ViewRole;
  setRole: (role: ViewRole) => void;
  rules: RoleVisibilityRule[];
  isLoading: boolean;
  error: string | null;
};

type LoadedRules = { page: string; rules: RoleVisibilityRule[]; error: string | null };

/** Current demo role without visibility rules. */
export const useCurrentViewRole = (): ViewRole => useSyncExternalStore(subscribeRole, readRole, serverRole);

const unknownRole = (): ViewRole | null => null;

/** Null on the server and during hydration, until the stored role is read. */
export const useHydratedViewRole = (): ViewRole | null =>
  useSyncExternalStore<ViewRole | null>(subscribeRole, readRole, unknownRole);

/** `page` is `store_role_visibility.page`; null means the page has no rules. */
export const useViewRole = (page: string | null): RoleVisibilityState => {
  const role = useCurrentViewRole();
  const [loaded, setLoaded] = useState<LoadedRules | null>(null);

  useEffect(() => {
    if (!page) return;
    let cancelled = false;
    loadRulesOnce(page)
      .then((rules) => {
        if (!cancelled) setLoaded({ page, rules, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setLoaded({
          page,
          rules: [],
          error: caught instanceof Error ? caught.message : "Не удалось загрузить настройки видимости",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const setRole = useCallback((next: ViewRole) => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
  }, []);

  if (!page) {
    return { role, setRole, rules: NO_RULES, isLoading: false, error: null };
  }

  const current = loaded?.page === page ? loaded : null;
  return {
    role,
    setRole,
    rules: current?.rules ?? NO_RULES,
    isLoading: current == null,
    error: current?.error ?? null,
  };
};
