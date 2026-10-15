"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  isHttpUrl,
  prepareExternalUrl,
  prepareMetaText,
  type CustomerOrderMeta,
} from "@/features/oms/customer-order-extras";
import { setCustomerOrderMeta } from "@/features/oms/oms-api";
import { DocumentSection } from "@/features/oms/ui/document/document-section";
import { runOmsAction } from "@/features/oms/ui/run-action";

const fieldClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

const refuse = (error: string) => {
  toast.error("Не удалось выполнить действие", { description: error });
};

const ExtrasRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-2 px-4 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-center">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="min-w-0">{children}</div>
  </div>
);

const MetaTextField = ({
  label,
  value,
  pending,
  onCommit,
}: {
  label: string;
  value: string | null;
  pending: boolean;
  onCommit: (next: string) => boolean;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(null);
  }
  const shown = draft ?? value ?? "";

  return (
    <ExtrasRow label={label}>
      <input
        type="text"
        aria-label={label}
        disabled={pending}
        value={shown}
        placeholder="—"
        onFocus={() => {
          if (draft == null) setDraft(value ?? "");
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (onCommit(event.currentTarget.value)) setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(null);
          }
        }}
        className={fieldClassName}
      />
    </ExtrasRow>
  );
};

const MetaUrlField = ({
  value,
  pending,
  onCommit,
}: {
  value: string | null;
  pending: boolean;
  onCommit: (next: string) => boolean;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(null);
  }
  const editing = draft != null;

  if (!editing && isHttpUrl(value)) {
    return (
      <ExtrasRow label="Ссылка в системе учёта">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate text-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
          >
            {value}
          </a>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setDraft(value)}
          >
            Изменить
          </button>
        </div>
      </ExtrasRow>
    );
  }

  return (
    <ExtrasRow label="Ссылка в системе учёта">
      <input
        type="text"
        aria-label="Ссылка в системе учёта"
        disabled={pending}
        autoFocus={editing && isHttpUrl(value)}
        value={draft ?? value ?? ""}
        placeholder="—"
        onFocus={() => {
          if (draft == null) setDraft(value ?? "");
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          if (onCommit(event.currentTarget.value)) setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") setDraft(null);
        }}
        className={fieldClassName}
      />
    </ExtrasRow>
  );
};

/** «Метаданные»: manager-only accounting fields. The tab caption says who can see it. */
export const CustomerOrderMetaTab = ({
  orderId,
  meta,
  reload,
}: {
  orderId: string;
  meta: CustomerOrderMeta;
  reload: () => Promise<void>;
}) => {
  const [pending, setPending] = useState(false);

  const commit = (key: keyof CustomerOrderMeta, raw: string, prepare: (raw: string) => { ok: true; value: string | null } | { ok: false; error: string }): boolean => {
    const prepared = prepare(raw);
    if (!prepared.ok) {
      refuse(prepared.error);
      return false;
    }
    if (prepared.value === meta[key]) return true;
    const next = { ...meta, [key]: prepared.value };
    setPending(true);
    void runOmsAction(() => setCustomerOrderMeta(orderId, next), "Метаданные сохранены", reload).finally(() =>
      setPending(false),
    );
    return true;
  };

  return (
    <DocumentSection title="Метаданные">
      <p className="border-b border-border/60 px-4 py-3 text-sm text-muted-foreground">Видит только менеджер</p>
      <div className="divide-y divide-border/60">
        <MetaTextField
          label="ID в системе учёта"
          value={meta.externalId}
          pending={pending}
          onCommit={(raw) => commit("externalId", raw, prepareMetaText)}
        />
        <MetaTextField
          label="Номер отслеживания"
          value={meta.trackNumber}
          pending={pending}
          onCommit={(raw) => commit("trackNumber", raw, prepareMetaText)}
        />
        <MetaTextField
          label="Номер заказа поставщика"
          value={meta.supplierOrderNumber}
          pending={pending}
          onCommit={(raw) => commit("supplierOrderNumber", raw, prepareMetaText)}
        />
        <MetaUrlField
          value={meta.externalUrl}
          pending={pending}
          onCommit={(raw) => commit("externalUrl", raw, prepareExternalUrl)}
        />
      </div>
    </DocumentSection>
  );
};
