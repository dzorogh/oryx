"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "sidebar-aside-collapsed";
/** Атрибут на <html>, который инлайн-скрипт выставляет до первой отрисовки (см. app/layout.tsx). */
const COLLAPSED_ATTRIBUTE = "data-sidebar-collapsed";

type SidebarAsideContextValue = {
  /** Свёрнута ли боковая панель модуля. */
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  toggleCollapsed: () => void;
};

const FALLBACK_CONTEXT: SidebarAsideContextValue = {
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
};

const SidebarAsideContext = createContext<SidebarAsideContextValue | null>(null);

const readInitialCollapsed = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return document.documentElement.getAttribute(COLLAPSED_ATTRIBUTE) === "true";
};

const applyCollapsed = (next: boolean) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(COLLAPSED_ATTRIBUTE, String(next));
  }

  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  if (storage && typeof storage.setItem === "function") {
    storage.setItem(STORAGE_KEY, String(next));
  }
};

type SidebarAsideProviderProps = {
  children: ReactNode;
};

export const SidebarAsideProvider = ({ children }: SidebarAsideProviderProps) => {
  // Начальное состояние читаем из атрибута, который инлайн-скрипт уже выставил
  // синхронно до гидрации — это исключает мигание при загрузке страницы.
  const [collapsed, setCollapsedState] = useState(readInitialCollapsed);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    applyCollapsed(next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      applyCollapsed(next);
      return next;
    });
  }, []);

  const value = useMemo<SidebarAsideContextValue>(
    () => ({ collapsed, setCollapsed, toggleCollapsed }),
    [collapsed, setCollapsed, toggleCollapsed],
  );

  return <SidebarAsideContext.Provider value={value}>{children}</SidebarAsideContext.Provider>;
};

export const useSidebarAside = (): SidebarAsideContextValue => useContext(SidebarAsideContext) ?? FALLBACK_CONTEXT;
