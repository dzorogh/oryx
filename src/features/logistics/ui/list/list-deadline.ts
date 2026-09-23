export const DEADLINE_BUCKETS = ["Просрочен", "Ближайшие 7 дней", "Позже", "Срок прошёл", "Без срока"] as const;

export const parseDeadlineTime = (expectedEndOn: string): number => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(expectedEndOn)) {
    return new Date(`${expectedEndOn}T00:00:00`).getTime();
  }
  return Date.parse(expectedEndOn);
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

export const deadlineFilterMatch = (
  expectedEndOn: string | null,
  filter: "all" | "overdue" | "week" | "none",
  isOpen: boolean,
) => {
  if (filter === "all") {
    return true;
  }
  if (filter === "none") {
    return !expectedEndOn;
  }
  if (!expectedEndOn) {
    return false;
  }
  const end = parseDeadlineTime(expectedEndOn);
  if (!Number.isFinite(end)) {
    return false;
  }
  const today = startOfToday();
  if (filter === "overdue") {
    return isOpen && end < today;
  }
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  return end >= today && end <= weekAhead.getTime();
};

export const deadlineGroupKey = (expectedEndOn: string | null, isOpen: boolean): string => {
  if (!expectedEndOn) {
    return "Без срока";
  }
  if (isOpen && parseDeadlineTime(expectedEndOn) < startOfToday()) {
    return "Просрочен";
  }
  const end = parseDeadlineTime(expectedEndOn);
  if (Number.isFinite(end) && !isOpen && end < startOfToday()) {
    return "Срок прошёл";
  }
  return deadlineFilterMatch(expectedEndOn, "week", isOpen) ? "Ближайшие 7 дней" : "Позже";
};
