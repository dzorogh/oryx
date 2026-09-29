"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deleteDocumentFile,
  documentFileDownloadUrl,
  uploadDocumentFile,
} from "@/features/logistics/logistics-api";
import {
  DOCUMENT_FILE_LIMIT_LABEL,
  documentFileSizeError,
  documentFileStoragePath,
  fileBaseName,
  fileExtension,
  formatFileSize,
  type DocumentFile,
} from "@/features/logistics/customer-order-oms";
import { formatMetaTimestamp } from "@/features/logistics/logistics-labels";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";

const uniqueKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** «Файлы»: invoices, contracts, packing lists in the private `store-documents` bucket. */
export const CustomerOrderFilesTab = ({
  orderId,
  files,
  reload,
}: {
  orderId: string;
  files: DocumentFile[];
  reload: () => Promise<void>;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentFile | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const upload = async (file: File) => {
    const tooBig = documentFileSizeError(file.size);
    if (tooBig) {
      toast.error("Файл не загружен", { description: tooBig });
      return;
    }
    setUploading(file.name);
    await runLogisticsAction(
      () =>
        uploadDocumentFile({
          documentId: orderId,
          file,
          storagePath: documentFileStoragePath(orderId, file.name, uniqueKey()),
        }),
      `Файл «${file.name}» загружен`,
      reload,
    );
    setUploading(null);
  };

  const download = async (file: DocumentFile) => {
    try {
      const href = await documentFileDownloadUrl(file.storagePath, file.name);
      // The signed URL answers with Content-Disposition: attachment, so the page stays in place.
      window.location.assign(href);
    } catch (caught: unknown) {
      toast.error("Не удалось скачать файл", {
        description: translateLogisticsError(caught instanceof Error ? caught.message : "Попробуйте ещё раз."),
      });
    }
  };

  return (
    <DocumentSection
      title="Файлы"
      tools={
        <>
          <span className="text-xs text-muted-foreground">До {DOCUMENT_FILE_LIMIT_LABEL} на файл</span>
          <Button type="button" size="sm" disabled={uploading != null} onClick={() => inputRef.current?.click()}>
            <Upload className="size-3.5" aria-hidden />
            {uploading ? "Загружаем…" : "Загрузить файл"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            aria-label="Файл для загрузки"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </>
      }
    >
      {files.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Файлов пока нет. Загрузите счёт, договор или упаковочный лист — до {DOCUMENT_FILE_LIMIT_LABEL}.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {files.map((file) => {
            const extension = fileExtension(file.name);
            return (
              <li key={file.id} className="group/file flex items-center gap-3 px-4 py-2.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block max-w-full truncate text-left text-sm font-medium hover:underline hover:underline-offset-2"
                    onClick={() => void download(file)}
                    title={file.name}
                  >
                    {fileBaseName(file.name)}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.sizeBytes)} · {formatMetaTimestamp(file.createdAt)}
                  </p>
                </div>
                {extension ? (
                  <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {extension}
                  </span>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Скачать ${file.name}`}
                  onClick={() => void download(file)}
                >
                  <Download className="size-3.5" aria-hidden />
                  Скачать
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Удалить ${file.name}`}
                  onClick={() => {
                    setDeleteError(null);
                    setDeleting(file);
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Удалить
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {uploading ? (
        <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">Загружаем «{uploading}»…</p>
      ) : null}
      <DialogShell
        open={deleting != null}
        onOpenChange={(next) => {
          if (!next && !deletePending) setDeleting(null);
        }}
        size="sm"
        kicker={deleting?.name}
        title="Удалить файл?"
        dismissLabel="Назад"
        submitLabel="Удалить файл"
        pendingLabel="Удаляем…"
        submitting={deletePending}
        serverError={deleteError}
        onSubmit={() => {
          if (!deleting) return;
          setDeletePending(true);
          setDeleteError(null);
          void deleteDocumentFile(deleting.id)
            .then(async () => {
              toast.success("Файл удалён");
              setDeleting(null);
              await reload();
            })
            .catch((caught: unknown) => {
              setDeleteError(translateLogisticsError(caught instanceof Error ? caught.message : "Файл не удалён"));
            })
            .finally(() => setDeletePending(false));
        }}
      >
        <p className="text-sm">Файл пропадёт из заказа, восстановить его нельзя.</p>
      </DialogShell>
    </DocumentSection>
  );
};
