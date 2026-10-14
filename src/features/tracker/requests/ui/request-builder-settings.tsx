"use client";

import { useState, type ReactNode } from "react";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getBuilderFieldKind, hasOptions, type RequestTypeDraft } from "@/features/tracker/requests/request-builder";
import { REQUEST_PEOPLE, type RequestField } from "@/features/tracker/requests/request-forms";
import { REQUEST_CATALOG } from "@/features/tracker/requests/requests-catalog";
import { BuilderFieldIcon } from "@/features/tracker/requests/ui/request-builder-field-icon";
import { TEXTAREA_CLASS_NAME } from "@/features/tracker/requests/ui/request-field";
import { cn } from "@/lib/utils";

const SettingRow = ({
  id,
  label,
  hint,
  error,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[13px] font-medium text-foreground">
      {label}
    </label>
    {children}
    {error ? (
      <p className="text-xs text-destructive">{error}</p>
    ) : hint ? (
      <p className="text-xs text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const SimpleSelect = ({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <Select items={options} value={value} onValueChange={(next) => onChange(typeof next === "string" ? next : "")}>
    <SelectTrigger id={id} className="h-9 w-full">
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent align="start">
      <SelectGroup>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

const PanelHeader = ({ eyebrow, title, icon }: { eyebrow: string; title: string; icon?: ReactNode }) => (
  <div className="flex items-center gap-2.5 border-b border-[var(--corportal-border-grey)] pb-3">
    {icon}
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{eyebrow}</p>
      <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
    </div>
  </div>
);

type TypeSettingsProps = {
  draft: RequestTypeDraft;
  nameError?: string;
  onChange: (patch: Partial<Omit<RequestTypeDraft, "fields">>) => void;
};

export const BuilderTypeSettings = ({ draft, nameError, onChange }: TypeSettingsProps) => {
  const section = REQUEST_CATALOG.find((item) => item.id === draft.sectionId) ?? REQUEST_CATALOG[0];
  const subsection = section.subsections.find((item) => item.id === draft.subsectionId) ?? section.subsections[0];

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader eyebrow="Настройки" title="Вид заявки" />
      <SettingRow id="builder-type-name" label="Название" error={nameError} hint="Так вид заявки называется в каталоге">
        <Input
          id="builder-type-name"
          className="h-9"
          value={draft.name}
          placeholder="Например: Заказ визиток"
          aria-invalid={nameError ? true : undefined}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </SettingRow>
      <SettingRow id="builder-type-description" label="Описание" hint="Одна строка под названием в карточке каталога">
        <textarea
          id="builder-type-description"
          className={cn(TEXTAREA_CLASS_NAME, "min-h-16")}
          value={draft.description}
          placeholder="Например: Печать визиток с логотипом компании"
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </SettingRow>
      <SettingRow id="builder-type-section" label="Раздел каталога">
        <SimpleSelect
          id="builder-type-section"
          value={section.id}
          options={REQUEST_CATALOG.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(sectionId) => {
            const next = REQUEST_CATALOG.find((item) => item.id === sectionId);
            if (next) onChange({ sectionId: next.id, subsectionId: next.subsections[0].id });
          }}
        />
      </SettingRow>
      <SettingRow id="builder-type-subsection" label="Подраздел">
        <SimpleSelect
          id="builder-type-subsection"
          value={subsection.id}
          options={section.subsections.map((item) => ({ value: item.id, label: item.name }))}
          onChange={(subsectionId) => onChange({ subsectionId })}
        />
      </SettingRow>
      <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
        Заявки получит <span className="font-medium text-foreground">{subsection.team}</span>, срок реакции —{" "}
        {subsection.sla}. Исполнитель и срок задаются для всего подраздела.
      </div>
    </div>
  );
};

const OptionsEditor = ({
  field,
  onChange,
}: {
  field: Extract<RequestField, { options: string[] }>;
  onChange: (updater: (field: RequestField) => RequestField) => void;
}) => {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const setOptions = (options: string[], renamed?: { from: string; to: string }) =>
    onChange((current) => {
      if (current.type !== "radio") return { ...current, options } as RequestField;
      let defaultValue = current.defaultValue;
      if (renamed && defaultValue === renamed.from) defaultValue = renamed.to;
      if (defaultValue !== undefined && !options.includes(defaultValue)) defaultValue = undefined;
      return { ...current, options, defaultValue };
    });

  const addOption = (afterIndex: number) => {
    const next = [...field.options];
    next.splice(afterIndex + 1, 0, "");
    setFocusIndex(afterIndex + 1);
    setOptions(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-foreground">Варианты</span>
      <ul className="flex flex-col gap-1.5">
        {field.options.map((option, index) => (
          <li key={`${field.id}-${index}`} className="flex items-center gap-1.5">
            <span aria-hidden className="w-4 text-right text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <Input
              className="h-8"
              value={option}
              aria-label={`Вариант ${index + 1}`}
              placeholder={`Вариант ${index + 1}`}
              autoFocus={focusIndex === index}
              onFocus={() => setFocusIndex(null)}
              onChange={(event) => {
                const next = [...field.options];
                next[index] = event.target.value;
                setOptions(next, { from: option, to: event.target.value });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption(index);
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Удалить вариант ${index + 1}`}
              onClick={() => setOptions(field.options.filter((_, itemIndex) => itemIndex !== index))}
            >
              <X aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => addOption(field.options.length - 1)}>
        <Plus aria-hidden />
        Добавить вариант
      </Button>
      <p className="text-xs text-muted-foreground">Enter в строке варианта добавляет следующий</p>
    </div>
  );
};

type FieldSettingsProps = {
  field: RequestField;
  position: number;
  total: number;
  error?: string;
  onChange: (updater: (field: RequestField) => RequestField) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export const BuilderFieldSettings = ({ field, position, total, error, onChange, onDuplicate, onDelete }: FieldSettingsProps) => {
  const kind = getBuilderFieldKind(field.type);
  const labelError = error && field.label.trim() === "" ? error : undefined;
  const optionsError = error && !labelError ? error : undefined;

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        eyebrow={`Поле ${position} из ${total}`}
        title={kind.label}
        icon={<BuilderFieldIcon type={field.type} className="size-8" />}
      />
      <SettingRow id="builder-field-label" label="Название поля" error={labelError}>
        <Input
          id="builder-field-label"
          className="h-9"
          value={field.label}
          aria-invalid={labelError ? true : undefined}
          onChange={(event) => onChange((current) => ({ ...current, label: event.target.value }))}
        />
      </SettingRow>
      <SettingRow id="builder-field-description" label="Подсказка" hint="Серый текст под названием: что и в каком виде указать">
        <textarea
          id="builder-field-description"
          className={cn(TEXTAREA_CLASS_NAME, "min-h-16")}
          value={field.description ?? ""}
          onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))}
        />
      </SettingRow>
      {field.type === "text" || field.type === "textarea" ? (
        <SettingRow id="builder-field-placeholder" label="Пример внутри поля" hint="Виден, пока поле пустое">
          <Input
            id="builder-field-placeholder"
            className="h-9"
            value={field.placeholder ?? ""}
            placeholder="Например: ООО «Ромашка»"
            onChange={(event) =>
              onChange((current) => ({ ...current, placeholder: event.target.value || undefined }) as RequestField)
            }
          />
        </SettingRow>
      ) : null}
      {hasOptions(field) ? (
        <>
          <OptionsEditor field={field} onChange={onChange} />
          {optionsError ? <p className="-mt-2 text-xs text-destructive">{optionsError}</p> : null}
        </>
      ) : null}
      {field.type === "radio" ? (
        <SettingRow id="builder-field-default" label="Выбрано заранее">
          <SimpleSelect
            id="builder-field-default"
            value={field.defaultValue ?? ""}
            placeholder="Ничего не выбрано"
            options={[
              { value: "", label: "Ничего не выбрано" },
              ...field.options.filter((option) => option.trim() !== "").map((option) => ({ value: option, label: option })),
            ]}
            onChange={(value) => onChange((current) => ({ ...current, defaultValue: value || undefined }) as RequestField)}
          />
        </SettingRow>
      ) : null}
      {field.type === "person" ? (
        <SettingRow id="builder-field-default" label="Выбрано заранее" hint="«Я» — тот, кто подаёт заявку">
          <SimpleSelect
            id="builder-field-default"
            value={field.defaultValue ?? ""}
            placeholder="Никто"
            options={[
              { value: "", label: "Никто" },
              ...REQUEST_PEOPLE.map((person) => ({ value: person, label: person })),
            ]}
            onChange={(value) => onChange((current) => ({ ...current, defaultValue: value || undefined }) as RequestField)}
          />
        </SettingRow>
      ) : null}
      <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-foreground">Обязательное поле</span>
          <span className="text-xs text-muted-foreground">
            {field.type === "checkbox" ? "Без отметки заявку не отправить" : "Без ответа заявку не отправить"}
          </span>
        </span>
        <Switch
          checked={field.required === true}
          onCheckedChange={(checked) => onChange((current) => ({ ...current, required: checked || undefined }))}
        />
      </label>
      <div className="flex gap-2 border-t border-[var(--corportal-border-grey)] pt-3">
        <Button variant="outline" size="sm" onClick={onDuplicate}>
          <Copy aria-hidden />
          Дублировать
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 aria-hidden />
          Удалить поле
        </Button>
      </div>
    </div>
  );
};
