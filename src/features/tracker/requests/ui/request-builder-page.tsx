"use client";

import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, GripVertical, ListPlus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  BUILDER_FIELD_GROUPS,
  BUILDER_FIELD_KINDS,
  createBuilderField,
  createStarterFields,
  duplicateField,
  finalizeFields,
  hasDraftIssues,
  insertField,
  moveField,
  validateDraft,
  type RequestTypeDraft,
} from "@/features/tracker/requests/request-builder";
import {
  findMissingRequiredFields,
  initialRequestFormValues,
  type RequestField as RequestFieldSchema,
  type RequestFieldType,
  type RequestFieldValue,
  type RequestFormValues,
} from "@/features/tracker/requests/request-forms";
import { REQUEST_CATALOG, resolveCatalogSelection } from "@/features/tracker/requests/requests-catalog";
import { catalogHref } from "@/features/tracker/requests/requests-routes";
import { useRequestsStore } from "@/features/tracker/requests/requests-store";
import { BuilderFieldIcon } from "@/features/tracker/requests/ui/request-builder-field-icon";
import { BuilderFieldSettings, BuilderTypeSettings } from "@/features/tracker/requests/ui/request-builder-settings";
import { RequestField } from "@/features/tracker/requests/ui/request-field";
import { RequestSectionIcon } from "@/features/tracker/requests/ui/request-section-icon";
import { RequestsPageShell } from "@/features/tracker/requests/ui/requests-page-shell";
import { formatCount } from "@/features/tracker/requests/ui/format-count";
import { cn } from "@/lib/utils";

type BuilderMode = "edit" | "preview";
type Selection = "type" | string;
type DragSource = { kind: "move"; id: string } | { kind: "new"; type: RequestFieldType };

const CARD_RING = "ring-1 ring-[var(--corportal-border-grey)]";

const ModeButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
      active
        ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-foreground/10"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const FormHeading = ({
  draft,
  placeholder,
}: {
  draft: RequestTypeDraft;
  placeholder?: boolean;
}) => {
  const { section, subsection } = resolveCatalogSelection(draft.sectionId, draft.subsectionId);
  return (
    <div className="flex items-start gap-4">
      <RequestSectionIcon section={section} size="lg" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {section.name} · {subsection.name}
        </p>
        <h2 className={cn("text-lg font-semibold", draft.name.trim() ? "text-foreground" : "text-muted-foreground/70")}>
          {draft.name.trim() || (placeholder ? "Название вида заявки" : "Без названия")}
        </h2>
        {draft.description.trim() || placeholder ? (
          <p className={cn("text-[13px]", draft.description.trim() ? "text-muted-foreground" : "text-muted-foreground/60")}>
            {draft.description.trim() || "Короткое описание для карточки в каталоге"}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const FieldActionButton = ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <Button
    variant="ghost"
    size="icon-xs"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
  >
    {children}
  </Button>
);

const DropLine = () => <div aria-hidden className="-my-px h-0.5 rounded-full bg-primary" />;

const Palette = ({
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  onAdd: (type: RequestFieldType) => void;
  onDragStart: (type: RequestFieldType) => void;
  onDragEnd: () => void;
}) => (
  <Card size="sm" className={cn("gap-3 px-3 lg:sticky lg:top-4", CARD_RING)}>
    <div className="px-1">
      <h2 className="text-sm font-semibold text-foreground">Поля</h2>
      <p className="text-xs text-muted-foreground">Нажмите или перетащите в форму</p>
    </div>
    {BUILDER_FIELD_GROUPS.map((group) => (
      <div key={group.id} className="flex flex-col gap-0.5">
        <p className="px-1 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/80 uppercase">{group.label}</p>
        {BUILDER_FIELD_KINDS.filter((kind) => kind.group === group.id).map((kind) => (
          <button
            key={kind.type}
            type="button"
            draggable
            title={kind.hint}
            onClick={() => onAdd(kind.type)}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData("text/plain", kind.type);
              onDragStart(kind.type);
            }}
            onDragEnd={onDragEnd}
            className="group flex cursor-grab items-center gap-2.5 rounded-lg px-1 py-1 text-left text-sm text-foreground transition-colors hover:bg-muted active:cursor-grabbing"
          >
            <BuilderFieldIcon type={kind.type} className="group-hover:bg-background" />
            <span className="min-w-0 flex-1 truncate">{kind.label}</span>
          </button>
        ))}
      </div>
    ))}
  </Card>
);

export const RequestBuilderPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { publishRequestType } = useRequestsStore();

  const [draft, setDraft] = useState<RequestTypeDraft>(() => {
    const { section, subsection } = resolveCatalogSelection(searchParams.get("section"), searchParams.get("sub"));
    return { name: "", description: "", sectionId: section.id, subsectionId: subsection.id, fields: [] };
  });
  const [selected, setSelected] = useState<Selection>("type");
  const [mode, setMode] = useState<BuilderMode>("edit");
  const [showIssues, setShowIssues] = useState(false);
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [previewValues, setPreviewValues] = useState<RequestFormValues>({});
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  const issues = validateDraft(draft);
  const visibleIssues = showIssues ? issues : { byField: {} as Record<string, string> };
  const { fields } = draft;
  const selectedField = fields.find((field) => field.id === selected) ?? null;
  const selectedIndex = selectedField ? fields.indexOf(selectedField) : -1;
  const initialValues = initialRequestFormValues(fields);
  const publishedFields = finalizeFields(fields);

  const setFields = (updater: (fields: RequestFieldSchema[]) => RequestFieldSchema[]) =>
    setDraft((prev) => ({ ...prev, fields: updater(prev.fields) }));

  const addField = (type: RequestFieldType, atIndex?: number) => {
    const field = createBuilderField(type, fields);
    setFields((prev) => {
      if (atIndex === undefined) return insertField(prev, field, selectedField?.id ?? null);
      return [...prev.slice(0, atIndex), field, ...prev.slice(atIndex)];
    });
    setSelected(field.id);
  };

  const updateField = (fieldId: string, updater: (field: RequestFieldSchema) => RequestFieldSchema) =>
    setFields((prev) => prev.map((field) => (field.id === fieldId ? updater(field) : field)));

  const removeField = (fieldId: string) => {
    const index = fields.findIndex((field) => field.id === fieldId);
    const neighbour = fields[index + 1] ?? fields[index - 1];
    setFields((prev) => prev.filter((field) => field.id !== fieldId));
    if (selected === fieldId) setSelected(neighbour?.id ?? "type");
  };

  const copyField = (fieldId: string) => {
    const result = duplicateField(fields, fieldId);
    setFields(() => result.fields);
    if (result.copyId) setSelected(result.copyId);
  };

  const shiftField = (fieldId: string, delta: number) => {
    const index = fields.findIndex((field) => field.id === fieldId);
    setFields((prev) => moveField(prev, fieldId, index + delta));
  };

  const resetDrag = () => {
    setDrag(null);
    setDropIndex(null);
  };

  const handleDragOverField = (event: DragEvent<HTMLElement>, index: number) => {
    if (!drag) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDropIndex(event.clientY < rect.top + rect.height / 2 ? index : index + 1);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!drag) return;
    const target = dropIndex ?? fields.length;
    if (drag.kind === "new") {
      addField(drag.type, target);
    } else {
      const from = fields.findIndex((field) => field.id === drag.id);
      setFields((prev) => moveField(prev, drag.id, target > from ? target - 1 : target));
      setSelected(drag.id);
    }
    resetDrag();
  };

  const openPreview = () => {
    setPreviewValues(initialRequestFormValues(publishedFields));
    setPreviewErrors([]);
    setMode("preview");
  };

  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = findMissingRequiredFields(publishedFields, previewValues);
    if (missing.length > 0) {
      setPreviewErrors(missing);
      toast.error("Сотрудник увидит подсветку незаполненных обязательных полей");
      return;
    }
    toast.success("Форма заполнена верно. В предпросмотре заявка не отправляется");
  };

  const handlePublish = () => {
    if (hasDraftIssues(issues)) {
      setShowIssues(true);
      setMode("edit");
      const firstFieldIssue = fields.find((field) => issues.byField[field.id]);
      if (issues.name) setSelected("type");
      else if (firstFieldIssue) setSelected(firstFieldIssue.id);
      toast.error(issues.name ?? issues.fields ?? "Проверьте отмеченные поля");
      return;
    }
    const type = publishRequestType({ ...draft, fields: finalizeFields(fields) });
    toast.success(`Вид заявки «${type.name}» опубликован`);
    router.push(catalogHref(draft.sectionId, draft.subsectionId));
  };

  const cancelHref = catalogHref(draft.sectionId, draft.subsectionId);
  const sectionName = REQUEST_CATALOG.find((section) => section.id === draft.sectionId)?.name;

  return (
    <RequestsPageShell breadcrumbs={[{ label: "Новый вид заявки" }]}>
      <Card size="sm" className={CARD_RING}>
        <CardHeader className="gap-0 pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-lg font-semibold text-foreground">Новый вид заявки</h1>
              <div role="group" aria-label="Режим конструктора" className="inline-flex rounded-lg bg-muted p-0.5">
                <ModeButton active={mode === "edit"} onClick={() => setMode("edit")}>
                  Редактор
                </ModeButton>
                <ModeButton active={mode === "preview"} onClick={openPreview}>
                  Предпросмотр
                </ModeButton>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-muted-foreground">
                {formatCount(fields.length, ["поле", "поля", "полей"])}
                {sectionName ? ` · ${sectionName}` : null}
              </span>
              <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
                Отмена
              </Button>
              <Button onClick={handlePublish}>
                <Send aria-hidden />
                Опубликовать
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {mode === "preview" ? (
        <Card size="sm" className={cn("px-5 py-6 sm:px-7", CARD_RING)}>
          <form noValidate onSubmit={handlePreviewSubmit} className="flex max-w-2xl flex-col gap-6">
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Так форму увидит сотрудник. Попробуйте заполнить её — заявка не отправится.
            </p>
            <div className="border-b border-[var(--corportal-border-grey)] pb-5">
              <FormHeading draft={draft} />
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">В форме пока нет полей.</p>
            ) : (
              publishedFields.map((field) => (
                <RequestField
                  key={field.id}
                  field={field}
                  value={previewValues[field.id] ?? initialValues[field.id]}
                  error={previewErrors.includes(field.id)}
                  onChange={(value: RequestFieldValue) => {
                    setPreviewValues((prev) => ({ ...prev, [field.id]: value }));
                    setPreviewErrors((prev) => prev.filter((id) => id !== field.id));
                  }}
                />
              ))
            )}
            <div className="flex items-center gap-2 border-t border-[var(--corportal-border-grey)] pt-5">
              <Button type="submit">
                <Send aria-hidden />
                Отправить заявку
              </Button>
              <Button type="button" variant="outline" onClick={() => setMode("edit")}>
                Вернуться к редактору
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_19rem] xl:grid-cols-[14rem_minmax(0,1fr)_21rem]">
          <Palette onAdd={(type) => addField(type)} onDragStart={(type) => setDrag({ kind: "new", type })} onDragEnd={resetDrag} />

          <Card
            size="sm"
            className={cn("px-4 py-5 sm:px-6", CARD_RING)}
            onDragOver={(event) => {
              if (!drag) return;
              event.preventDefault();
              if (fields.length === 0) setDropIndex(0);
            }}
            onDrop={handleDrop}
          >
            <div className="flex max-w-2xl flex-col gap-1">
              <div
                role="button"
                tabIndex={0}
                aria-pressed={selected === "type"}
                aria-label="Настройки вида заявки"
                onClick={() => setSelected("type")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected("type");
                  }
                }}
                className={cn(
                  "-mx-3 mb-3 cursor-pointer rounded-xl px-3 py-3 text-left ring-1 ring-transparent transition-shadow outline-none hover:ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring",
                  selected === "type" && "ring-2 ring-primary hover:ring-primary",
                  visibleIssues.name && "ring-2 ring-destructive hover:ring-destructive",
                )}
              >
                <FormHeading draft={draft} placeholder />
                {visibleIssues.name ? <p className="mt-2 text-xs text-destructive">{visibleIssues.name}</p> : null}
              </div>

              {fields.length === 0 ? (
                <div
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-10 text-center",
                    drag && "border-primary bg-primary/5",
                    showIssues && issues.fields && "border-destructive",
                  )}
                >
                  <ListPlus aria-hidden className="size-6 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Добавьте первое поле</p>
                    <p className="text-[13px] text-muted-foreground">
                      Выберите тип слева или начните с типовых полей и поправьте их под себя
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const starter = createStarterFields();
                      setFields(() => starter);
                      setSelected(starter[0].id);
                    }}
                  >
                    Тема, описание и вложения
                  </Button>
                </div>
              ) : (
                <ul aria-label="Поля формы" className="flex flex-col gap-1">
                  {fields.map((field, index) => {
                    const isSelected = field.id === selected;
                    const issue = visibleIssues.byField[field.id];
                    return (
                      <li key={field.id} className="flex flex-col gap-1">
                        {dropIndex === index ? <DropLine /> : null}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Поле «${field.label || "без названия"}»`}
                          draggable
                          onClick={() => setSelected(field.id)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelected(field.id);
                            }
                            if (event.key === "Delete" || event.key === "Backspace") {
                              event.preventDefault();
                              removeField(field.id);
                            }
                          }}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", field.id);
                            setDrag({ kind: "move", id: field.id });
                          }}
                          onDragEnd={resetDrag}
                          onDragOver={(event) => handleDragOverField(event, index)}
                          className={cn(
                            "group relative -mx-3 cursor-pointer rounded-xl px-3 py-3 ring-1 ring-transparent transition-shadow outline-none hover:ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected && "bg-primary/[0.03] ring-2 ring-primary hover:ring-primary",
                            issue && "ring-2 ring-destructive hover:ring-destructive",
                            drag?.kind === "move" && drag.id === field.id && "opacity-40",
                          )}
                        >
                          <div inert className="pointer-events-none pr-24 select-none">
                            <RequestField
                              field={publishedFields[index]}
                              value={initialValues[field.id]}
                              onChange={() => undefined}
                            />
                          </div>
                          {issue ? <p className="mt-2 text-xs text-destructive">{issue}</p> : null}
                          <div
                            className={cn(
                              "absolute top-2 right-2 flex items-center gap-0.5 rounded-lg bg-card p-0.5 opacity-0 ring-1 ring-[var(--corportal-border-grey)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                              isSelected && "opacity-100",
                            )}
                          >
                            <span aria-hidden className="grid size-6 cursor-grab place-items-center text-muted-foreground">
                              <GripVertical className="size-3.5" />
                            </span>
                            <FieldActionButton label="Выше" disabled={index === 0} onClick={() => shiftField(field.id, -1)}>
                              <ArrowUp aria-hidden />
                            </FieldActionButton>
                            <FieldActionButton
                              label="Ниже"
                              disabled={index === fields.length - 1}
                              onClick={() => shiftField(field.id, 1)}
                            >
                              <ArrowDown aria-hidden />
                            </FieldActionButton>
                            <FieldActionButton label="Дублировать" onClick={() => copyField(field.id)}>
                              <Copy aria-hidden />
                            </FieldActionButton>
                            <FieldActionButton label="Удалить" onClick={() => removeField(field.id)}>
                              <Trash2 aria-hidden />
                            </FieldActionButton>
                          </div>
                        </div>
                        {dropIndex === fields.length && index === fields.length - 1 ? <DropLine /> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <Card size="sm" className={cn("px-4 py-4 lg:sticky lg:top-4", CARD_RING)}>
            {selectedField ? (
              <BuilderFieldSettings
                key={selectedField.id}
                field={selectedField}
                position={selectedIndex + 1}
                total={fields.length}
                error={visibleIssues.byField[selectedField.id]}
                onChange={(updater) => updateField(selectedField.id, updater)}
                onDuplicate={() => copyField(selectedField.id)}
                onDelete={() => removeField(selectedField.id)}
              />
            ) : (
              <BuilderTypeSettings
                draft={draft}
                nameError={visibleIssues.name}
                onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              />
            )}
          </Card>
        </div>
      )}
    </RequestsPageShell>
  );
};
