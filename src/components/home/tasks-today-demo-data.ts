export type TaskPriority = "high" | "medium" | "low";
export type TaskColor = "red" | "orange" | "blue" | "violet" | "emerald" | "pink";

export type TaskDateProperty = "deadline" | "createdAt" | "customDateField";

export type TodayTask = {
  id: string;
  /** Текст дедлайна для карточек в старом списке задач. */
  deadlineLabel: string;
  /** Дедлайн задачи в ISO-формате. */
  deadlineAt: string;
  /** Дата создания задачи в ISO-формате. */
  createdAt: string;
  /** Кастомные поля даты. Пока используем задел для календарной настройки. */
  customDateFields: Record<string, string>;
  color: TaskColor;
  priority: TaskPriority;
  title: string;
  projectName: string;
  comments: number;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const addDays = (baseDate: Date, offset: number) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offset);
  return date;
};

const buildDateTime = (baseDate: Date, dayOffset: number, hour: number, minute: number) => {
  const date = addDays(baseDate, dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const formatDeadlineLabel = (isoDate: string, now: Date) => {
  const date = new Date(isoDate);
  const startOfTarget = new Date(date);
  startOfTarget.setHours(0, 0, 0, 0);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const diffMs = startOfTarget.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  if (diffDays === 0) {
    return `Сегодня, ${time}`;
  }

  if (diffDays === 1) {
    return `Завтра, ${time}`;
  }

  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}, ${time}`;
};

/**
 * Фиксированная точка времени для demo-данных.
 * Нужна, чтобы SSR/CSR генерировали одинаковый HTML и не ломали hydration.
 */
const DEMO_REFERENCE_NOW = new Date("2026-04-19T09:00:00.000Z");

const createTask = (config: {
  id: string;
  title: string;
  projectName: string;
  priority: TaskPriority;
  comments: number;
  color: TaskColor;
  deadlineOffsetDays: number;
  deadlineHour: number;
  deadlineMinute: number;
  createdOffsetDays: number;
  createdHour: number;
  createdMinute: number;
  customPlanningOffsetDays?: number;
}) => {
  const deadlineAt = buildDateTime(
    DEMO_REFERENCE_NOW,
    config.deadlineOffsetDays,
    config.deadlineHour,
    config.deadlineMinute,
  );
  const createdAt = buildDateTime(
    DEMO_REFERENCE_NOW,
    config.createdOffsetDays,
    config.createdHour,
    config.createdMinute,
  );
  const planningDate = buildDateTime(
    DEMO_REFERENCE_NOW,
    config.customPlanningOffsetDays ?? config.deadlineOffsetDays,
    config.deadlineHour,
    config.deadlineMinute,
  );

  return {
    id: config.id,
    title: config.title,
    projectName: config.projectName,
    priority: config.priority,
    comments: config.comments,
    color: config.color,
    deadlineAt,
    createdAt,
    customDateFields: {
      planningDate,
    },
    deadlineLabel: formatDeadlineLabel(deadlineAt, DEMO_REFERENCE_NOW),
  } satisfies TodayTask;
};

export const TODAY_TASKS: TodayTask[] = [
  createTask({
    id: "task-1",
    title: "Согласовать спецификацию по контейнеру",
    projectName: "PIM · Заказ №59",
    priority: "high",
    comments: 5,
    color: "red",
    deadlineOffsetDays: 0,
    deadlineHour: 12,
    deadlineMinute: 0,
    createdOffsetDays: -2,
    createdHour: 10,
    createdMinute: 10,
    customPlanningOffsetDays: 1,
  }),
  createTask({
    id: "task-2",
    title: "Проверить расчёт упаковки перед отгрузкой",
    projectName: "Логистика · Склад Восток",
    priority: "medium",
    comments: 12,
    color: "orange",
    deadlineOffsetDays: 0,
    deadlineHour: 15,
    deadlineMinute: 30,
    createdOffsetDays: -3,
    createdHour: 9,
    createdMinute: 20,
    customPlanningOffsetDays: 2,
  }),
  createTask({
    id: "task-3",
    title: "Обновить статус заявки в Service Desk",
    projectName: "IT · Service Desk",
    priority: "high",
    comments: 3,
    color: "violet",
    deadlineOffsetDays: 0,
    deadlineHour: 17,
    deadlineMinute: 0,
    createdOffsetDays: -1,
    createdHour: 14,
    createdMinute: 45,
    customPlanningOffsetDays: 0,
  }),
  createTask({
    id: "task-4",
    title: "Подготовить краткий отчёт по SLA за неделю",
    projectName: "HR · Онбординг",
    priority: "low",
    comments: 0,
    color: "blue",
    deadlineOffsetDays: 0,
    deadlineHour: 18,
    deadlineMinute: 0,
    createdOffsetDays: -4,
    createdHour: 11,
    createdMinute: 0,
    customPlanningOffsetDays: 3,
  }),
  createTask({
    id: "task-101",
    title: "Подтвердить окно доставки с курьерской службой",
    projectName: "Operations · Last Mile",
    priority: "medium",
    comments: 4,
    color: "orange",
    deadlineOffsetDays: 0,
    deadlineHour: 19,
    deadlineMinute: 15,
    createdOffsetDays: -2,
    createdHour: 13,
    createdMinute: 10,
    customPlanningOffsetDays: 0,
  }),
  createTask({
    id: "task-102",
    title: "Сверить остатки по SKU перед инвентаризацией",
    projectName: "Склад · Инвентаризация",
    priority: "high",
    comments: 6,
    color: "red",
    deadlineOffsetDays: 0,
    deadlineHour: 20,
    deadlineMinute: 0,
    createdOffsetDays: -1,
    createdHour: 16,
    createdMinute: 35,
    customPlanningOffsetDays: 1,
  }),
];

/** Полный демо-список для страницы «Все задачи» (включает задачи на сегодня). */
export const ALL_TASKS: TodayTask[] = [
  ...TODAY_TASKS,
  createTask({
    id: "task-5",
    title: "Согласовать макет упаковки с клиентом",
    projectName: "PIM · Заказ №62",
    priority: "medium",
    comments: 2,
    color: "pink",
    deadlineOffsetDays: 0,
    deadlineHour: 19,
    deadlineMinute: 30,
    createdOffsetDays: -2,
    createdHour: 8,
    createdMinute: 40,
    customPlanningOffsetDays: 0,
  }),
  createTask({
    id: "task-6",
    title: "Обновить инструкцию по приёмке на складе",
    projectName: "Логистика · Процессы",
    priority: "low",
    comments: 7,
    color: "emerald",
    deadlineOffsetDays: 1,
    deadlineHour: 9,
    deadlineMinute: 0,
    createdOffsetDays: -5,
    createdHour: 16,
    createdMinute: 20,
    customPlanningOffsetDays: 4,
  }),
  createTask({
    id: "task-7",
    title: "Провести ревью рисков по поставке",
    projectName: "Закупки · Контракты",
    priority: "high",
    comments: 1,
    color: "red",
    deadlineOffsetDays: 1,
    deadlineHour: 11,
    deadlineMinute: 0,
    createdOffsetDays: -1,
    createdHour: 9,
    createdMinute: 10,
    customPlanningOffsetDays: 1,
  }),
  createTask({
    id: "task-8",
    title: "Заполнить чек-лист перед релизом",
    projectName: "IT · Релизы",
    priority: "medium",
    comments: 4,
    color: "orange",
    deadlineOffsetDays: 1,
    deadlineHour: 14,
    deadlineMinute: 0,
    createdOffsetDays: -3,
    createdHour: 12,
    createdMinute: 0,
    customPlanningOffsetDays: 5,
  }),
  createTask({
    id: "task-9",
    title: "Обновить калькуляцию затрат на упаковку",
    projectName: "Finance · Контроль затрат",
    priority: "medium",
    comments: 6,
    color: "blue",
    deadlineOffsetDays: 3,
    deadlineHour: 10,
    deadlineMinute: 30,
    createdOffsetDays: -6,
    createdHour: 13,
    createdMinute: 5,
    customPlanningOffsetDays: 7,
  }),
  createTask({
    id: "task-10",
    title: "Синхронизировать план отгрузок с 3PL",
    projectName: "Operations · Поставки",
    priority: "high",
    comments: 9,
    color: "violet",
    deadlineOffsetDays: 3,
    deadlineHour: 13,
    deadlineMinute: 45,
    createdOffsetDays: -2,
    createdHour: 15,
    createdMinute: 30,
    customPlanningOffsetDays: 3,
  }),
  createTask({
    id: "task-11",
    title: "Подготовить QA чек-лист для клиентского демо",
    projectName: "Product · QA",
    priority: "low",
    comments: 1,
    color: "emerald",
    deadlineOffsetDays: 3,
    deadlineHour: 16,
    deadlineMinute: 0,
    createdOffsetDays: -4,
    createdHour: 11,
    createdMinute: 15,
    customPlanningOffsetDays: 2,
  }),
  createTask({
    id: "task-12",
    title: "Собрать обратную связь по новой форме заявки",
    projectName: "CX · Support",
    priority: "medium",
    comments: 8,
    color: "pink",
    deadlineOffsetDays: 3,
    deadlineHour: 18,
    deadlineMinute: 15,
    createdOffsetDays: -7,
    createdHour: 10,
    createdMinute: 0,
    customPlanningOffsetDays: 9,
  }),
  createTask({
    id: "task-13",
    title: "Проверить соответствие SLA по ночным инцидентам",
    projectName: "IT · Monitoring",
    priority: "high",
    comments: 2,
    color: "red",
    deadlineOffsetDays: 7,
    deadlineHour: 9,
    deadlineMinute: 30,
    createdOffsetDays: -1,
    createdHour: 17,
    createdMinute: 50,
    customPlanningOffsetDays: 10,
  }),
  createTask({
    id: "task-14",
    title: "Подготовить материалы к ретро команды",
    projectName: "Agile · Team Ops",
    priority: "low",
    comments: 0,
    color: "blue",
    deadlineOffsetDays: 10,
    deadlineHour: 15,
    deadlineMinute: 0,
    createdOffsetDays: -9,
    createdHour: 9,
    createdMinute: 0,
    customPlanningOffsetDays: 12,
  }),
];
