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

export type RoleVisibilityState = {
  role: ViewRole;
  setRole: (role: ViewRole) => void;
  rules: RoleVisibilityRule[];
  isLoading: boolean;
  error: string | null;
};

type LoadedRules = { page: string; rules: RoleVisibilityRule[]; error: string | null };

export const useViewRole = (page: string): RoleVisibilityState => {
  const role = useSyncExternalStore(subscribeRole, readRole, serverRole);
  const [loaded, setLoaded] = useState<LoadedRules | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRoleVisibility(page)
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

  const current = loaded?.page === page ? loaded : null;
  return {
    role,
    setRole,
    rules: current?.rules ?? [],
    isLoading: current == null,
    error: current?.error ?? null,
  };
};
