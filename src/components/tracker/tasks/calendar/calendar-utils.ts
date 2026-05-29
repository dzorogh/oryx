import type { CalendarDateProperty, CalendarFirstDayOfWeek, CalendarTask, MonthGridDay } from "./calendar-types";

const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (value: number) => String(value).padStart(2, "0");

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const addDays = (date: Date, offset: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + offset);
  return nextDate;
};

const resolveDateFieldIso = (task: CalendarTask, dateProperty: CalendarDateProperty, customFieldId: string) => {
  if (dateProperty === "deadline") {
    return task.deadlineAt;
  }

  if (dateProperty === "createdAt") {
    return task.createdAt;
  }

  return task.customDateFields[customFieldId];
};

export const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const formatTime = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

export const formatDeadlineLabel = (isoDate: string, now = new Date()) => {
  const date = new Date(isoDate);
  const startOfTarget = startOfDay(date);
  const startOfToday = startOfDay(now);
  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffMs / DAY_MS);
  const time = formatTime(date);

  if (diffDays === 0) {
    return `Сегодня, ${time}`;
  }

  if (diffDays === 1) {
    return `Завтра, ${time}`;
  }

  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}, ${time}`;
};

export const resolveTaskDate = (task: CalendarTask, dateProperty: CalendarDateProperty, customFieldId: string) => {
  const iso = resolveDateFieldIso(task, dateProperty, customFieldId);

  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildMonthGrid = (monthDate: Date, firstDayOfWeek: CalendarFirstDayOfWeek): MonthGridDay[] => {
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const weekStart = firstDayOfWeek === "monday" ? 1 : 0;
  const offset = (firstDayOfMonth.getDay() - weekStart + 7) % 7;
  const gridStart = addDays(firstDayOfMonth, -offset);
  const todayKey = formatDateKey(new Date());
  const totalDays = 42;

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      dateKey: formatDateKey(date),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
      isToday: formatDateKey(date) === todayKey,
    };
  });
};

export const getWeekdayLabels = (firstDayOfWeek: CalendarFirstDayOfWeek) => {
  const base = firstDayOfWeek === "monday"
    ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
    : ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  return base;
};

export const applyDateKeepingTime = (
  sourceIso: string,
  targetDate: Date,
) => {
  const sourceDate = new Date(sourceIso);
  const nextDate = new Date(targetDate);
  nextDate.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
  return nextDate.toISOString();
};

export const applyTimeToIso = (sourceIso: string, hour: number, minute: number) => {
  const nextDate = new Date(sourceIso);
  nextDate.setHours(hour, minute, 0, 0);
  return nextDate.toISOString();
};

export const parseTimeInput = (rawValue: string) => {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^\d]/g, "");

  if (!digits) {
    return null;
  }

  let hour = 0;
  let minute = 0;

  if (value.includes(":")) {
    const [rawHour = "", rawMinute = "0"] = value.split(":");
    hour = Number(rawHour);
    minute = Number(rawMinute);
  } else if (digits.length <= 2) {
    hour = Number(digits);
    minute = 0;
  } else if (digits.length === 3) {
    hour = Number(digits.slice(0, 1));
    minute = Number(digits.slice(1));
  } else {
    hour = Number(digits.slice(0, 2));
    minute = Number(digits.slice(2, 4));
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return {
    hour,
    minute,
    normalized: `${pad2(hour)}:${pad2(minute)}`,
  };
};

export const sortTasksByTime = (tasks: CalendarTask[], dateProperty: CalendarDateProperty, customFieldId: string) =>
  [...tasks].sort((leftTask, rightTask) => {
    const leftDate = resolveTaskDate(leftTask, dateProperty, customFieldId);
    const rightDate = resolveTaskDate(rightTask, dateProperty, customFieldId);

    if (!leftDate && !rightDate) {
      return leftTask.title.localeCompare(rightTask.title, "ru");
    }

    if (!leftDate) {
      return 1;
    }

    if (!rightDate) {
      return -1;
    }

    return leftDate.getTime() - rightDate.getTime();
  });
