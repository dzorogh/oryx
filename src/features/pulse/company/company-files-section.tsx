import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export const CompanyFilesSection = ({ files }: CompanyFilesSectionProps) => (
  <Card size="sm" className="flex h-full flex-col ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0">
    <div className="flex items-center gap-2 border-b border-[var(--corportal-border-grey)] px-3 py-2 sm:px-3.5">
      <FolderOpen className={COMPANY_SECTION_ICON_CLASS} aria-hidden />
      <h2 className="text-sm font-semibold text-foreground">Company files</h2>
      {files.length > 0 ? <span className={COMPANY_COUNT_BADGE_CLASS}>{files.length}</span> : null}
    </div>

    <div className="flex flex-1 flex-col p-2 sm:p-2.5">
      {files.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--corportal-border-grey)] bg-muted/20 px-4 py-6 text-center">
          <FolderOpen className={COMPANY_SECTION_ICON_CLASS} strokeWidth={1.5} aria-hidden />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">No company files yet</p>
            <p className="text-xs text-muted-foreground">Uploaded documents will appear here.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--corportal-border-grey)] overflow-hidden rounded-lg border border-[var(--corportal-border-grey)]">
          {files.map((file) => (
            <li key={file.id}>
              <Link
                href={file.href}
                className="flex min-w-0 items-center gap-2 px-2.5 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`Open file ${file.name}`}
              >
                <FileText className={COMPANY_INLINE_ICON_CLASS} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{file.name}</span>
                <span className="hidden shrink-0 text-[10px] text-muted-foreground md:inline">{file.sizeLabel}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatUploadedAt(file.uploadedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  </Card>
);
