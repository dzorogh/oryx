import type { TodayTask } from "@/components/home/tasks-today-demo-data";

export type CalendarDateProperty = "deadline" | "createdAt" | "customDateField";
export type CalendarFirstDayOfWeek = "monday" | "sunday";

export type CalendarTask = TodayTask;

export type MonthGridDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};
