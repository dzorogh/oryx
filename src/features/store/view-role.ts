"use client";

import { useSyncExternalStore } from "react";

export type ViewRole = "manager" | "customer";

/** Demo customer tenants. The customer sees orders and picks regions of these tenants only. */
export const CUSTOMER_DEMO_TENANT_IDS = ["tenant-sharmax-ae", "tenant-sharmax-om"] as const;

const ROLE_STORAGE_KEY = "oryx:view-role";
const ROLE_CHANGE_EVENT = "oryx:view-role-change";

export const parseViewRole = (value: unknown): ViewRole =>
  value === "customer" ? "customer" : "manager";

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

const unknownRole = (): ViewRole | null => null;

export const writeViewRole = (role: ViewRole) => {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
};

/** Current demo role without visibility rules. */
export const useCurrentViewRole = (): ViewRole => useSyncExternalStore(subscribeRole, readRole, serverRole);

/** Null on the server and during hydration, until the stored role is read. */
export const useHydratedViewRole = (): ViewRole | null =>
  useSyncExternalStore<ViewRole | null>(subscribeRole, readRole, unknownRole);
