import { hrefForDocument } from "@/features/logistics/logistics-availability";
import { documentLabel } from "@/features/logistics/logistics-lookups";
import type { DocumentType, LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const DocumentLink = ({
  snapshot,
  documentType,
  documentId,
  className,
}: {
  snapshot: LogisticsSnapshot;
  documentType: DocumentType;
  documentId: string;
  className?: string;
}) => {
  const label = documentLabel(snapshot, documentType, documentId);
  return <LogisticsCodeBadge code={label} href={hrefForDocument(documentType, documentId)} className={className} />;
};

export const SourceLink = ({
  snapshot,
  sourceType,
  sourceId,
  documentType,
  documentId,
  className,
}: {
  snapshot: LogisticsSnapshot;
  sourceType?: DocumentType;
  sourceId?: string;
  documentType?: DocumentType;
  documentId?: string;
  className?: string;
}) => {
  const type = documentType ?? sourceType;
  const id = documentId ?? sourceId;
  if (!type || !id) {
    return null;
  }
  return <DocumentLink snapshot={snapshot} documentType={type} documentId={id} className={className} />;
};
