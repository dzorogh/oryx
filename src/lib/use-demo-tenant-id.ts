"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TENANT_ID, DEMO_TENANTS } from "@/lib/demo-tenants";

export const DEMO_TENANT_STORAGE_KEY = "tenant-id";

const readTenantId = (): string => {
  if (typeof window === "undefined") {
    return DEFAULT_TENANT_ID;
  }

  const raw = window.localStorage.getItem(DEMO_TENANT_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_TENANT_ID;
  }

  const exists = DEMO_TENANTS.some((tenant) => tenant.id === raw);
  return exists ? raw : DEFAULT_TENANT_ID;
};

/** Keeps company workspace in sync with the user-menu tenant switcher. */
export const useDemoTenantId = (): string => {
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT_ID);

  useEffect(() => {
    const sync = () => setTenantId(readTenantId());
    sync();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DEMO_TENANT_STORAGE_KEY) {
        sync();
      }
    };

    const handleCustom = () => sync();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("oryx:tenant-id-change", handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("oryx:tenant-id-change", handleCustom);
    };
  }, []);

  return tenantId;
};
