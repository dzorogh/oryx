import type { PulseQuickLink } from "./types";

export const PULSE_QUICK_LINKS_STORAGE_KEY = "pulse-quick-links-v1";

export const DEFAULT_PULSE_QUICK_LINKS: PulseQuickLink[] = [
  { id: "tasks", label: "Мои задачи", href: "/tracker/tasks" },
  { id: "profile", label: "Мой профиль", href: "/team/users/1" },
  { id: "checklists", label: "Мои чеклисты", href: "/tracker/checklists" },
  { id: "notes", label: "Мои заметки", href: "/tracker/notes" },
  { id: "regulations", label: "Регламенты", href: "/library/documents" },
];
