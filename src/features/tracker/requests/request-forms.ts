/**
 * Request forms are built by a simple constructor: an ordered list of fields, rendered top to bottom,
 * one field per row. Every field has a label and an optional description.
 */

type FieldBase = {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
};

export type RequestField =
  | (FieldBase & { type: "text" | "textarea"; placeholder?: string })
  | (FieldBase & { type: "number" | "money" | "date" | "period" | "checkbox" | "file" })
  | (FieldBase & { type: "person"; defaultValue?: string })
  | (FieldBase & { type: "select" | "multi"; options: string[] })
  | (FieldBase & { type: "radio"; options: string[]; defaultValue?: string });

export type RequestFieldType = RequestField["type"];

export type PeriodValue = { from: string; to: string };

export type RequestFieldValue = string | string[] | boolean | PeriodValue;

export type RequestFormValues = Record<string, RequestFieldValue>;

export type SubmittedFieldValue = {
  label: string;
  value: string;
  files?: string[];
};

export const REQUEST_PEOPLE = [
  "Я",
  "Ольга Кравец",
  "Игорь Смирнов",
  "Мария Ким",
  "Артём Зайцев",
  "Елена Соколова",
  "Отдел продаж",
];

const DEFAULT_FORM: RequestField[] = [
  { id: "subject", type: "text", label: "Тема", description: "Коротко, как заголовок", required: true },
  { id: "details", type: "textarea", label: "Описание", description: "Подробно опишите, что нужно", required: true },
  { id: "urgency", type: "radio", label: "Срочность", options: ["Обычная", "Срочно"], defaultValue: "Обычная" },
  { id: "files", type: "file", label: "Вложения" },
];

export const REQUEST_FORMS: Record<string, RequestField[]> = {
  "portal-feature": [
    { id: "title", type: "text", label: "Название доработки", description: "Одной фразой: что должно появиться", required: true, placeholder: "Например: фильтр по отделам в оргструктуре" },
    { id: "area", type: "select", label: "Раздел портала", description: "Где будет жить доработка", required: true, options: ["Новости", "Оргструктура", "База знаний", "Заявки", "Профиль сотрудника", "Календарь событий"] },
    { id: "what", type: "textarea", label: "Что нужно сделать", description: "Опишите, как это должно работать с точки зрения пользователя", required: true },
    { id: "why", type: "textarea", label: "Зачем это нужно", description: "Какую проблему решает и скольких людей затрагивает — помогает приоритизировать" },
    { id: "priority", type: "radio", label: "Приоритет", options: ["Низкий", "Средний", "Высокий"], defaultValue: "Средний" },
    { id: "due", type: "date", label: "Желаемый срок", description: "Если есть внешний дедлайн — укажите его в описании" },
    { id: "files", type: "file", label: "Макеты и примеры", description: "Скриншоты, наброски, ссылки на похожие решения" },
  ],
  "portal-bug": [
    { id: "title", type: "text", label: "Что сломалось", description: "Коротко, как заголовок", required: true, placeholder: "Например: не загружаются фото в новостях" },
    { id: "url", type: "text", label: "Ссылка на страницу", description: "Скопируйте адрес из браузера", placeholder: "https://portal.oryx.local/…" },
    { id: "steps", type: "textarea", label: "Шаги воспроизведения", description: "Что вы делали перед ошибкой, по шагам", required: true, placeholder: "1. Открыть…\n2. Нажать…" },
    { id: "result", type: "textarea", label: "Что ожидали и что произошло" },
    { id: "browser", type: "select", label: "Браузер", options: ["Chrome", "Яндекс Браузер", "Safari", "Edge", "Мобильное приложение"] },
    { id: "impact", type: "radio", label: "Насколько мешает", options: ["Не могу работать", "Неудобно, но есть обходной путь", "Косметика"], defaultValue: "Неудобно, но есть обходной путь" },
    { id: "files", type: "file", label: "Скриншот или видео", description: "Очень ускоряет разбор" },
  ],
  "portal-access": [
    { id: "who", type: "person", label: "Для кого", required: true, defaultValue: "Я" },
    { id: "area", type: "select", label: "Раздел", options: ["Новости", "База знаний", "Оргструктура", "Заявки", "Весь портал"] },
    { id: "rights", type: "multi", label: "Нужные права", description: "Можно выбрать несколько", options: ["Просмотр", "Редактирование", "Публикация", "Модерация комментариев"] },
    { id: "until", type: "date", label: "Доступ до", description: "Оставьте пустым, если доступ нужен бессрочно" },
    { id: "reason", type: "textarea", label: "Обоснование", description: "Для чего нужен доступ — увидит владелец раздела", required: true },
  ],
  "bi-report": [
    { id: "title", type: "text", label: "Название отчёта", required: true },
    { id: "metrics", type: "textarea", label: "Какие показатели и разрезы нужны", description: "Например: выручка по регионам и менеджерам, помесячно", required: true },
    { id: "source", type: "select", label: "Источник данных", description: "Если не знаете — выберите «Не знаю», аналитик подскажет", options: ["1С: Продажи", "CRM", "Склад", "Финансы", "Не знаю"] },
    { id: "refresh", type: "select", label: "Как часто обновлять", options: ["Раз в день", "Раз в неделю", "Раз в месяц", "В реальном времени"] },
    { id: "due", type: "date", label: "Нужен к" },
    { id: "files", type: "file", label: "Пример", description: "Табличка в Excel или набросок от руки" },
  ],
  "bi-access": [
    { id: "dashboard", type: "select", label: "Дашборд", required: true, options: ["Продажи по регионам", "Остатки на складах", "Воронка CRM", "P&L по направлениям"] },
    { id: "who", type: "person", label: "Для кого", defaultValue: "Я" },
    { id: "level", type: "radio", label: "Уровень доступа", options: ["Только просмотр", "Просмотр и выгрузка в Excel"], defaultValue: "Только просмотр" },
    { id: "reason", type: "textarea", label: "Зачем нужен доступ", description: "Владелец дашборда согласует по этому тексту" },
  ],
  "sup-soft": [
    { id: "app", type: "select", label: "Программа", description: "Только из каталога разрешённого ПО", required: true, options: ["Figma", "Adobe Acrobat", "Visual Studio Code", "Zoom", "Другая — укажу в комментарии"] },
    { id: "pc", type: "text", label: "Инвентарный номер компьютера", description: "Наклейка на корпусе, начинается с PC-", placeholder: "PC-0412" },
    { id: "when", type: "radio", label: "Когда удобно подключиться", options: ["Сейчас", "После 18:00", "Согласуем отдельно"], defaultValue: "Сейчас" },
    { id: "comment", type: "textarea", label: "Комментарий" },
  ],
  "hw-laptop": [
    { id: "who", type: "person", label: "Для кого", required: true, defaultValue: "Я" },
    { id: "reason", type: "select", label: "Причина", required: true, options: ["Замена старого", "Сломался", "Нужна мощнее"] },
    { id: "config", type: "radio", label: "Конфигурация", description: "Подробные характеристики — в базе знаний", options: ["Офисный — ThinkPad E14, 16 ГБ", "Для разработки — MacBook Pro 14, 32 ГБ", "Для дизайна — MacBook Pro 16, 36 ГБ"], defaultValue: "Офисный — ThinkPad E14, 16 ГБ" },
    { id: "due", type: "date", label: "Нужен к" },
    { id: "dock", type: "checkbox", label: "Нужна док-станция и второй монитор" },
    { id: "comment", type: "textarea", label: "Комментарий" },
  ],
  "sec-vpn": [
    { id: "who", type: "person", label: "Для кого", defaultValue: "Я" },
    { id: "period", type: "period", label: "Период доступа", description: "Максимум 90 дней, потом заявку можно продлить", required: true },
    { id: "device", type: "radio", label: "Устройство", options: ["Рабочий ноутбук", "Личный компьютер"], defaultValue: "Рабочий ноутбук" },
    { id: "systems", type: "textarea", label: "Для каких систем нужен доступ", placeholder: "1С, файловое хранилище, CRM…" },
    { id: "policy", type: "checkbox", label: "Ознакомлен с политикой удалённого доступа", required: true },
  ],
  vacation: [
    { id: "period", type: "period", label: "Период отпуска", description: "Доступно 18 дней", required: true },
    { id: "deputy", type: "person", label: "Кто замещает", description: "Этот человек получит уведомление", required: true, defaultValue: "Ольга Кравец" },
    { id: "manager", type: "person", label: "Руководитель", description: "Согласует заявку", defaultValue: "Игорь Смирнов" },
    { id: "scheduled", type: "checkbox", label: "Отпуск по графику", description: "Если даты не совпадают с графиком, приложите согласование руководителя" },
    { id: "files", type: "file", label: "Согласование руководителя" },
    { id: "comment", type: "textarea", label: "Комментарий" },
  ],
  "hr-2ndfl": [
    { id: "period", type: "select", label: "Период", required: true, options: ["2026 год", "2025 год", "2024 год", "Произвольный период"] },
    { id: "copies", type: "number", label: "Количество экземпляров" },
    { id: "delivery", type: "radio", label: "Как получить", options: ["Электронно, в профиль", "Бумажный экземпляр в отделе кадров"], defaultValue: "Электронно, в профиль" },
    { id: "purpose", type: "text", label: "Куда предоставляется", description: "Не обязательно, но помогает выбрать форму", placeholder: "Например: банк для ипотеки" },
  ],
  "pay-invoice": [
    { id: "vendor", type: "text", label: "Контрагент", required: true, placeholder: "ООО «…»" },
    { id: "inn", type: "text", label: "ИНН контрагента", description: "10 или 12 цифр" },
    { id: "amount", type: "money", label: "Сумма", description: "С НДС", required: true },
    { id: "budget", type: "select", label: "Статья бюджета", description: "Если нужной нет — сначала заявка «Новая статья бюджета»", required: true, options: ["Маркетинг · Реклама", "IT · Подписки", "АХО · Офис", "Обучение", "Прочее"] },
    { id: "due", type: "date", label: "Оплатить до", required: true },
    { id: "purpose", type: "textarea", label: "Назначение платежа", description: "Так, как должно быть в платёжке" },
    { id: "files", type: "file", label: "Счёт и договор", required: true },
    { id: "urgent", type: "checkbox", label: "Срочно — нужна оплата сегодня", description: "Срочные платежи согласует финансовый директор" },
  ],
  trip: [
    { id: "city", type: "text", label: "Город", required: true },
    { id: "period", type: "period", label: "Даты поездки", required: true },
    { id: "goal", type: "textarea", label: "Цель поездки", required: true },
    { id: "services", type: "multi", label: "Что организовать", options: ["Авиабилеты", "Ж/д билеты", "Гостиница", "Трансфер"] },
    { id: "advance", type: "money", label: "Аванс на суточные", description: "Оставьте пустым, если аванс не нужен" },
  ],
  "guest-pass": [
    { id: "guest", type: "text", label: "ФИО гостя", description: "Как в паспорте", required: true },
    { id: "company", type: "text", label: "Компания" },
    { id: "date", type: "date", label: "Дата визита", required: true },
    { id: "time", type: "text", label: "Время", placeholder: "14:00" },
    { id: "office", type: "select", label: "Офис", options: ["Москва, Лесная 5", "Санкт-Петербург, Невский 30"] },
    { id: "car", type: "text", label: "Госномер автомобиля", description: "Если гость приедет на машине", placeholder: "А123ВС 777" },
  ],
  "contract-approve": [
    { id: "vendor", type: "text", label: "Контрагент", required: true },
    { id: "kind", type: "select", label: "Тип договора", options: ["Поставка", "Услуги", "Аренда", "NDA", "Лицензионный"] },
    { id: "amount", type: "money", label: "Сумма договора" },
    { id: "due", type: "date", label: "Подписать до" },
    { id: "focus", type: "textarea", label: "Что важно проверить", description: "Особые условия, на которые стоит обратить внимание" },
    { id: "files", type: "file", label: "Проект договора", description: "DOCX, чтобы юристы могли оставить правки", required: true },
  ],
  "des-banner": [
    { id: "title", type: "text", label: "Что за баннер", required: true },
    { id: "formats", type: "multi", label: "Форматы", options: ["Портал 1200×400", "Соцсети 1080×1080", "Stories 1080×1920", "Печать A3"] },
    { id: "copy", type: "textarea", label: "Тексты и смысл", description: "Заголовок, подзаголовок, призыв" },
    { id: "due", type: "date", label: "Нужен к", required: true },
    { id: "files", type: "file", label: "Референсы" },
  ],
};

export const getRequestForm = (typeId: string): RequestField[] => REQUEST_FORMS[typeId] ?? DEFAULT_FORM;

export const initialRequestFormValues = (fields: RequestField[]): RequestFormValues => {
  const values: RequestFormValues = {};
  for (const field of fields) {
    switch (field.type) {
      case "multi":
      case "file":
        values[field.id] = [];
        break;
      case "checkbox":
        values[field.id] = false;
        break;
      case "period":
        values[field.id] = { from: "", to: "" };
        break;
      case "radio":
      case "person":
        values[field.id] = field.defaultValue ?? "";
        break;
      default:
        values[field.id] = "";
    }
  }
  return values;
};

const isPeriod = (value: RequestFieldValue | undefined): value is PeriodValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isFieldFilled = (field: RequestField, value: RequestFieldValue | undefined): boolean => {
  if (value === undefined) return false;
  if (field.type === "checkbox") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPeriod(value)) return value.from !== "" && value.to !== "";
  return typeof value === "string" && value.trim() !== "";
};

export const findMissingRequiredFields = (fields: RequestField[], values: RequestFormValues): string[] =>
  fields.filter((field) => field.required && !isFieldFilled(field, values[field.id])).map((field) => field.id);

const formatDate = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
};

const formatMoney = (raw: string): string => {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return raw;
  return `${Number(digits).toLocaleString("ru-RU")} ₽`;
};

/** Returns null when the field was left empty (unchecked checkboxes still read «Нет»). */
export const formatFieldValue = (field: RequestField, value: RequestFieldValue | undefined): string | null => {
  if (field.type === "checkbox") return value === true ? "Да" : "Нет";
  if (!isFieldFilled(field, value)) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (isPeriod(value)) return `${formatDate(value.from)} — ${formatDate(value.to)}`;
  const text = String(value).trim();
  if (field.type === "date") return formatDate(text);
  if (field.type === "money") return formatMoney(text);
  return text;
};

/** The first filled text field reads best as a list title; otherwise the request type name. */
export const deriveRequestTitle = (typeName: string, fields: RequestField[], values: RequestFormValues): string => {
  const titleField = fields.find((field) => field.type === "text");
  const value = titleField ? values[titleField.id] : undefined;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : typeName;
};

export const buildSubmittedData = (fields: RequestField[], values: RequestFormValues): SubmittedFieldValue[] =>
  fields.flatMap((field) => {
    const raw = values[field.id];
    const value = formatFieldValue(field, raw);
    if (value === null) return [];
    if (field.type === "file" && Array.isArray(raw)) return [{ label: field.label, value, files: raw }];
    return [{ label: field.label, value }];
  });
