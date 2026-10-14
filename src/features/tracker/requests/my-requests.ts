import type { SubmittedFieldValue } from "@/features/tracker/requests/request-forms";

export type MyRequestStatus = "new" | "approval" | "progress" | "waiting" | "done" | "rejected";

export type MyRequestEvent =
  | { kind: "system"; id: string; text: string }
  | { kind: "comment"; id: string; author: string | null; at: string; text: string };

export type MyRequest = {
  id: string;
  number: string;
  typeId: string;
  title: string;
  status: MyRequestStatus;
  createdAt: string;
  dueAt: string | null;
  assignee: string;
  updatedAt: string;
  unread: boolean;
  waitingNote?: string;
  data: SubmittedFieldValue[];
  events: MyRequestEvent[];
};

export type MyRequestsFilter = "active" | "closed" | "all";

export const MY_REQUESTS_FILTERS: { id: MyRequestsFilter; label: string }[] = [
  { id: "active", label: "Активные" },
  { id: "closed", label: "Завершённые" },
  { id: "all", label: "Все" },
];

export const REQUEST_STATUS_LABELS: Record<MyRequestStatus, string> = {
  new: "Новая",
  approval: "На согласовании",
  progress: "В работе",
  waiting: "Ждёт вашего ответа",
  done: "Решена",
  rejected: "Отклонена",
};

export const REQUEST_STATUS_SHORT_LABELS: Record<MyRequestStatus, string> = {
  ...REQUEST_STATUS_LABELS,
  approval: "Согласование",
  waiting: "Ждёт ответа",
};

const CLOSED_STATUSES: MyRequestStatus[] = ["done", "rejected"];

export const isRequestClosed = (request: Pick<MyRequest, "status">): boolean =>
  CLOSED_STATUSES.includes(request.status);

export const matchesRequestsFilter = (request: MyRequest, filter: MyRequestsFilter): boolean => {
  if (filter === "all") return true;
  return filter === "closed" ? isRequestClosed(request) : !isRequestClosed(request);
};

const normalize = (value: string) => value.toLocaleLowerCase("ru").replaceAll("ё", "е").trim();

export const filterMyRequests = (
  requests: MyRequest[],
  filter: MyRequestsFilter,
  query: string,
): MyRequest[] => {
  const needle = normalize(query);
  return requests.filter(
    (request) =>
      matchesRequestsFilter(request, filter) &&
      (needle === "" || normalize(`${request.number} ${request.title}`).includes(needle)),
  );
};

export const parseRequestsFilter = (value: string | null | undefined): MyRequestsFilter =>
  value === "closed" || value === "all" ? value : "active";

export const nextRequestNumber = (requests: MyRequest[]): number =>
  requests.reduce((max, request) => {
    const value = Number(request.number.replace(/\D/g, ""));
    return Number.isFinite(value) && value > max ? value : max;
  }, 0) + 1;

export const DEMO_MY_REQUESTS: MyRequest[] = [
  {
    id: "2481",
    number: "ЗВ-2481",
    typeId: "portal-bug",
    title: "Не загружаются фото в новостях",
    status: "progress",
    createdAt: "7 окт",
    dueAt: "10 окт",
    assignee: "Анна Белова",
    updatedAt: "2 ч назад",
    unread: true,
    data: [
      { label: "Что сломалось", value: "Не загружаются фото в новостях" },
      { label: "Ссылка на страницу", value: "portal.oryx.local/news/4821" },
      { label: "Шаги воспроизведения", value: "1. Открыть новость\n2. Нажать «Добавить фото»\n3. Выбрать JPG на 4 МБ" },
      { label: "Браузер", value: "Chrome" },
      { label: "Насколько мешает", value: "Неудобно, но есть обходной путь" },
      { label: "Скриншот или видео", value: "error-upload.png", files: ["error-upload.png"] },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 7 окт, 10:12" },
      { kind: "comment", id: "e2", author: "Анна Белова", at: "7 окт, 11:40", text: "Спасибо! Подскажите, файлы меньше 2 МБ загружаются?" },
      { kind: "comment", id: "e3", author: null, at: "7 окт, 12:05", text: "Да, маленькие проходят. Ломается всё, что больше примерно 3 МБ." },
      { kind: "system", id: "e4", text: "Статус изменён на «В работе» · 8 окт" },
      { kind: "comment", id: "e5", author: "Анна Белова", at: "Сегодня, 10:02", text: "Воспроизвели: лимит на прокси 2 МБ. Поднимем до 20 МБ в релизе в пятницу и отпишусь." },
    ],
  },
  {
    id: "2475",
    number: "ЗВ-2475",
    typeId: "vacation",
    title: "Ежегодный отпуск 3–14 ноября",
    status: "waiting",
    createdAt: "6 окт",
    dueAt: "7 окт",
    assignee: "Дмитрий Орлов",
    updatedAt: "вчера",
    unread: true,
    waitingNote: "Исполнитель ждёт вашего ответа: нужно приложить согласование руководителя.",
    data: [
      { label: "Период отпуска", value: "03.11.2026 — 14.11.2026" },
      { label: "Кто замещает", value: "Ольга Кравец" },
      { label: "Руководитель", value: "Игорь Смирнов" },
      { label: "Отпуск по графику", value: "Нет" },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 6 окт, 16:30" },
      { kind: "comment", id: "e2", author: "Дмитрий Орлов", at: "Вчера, 09:15", text: "Добрый день! По графику у вас отпуск в декабре. Чтобы оформить перенос, приложите, пожалуйста, согласование руководителя — можно скрин письма." },
    ],
  },
  {
    id: "2470",
    number: "ЗВ-2470",
    typeId: "pay-invoice",
    title: "Оплата счёта ООО «Лаборатория света»",
    status: "approval",
    createdAt: "5 окт",
    dueAt: "12 окт",
    assignee: "Казначейство",
    updatedAt: "вчера",
    unread: false,
    data: [
      { label: "Контрагент", value: "ООО «Лаборатория света»" },
      { label: "ИНН контрагента", value: "7701234567" },
      { label: "Сумма", value: "184 500 ₽" },
      { label: "Статья бюджета", value: "АХО · Офис" },
      { label: "Оплатить до", value: "12.10.2026" },
      { label: "Назначение платежа", value: "Оплата по счёту №318 за светильники для 3 этажа" },
      { label: "Счёт и договор", value: "schet-318.pdf", files: ["schet-318.pdf"] },
      { label: "Срочно — нужна оплата сегодня", value: "Нет" },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 5 окт, 14:02" },
      { kind: "system", id: "e2", text: "Отправлена на согласование финансовому директору · 6 окт" },
    ],
  },
  {
    id: "2440",
    number: "ЗВ-2440",
    typeId: "portal-feature",
    title: "Фильтр по отделам в оргструктуре",
    status: "new",
    createdAt: "29 сен",
    dueAt: null,
    assignee: "Команда корпортала",
    updatedAt: "29 сен",
    unread: false,
    data: [
      { label: "Название доработки", value: "Фильтр по отделам в оргструктуре" },
      { label: "Раздел портала", value: "Оргструктура" },
      { label: "Что нужно сделать", value: "Выбирать отдел и видеть только его сотрудников с должностями" },
      { label: "Приоритет", value: "Средний" },
    ],
    events: [{ kind: "system", id: "e1", text: "Заявка создана · 29 сен, 13:10" }],
  },
  {
    id: "2462",
    number: "ЗВ-2462",
    typeId: "bi-access",
    title: "Доступ к дашборду «Продажи по регионам»",
    status: "done",
    createdAt: "2 окт",
    dueAt: "9 окт",
    assignee: "Максим Лебедев",
    updatedAt: "3 окт",
    unread: false,
    data: [
      { label: "Дашборд", value: "Продажи по регионам" },
      { label: "Для кого", value: "Я" },
      { label: "Уровень доступа", value: "Только просмотр" },
      { label: "Зачем нужен доступ", value: "Готовлю квартальный обзор для правления" },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 2 окт, 11:20" },
      { kind: "comment", id: "e2", author: "Максим Лебедев", at: "3 окт, 10:00", text: "Доступ выдан, ссылка появилась в разделе «Мои дашборды»." },
      { kind: "system", id: "e3", text: "Статус изменён на «Решена» · 3 окт" },
    ],
  },
  {
    id: "2455",
    number: "ЗВ-2455",
    typeId: "guest-pass",
    title: "Гостевой пропуск: Кирилл Воронцов",
    status: "done",
    createdAt: "30 сен",
    dueAt: "1 окт",
    assignee: "Служба охраны",
    updatedAt: "1 окт",
    unread: false,
    data: [
      { label: "ФИО гостя", value: "Кирилл Воронцов" },
      { label: "Компания", value: "ООО «Нордвинд»" },
      { label: "Дата визита", value: "01.10.2026" },
      { label: "Время", value: "14:00" },
      { label: "Офис", value: "Москва, Лесная 5" },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 30 сен, 17:45" },
      { kind: "system", id: "e2", text: "Пропуск выписан · 1 окт, 08:30" },
    ],
  },
  {
    id: "2431",
    number: "ЗВ-2431",
    typeId: "hw-laptop",
    title: "Ноутбук для нового дизайнера",
    status: "rejected",
    createdAt: "25 сен",
    dueAt: null,
    assignee: "Павел Гусев",
    updatedAt: "26 сен",
    unread: false,
    data: [
      { label: "Для кого", value: "Мария Ким" },
      { label: "Причина", value: "Замена старого" },
      { label: "Конфигурация", value: "Для дизайна — MacBook Pro 16, 36 ГБ" },
      { label: "Нужен к", value: "06.10.2026" },
      { label: "Нужна док-станция и второй монитор", value: "Да" },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 25 сен, 10:00" },
      { kind: "comment", id: "e2", author: "Павел Гусев", at: "26 сен, 09:20", text: "Отклоняю, чтобы не задвоить: для новых сотрудников оформите «Выход нового сотрудника» — там техника и доступы одним пакетом." },
      { kind: "system", id: "e3", text: "Статус изменён на «Отклонена» · 26 сен" },
    ],
  },
  {
    id: "2420",
    number: "ЗВ-2420",
    typeId: "hr-2ndfl",
    title: "Справка 2-НДФЛ за 2026 год",
    status: "done",
    createdAt: "20 сен",
    dueAt: "22 сен",
    assignee: "Отдел кадров",
    updatedAt: "21 сен",
    unread: false,
    data: [
      { label: "Период", value: "2026 год" },
      { label: "Количество экземпляров", value: "1" },
      { label: "Как получить", value: "Электронно, в профиль" },
      { label: "Куда предоставляется", value: "Банк для ипотеки" },
    ],
    events: [
      { kind: "system", id: "e1", text: "Заявка создана · 20 сен, 09:00" },
      { kind: "system", id: "e2", text: "Справка загружена в профиль · 21 сен" },
    ],
  },
];
