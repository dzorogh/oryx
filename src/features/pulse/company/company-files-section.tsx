import { Download, FileText, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  COMPANY_COUNT_BADGE_CLASS,
  COMPANY_INLINE_ICON_CLASS,
  COMPANY_SECTION_ICON_CLASS,
} from "./company-icon-styles";
import type { CompanyFile } from "./company-cabinet-demo-data";

type CompanyFilesSectionProps = {
  files: CompanyFile[];
};

const formatUploadedAt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

const getFileDownloadHref = (file: CompanyFile) =>
  file.downloadHref ?? `${file.href}?download=${encodeURIComponent(file.id)}`;

type CompanyFileRowProps = {
  file: CompanyFile;
};

const CompanyFileRow = ({ file }: CompanyFileRowProps) => (
  <li>
    <a
      href={getFileDownloadHref(file)}
      download={file.name}
      className="group flex w-full items-center gap-2 px-2.5 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`Download ${file.name}`}
    >
      <FileText className={COMPANY_INLINE_ICON_CLASS} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{file.name}</span>
      <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">{file.sizeLabel}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">{formatUploadedAt(file.uploadedAt)}</span>
      <Download
        className={cn(
          COMPANY_INLINE_ICON_CLASS,
          "shrink-0 text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden
      />
    </a>
  </li>
);

export const CompanyFilesSection = ({ files }: CompanyFilesSectionProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0">
    <div className="flex items-center gap-2 border-b border-[var(--corportal-border-grey)] px-3 py-2 sm:px-3.5">
      <FolderOpen className={COMPANY_SECTION_ICON_CLASS} aria-hidden />
      <h2 className="text-sm font-semibold text-foreground">Files</h2>
      {files.length > 0 ? <span className={COMPANY_COUNT_BADGE_CLASS}>{files.length}</span> : null}
    </div>

    <div className="p-2 sm:p-2.5">
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--corportal-border-grey)] bg-muted/20 px-4 py-6 text-center">
          <FolderOpen className={COMPANY_SECTION_ICON_CLASS} strokeWidth={1.5} aria-hidden />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">No company files yet</p>
            <p className="text-xs text-muted-foreground">Uploaded documents will appear here.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--corportal-border-grey)] overflow-hidden rounded-lg border border-[var(--corportal-border-grey)]">
          {files.map((file) => (
            <CompanyFileRow key={file.id} file={file} />
          ))}
        </ul>
      )}
    </div>
  </Card>
);
