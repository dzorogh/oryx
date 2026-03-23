export type TaskPriority = "high" | "medium" | "low";

export type TodayTask = {
  id: string;
  /** Дедлайн сегодня — время окончания */
  deadlineLabel: string;
  priority: TaskPriority;
  title: string;
  projectName: string;
  comments: number;
};

export const TODAY_TASKS: TodayTask[] = [
  {
    id: "task-1",
    deadlineLabel: "Сегодня, 12:00",
    priority: "high",
    title: "Согласовать спецификацию по контейнеру",
    projectName: "PIM · Заказ №59",
    comments: 5,
  },
  {
    id: "task-2",
    deadlineLabel: "Сегодня, 15:30",
    priority: "medium",
    title: "Проверить расчёт упаковки перед отгрузкой",
    projectName: "Логистика · Склад Восток",
    comments: 12,
  },
  {
    id: "task-3",
    deadlineLabel: "Сегодня, 17:00",
    priority: "high",
    title: "Обновить статус заявки в Service Desk",
    projectName: "IT · Service Desk",
    comments: 3,
  },
  {
    id: "task-4",
    deadlineLabel: "Сегодня, 18:00",
    priority: "low",
    title: "Подготовить краткий отчёт по SLA за неделю",
    projectName: "HR · Онбординг",
    comments: 0,
  },
];
