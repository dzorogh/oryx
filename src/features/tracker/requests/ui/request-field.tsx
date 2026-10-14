"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import { Paperclip, UploadCloud, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  REQUEST_PEOPLE,
  type PeriodValue,
  type RequestField as RequestFieldSchema,
  type RequestFieldValue,
} from "@/features/tracker/requests/request-forms";
import { cn } from "@/lib/utils";

export const requestPersonAvatar = (name: string, size = 64) =>
  `https://i.pravatar.cc/${size}?u=${encodeURIComponent(`oryx-request-${name}`)}`;

export const TEXTAREA_CLASS_NAME =
  "flex min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

type RequestFieldProps = {
  field: RequestFieldSchema;
  value: RequestFieldValue;
  error?: boolean;
  onChange: (value: RequestFieldValue) => void;
};

const RequiredMark = () => (
  <span aria-hidden className="ml-0.5 text-destructive">
    *
  </span>
);

const toggleItem = (list: string[], item: string) =>
  list.includes(item) ? list.filter((value) => value !== item) : [...list, item];

const SelectControl = ({
  id,
  options,
  value,
  invalid,
  placeholder,
  onChange,
  renderOption,
}: {
  id: string;
  options: string[];
  value: string;
  invalid?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  renderOption?: (option: string) => ReactNode;
}) => (
  <Select
    items={options.map((option) => ({ value: option, label: option }))}
    value={value}
    onValueChange={(next) => onChange(typeof next === "string" ? next : "")}
  >
    <SelectTrigger id={id} className="h-9 w-full" aria-invalid={invalid || undefined}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent align="start">
      <SelectGroup>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {renderOption ? renderOption(option) : option}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

const FileControl = ({
  id,
  files,
  invalid,
  onChange,
}: {
  id: string;
  files: string[];
  invalid?: boolean;
  onChange: (files: string[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-input bg-muted/30 px-4 py-5 text-center text-[13px] text-muted-foreground transition-colors hover:bg-muted/60",
          invalid && "border-destructive",
        )}
      >
        <UploadCloud aria-hidden className="size-5" />
        <span>
          Перетащите файлы или <span className="font-medium text-foreground">выберите</span>
        </span>
        <span className="text-xs">До 20 МБ</span>
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          const names = Array.from(event.target.files ?? []).map((file) => file.name);
          onChange([...files, ...names.filter((name) => !files.includes(name))]);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((name) => (
            <li
              key={name}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--corportal-border-grey)] bg-card pr-1 pl-2 text-xs"
            >
              <Paperclip aria-hidden className="size-3.5 text-muted-foreground" />
              {name}
              <button
                type="button"
                className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Убрать файл ${name}`}
                onClick={() => onChange(files.filter((file) => file !== name))}
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const FieldControl = ({ field, value, error, onChange }: RequestFieldProps) => {
  const id = `request-field-${field.id}`;
  const invalid = error || undefined;
  const text = typeof value === "string" ? value : "";

  switch (field.type) {
    case "text":
      return (
        <Input id={id} className="h-9" value={text} placeholder={field.placeholder} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      );
    case "textarea":
      return (
        <textarea id={id} className={TEXTAREA_CLASS_NAME} value={text} placeholder={field.placeholder} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      );
    case "number":
      return (
        <Input id={id} type="number" min={0} className="h-9 max-w-40" value={text} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      );
    case "money":
      return (
        <div className="relative max-w-60">
          <Input id={id} inputMode="decimal" className="h-9 pr-7" placeholder="0" value={text} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
          <span aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            ₽
          </span>
        </div>
      );
    case "date":
      return (
        <Input id={id} type="date" className="h-9 max-w-48" value={text} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
      );
    case "period": {
      const period = (typeof value === "object" && !Array.isArray(value) ? value : { from: "", to: "" }) as PeriodValue;
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Input id={id} type="date" aria-label={`${field.label}: с`} className="h-9 max-w-48" value={period.from} aria-invalid={invalid} onChange={(event) => onChange({ ...period, from: event.target.value })} />
          <span aria-hidden className="text-muted-foreground">—</span>
          <Input type="date" aria-label={`${field.label}: по`} className="h-9 max-w-48" value={period.to} aria-invalid={invalid} onChange={(event) => onChange({ ...period, to: event.target.value })} />
        </div>
      );
    }
    case "select":
      return <SelectControl id={id} options={field.options} value={text} invalid={error} placeholder="Выберите…" onChange={onChange} />;
    case "person":
      return (
        <SelectControl
          id={id}
          options={REQUEST_PEOPLE}
          value={text}
          invalid={error}
          placeholder="Выберите сотрудника"
          onChange={onChange}
          renderOption={(name) => (
            <span className="flex items-center gap-2">
              <Image src={requestPersonAvatar(name, 40)} alt="" width={20} height={20} className="size-5 rounded-full" />
              {name}
            </span>
          )}
        />
      );
    case "radio":
      return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-col gap-2 pt-0.5">
          {field.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="radio"
                name={id}
                checked={text === option}
                onChange={() => onChange(option)}
                className="size-4 accent-primary"
              />
              {option}
            </label>
          ))}
        </div>
      );
    case "multi": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-2 pt-0.5">
          {field.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                aria-label={option}
                checked={selected.includes(option)}
                onCheckedChange={() => onChange(toggleItem(selected, option))}
              />
              {option}
            </label>
          ))}
        </div>
      );
    }
    case "file":
      return <FileControl id={id} files={Array.isArray(value) ? value : []} invalid={error} onChange={onChange} />;
    case "checkbox":
      return null;
  }
};

export const RequestField = ({ field, value, error, onChange }: RequestFieldProps) => {
  const id = `request-field-${field.id}`;

  if (field.type === "checkbox") {
    return (
      <div id={`${id}-wrap`} className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
          <Checkbox
            id={id}
            checked={value === true}
            aria-labelledby={`${id}-label`}
            aria-invalid={error || undefined}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <span id={`${id}-label`}>
            {field.label}
            {field.required ? <RequiredMark /> : null}
          </span>
        </label>
        {field.description ? <p className="pl-6.5 text-xs text-muted-foreground">{field.description}</p> : null}
        {error ? <p className="pl-6.5 text-xs text-destructive">Отметьте, чтобы продолжить</p> : null}
      </div>
    );
  }

  const labelledByGroup = field.type === "radio" || field.type === "multi";

  return (
    <div id={`${id}-wrap`} className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        {labelledByGroup ? (
          <span id={`${id}-label`} className="text-sm font-medium text-foreground">
            {field.label}
            {field.required ? <RequiredMark /> : null}
          </span>
        ) : (
          <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-foreground">
            {field.label}
            {field.required ? <RequiredMark /> : null}
          </label>
        )}
        {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
      </div>
      <FieldControl field={field} value={value} error={error} onChange={onChange} />
      {error ? <p className="text-xs text-destructive">Заполните это поле</p> : null}
    </div>
  );
};
