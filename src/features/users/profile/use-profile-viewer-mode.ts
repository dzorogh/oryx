"use client";

import { useEffect, useState } from "react";

export type ProfileViewerMode = "self" | "admin" | "manager" | "other";

export const PROFILE_VIEWER_MODE_STORAGE_KEY = "oryx:profile-viewer-mode";

export const PROFILE_VIEWER_MODE_CHANGE_EVENT = "oryx:profile-viewer-mode-change";

const MODES: ProfileViewerMode[] = ["self", "admin", "manager", "other"];

const readMode = (): ProfileViewerMode => {
  if (typeof window === "undefined") {
    return "self";
  }
  const raw = window.localStorage.getItem(PROFILE_VIEWER_MODE_STORAGE_KEY);
  if (raw && MODES.includes(raw as ProfileViewerMode)) {
    return raw as ProfileViewerMode;
  }
  return "self";
};

export const setProfileViewerMode = (mode: ProfileViewerMode): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(PROFILE_VIEWER_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(PROFILE_VIEWER_MODE_CHANGE_EVENT));
};

export const useProfileViewerMode = (): [ProfileViewerMode, (mode: ProfileViewerMode) => void] => {
  const [mode, setMode] = useState<ProfileViewerMode>("self");

  useEffect(() => {
    const sync = () => setMode(readMode());
    sync();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PROFILE_VIEWER_MODE_STORAGE_KEY) {
        sync();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(PROFILE_VIEWER_MODE_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PROFILE_VIEWER_MODE_CHANGE_EVENT, sync);
    };
  }, []);

  const handleSet = (next: ProfileViewerMode) => {
    setProfileViewerMode(next);
    setMode(next);
  };

  return [mode, handleSet];
};
