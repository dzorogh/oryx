import type { RequestField, RequestFieldType } from "@/features/tracker/requests/request-forms";

export type BuilderFieldGroup = "text" | "dates" | "choice" | "other";

export type BuilderFieldKind = {
  type: RequestFieldType;
  label: string;
  hint: string;
  group: BuilderFieldGroup;
};

export const BUILDER_FIELD_GROUPS: { id: BuilderFieldGroup; label: string }[] = [
  { id: "text", label: "Текст и числа" },
  { id: "dates", label: "Даты" },
  { id: "choice", label: "Выбор" },
  { id: "other", label: "Другое" },
];

export const BUILDER_FIELD_KINDS: BuilderFieldKind[] = [
  { type: "text", label: "Строка", hint: "Короткий ответ в одну строку", group: "text" },
  { type: "textarea", label: "Текст", hint: "Развёрнутый ответ в несколько строк", group: "text" },
  { type: "number", label: "Число", hint: "Количество, штуки, дни", group: "text" },
  { type: "money", label: "Сумма", hint: "Деньги в рублях", group: "text" },
  { type: "date", label: "Дата", hint: "Один день", group: "dates" },
  { type: "period", label: "Период", hint: "Две даты: с — по", group: "dates" },
  { type: "select", label: "Список", hint: "Один вариант из выпадающего списка", group: "choice" },
  { type: "radio", label: "Один вариант", hint: "Все варианты видны сразу", group: "choice" },
  { type: "multi", label: "Несколько вариантов", hint: "Можно отметить несколько", group: "choice" },
  { type: "person", label: "Сотрудник", hint: "Выбор человека из оргструктуры", group: "other" },
  { type: "checkbox", label: "Флажок", hint: "Согласие или да/нет", group: "other" },
  { type: "file", label: "Файлы", hint: "Вложения: документы, скриншоты", group: "other" },
];

export const getBuilderFieldKind = (type: RequestFieldType): BuilderFieldKind =>
  BUILDER_FIELD_KINDS.find((kind) => kind.type === type) ?? BUILDER_FIELD_KINDS[0];

export const hasOptions = (field: RequestField): field is Extract<RequestField, { options: string[] }> =>
  field.type === "select" || field.type === "radio" || field.type === "multi";

const DEFAULT_LABELS: Record<RequestFieldType, string> = {
  text: "Новое поле",
  textarea: "Подробности",
  number: "Количество",
  money: "Сумма",
  date: "Дата",
  period: "Период",
  select: "Выберите вариант",
  radio: "Выберите вариант",
  multi: "Отметьте нужное",
  person: "Сотрудник",
  checkbox: "Подтверждаю",
  file: "Вложения",
};

export const nextFieldId = (fields: RequestField[]): string => {
  const used = new Set(fields.map((field) => field.id));
  let index = fields.length + 1;
  while (used.has(`field-${index}`)) index += 1;
  return `field-${index}`;
};

export const createBuilderField = (type: RequestFieldType, fields: RequestField[]): RequestField => {
  const base = { id: nextFieldId(fields), label: DEFAULT_LABELS[type] };
  switch (type) {
    case "text":
    case "textarea":
      return { ...base, type };
    case "select":
    case "multi":
      return { ...base, type, options: ["Вариант 1", "Вариант 2"] };
    case "radio":
      return { ...base, type, options: ["Вариант 1", "Вариант 2"], defaultValue: "Вариант 1" };
    case "person":
      return { ...base, type, defaultValue: "Я" };
    default:
      return { ...base, type };
  }
};

/** A quick start that mirrors the common request form: subject, details, attachments. */
export const createStarterFields = (): RequestField[] => [
  { id: "field-1", type: "text", label: "Тема", description: "Коротко, как заголовок", required: true },
  { id: "field-2", type: "textarea", label: "Описание", description: "Подробно опишите, что нужно", required: true },
  { id: "field-3", type: "file", label: "Вложения" },
];

export const insertField = (fields: RequestField[], field: RequestField, afterId: string | null): RequestField[] => {
  const index = afterId ? fields.findIndex((item) => item.id === afterId) : -1;
  if (index === -1) return [...fields, field];
  return [...fields.slice(0, index + 1), field, ...fields.slice(index + 1)];
};

export const moveField = (fields: RequestField[], fieldId: string, toIndex: number): RequestField[] => {
  const from = fields.findIndex((field) => field.id === fieldId);
  if (from === -1) return fields;
  const target = Math.max(0, Math.min(fields.length - 1, toIndex));
  if (target === from) return fields;
  const next = [...fields];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
};

export const duplicateField = (fields: RequestField[], fieldId: string): { fields: RequestField[]; copyId: string | null } => {
  const source = fields.find((field) => field.id === fieldId);
  if (!source) return { fields, copyId: null };
  const copy = { ...source, id: nextFieldId(fields), label: `${source.label} (копия)` } as RequestField;
  return { fields: insertField(fields, copy, fieldId), copyId: copy.id };
};

export type RequestTypeDraft = {
  name: string;
  description: string;
  sectionId: string;
  subsectionId: string;
  fields: RequestField[];
};

export type DraftIssues = {
  name?: string;
  fields?: string;
  byField: Record<string, string>;
};

/** Everything an employee would trip over: no name, no fields, unnamed fields, choice fields without options. */
export const validateDraft = (draft: RequestTypeDraft): DraftIssues => {
  const issues: DraftIssues = { byField: {} };
  if (draft.name.trim() === "") issues.name = "Назовите вид заявки";
  if (draft.fields.length === 0) issues.fields = "Добавьте хотя бы одно поле";
  for (const field of draft.fields) {
    if (field.label.trim() === "") {
      issues.byField[field.id] = "У поля нет названия";
    } else if (hasOptions(field) && field.options.filter((option) => option.trim() !== "").length < 2) {
      issues.byField[field.id] = "Нужно минимум два варианта";
    }
  }
  return issues;
};

export const hasDraftIssues = (issues: DraftIssues): boolean =>
  Boolean(issues.name || issues.fields || Object.keys(issues.byField).length > 0);

/** Trims labels and options and drops empty options before the form goes live. */
export const finalizeFields = (fields: RequestField[]): RequestField[] =>
  fields.map((field) => {
    const cleaned = {
      ...field,
      label: field.label.trim(),
      description: field.description?.trim() || undefined,
    } as RequestField;
    if (!hasOptions(cleaned)) return cleaned;
    const options = cleaned.options.map((option) => option.trim()).filter(Boolean);
    const unique = [...new Set(options)];
    if (cleaned.type === "radio") {
      const defaultValue = cleaned.defaultValue && unique.includes(cleaned.defaultValue) ? cleaned.defaultValue : undefined;
      return { ...cleaned, options: unique, defaultValue };
    }
    return { ...cleaned, options: unique };
  });
