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

/** Полный демо-список для страницы «Все задачи» (включает задачи на сегодня). */
export const ALL_TASKS: TodayTask[] = [
  ...TODAY_TASKS,
  {
    id: "task-5",
    deadlineLabel: "Сегодня, 19:30",
    priority: "medium",
    title: "Согласовать макет упаковки с клиентом",
    projectName: "PIM · Заказ №62",
    comments: 2,
  },
  {
    id: "task-6",
    deadlineLabel: "Завтра, 09:00",
    priority: "low",
    title: "Обновить инструкцию по приёмке на складе",
    projectName: "Логистика · Процессы",
    comments: 7,
  },
  {
    id: "task-7",
    deadlineLabel: "Завтра, 11:00",
    priority: "high",
    title: "Провести ревью рисков по поставке",
    projectName: "Закупки · Контракты",
    comments: 1,
  },
  {
    id: "task-8",
    deadlineLabel: "Завтра, 14:00",
    priority: "medium",
    title: "Заполнить чек-лист перед релизом",
    projectName: "IT · Релизы",
    comments: 4,
  },
];
