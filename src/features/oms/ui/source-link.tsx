import { hrefForDocument } from "@/features/oms/oms-availability";
import { documentLabel } from "@/features/oms/oms-lookups";
import type { DocumentType, OmsSnapshot } from "@/features/oms/oms-types";
import { OmsCodeBadge } from "@/features/oms/ui/oms-code-badge";

export const DocumentLink = ({
  snapshot,
  documentType,
  documentId,
  className,
}: {
  snapshot: OmsSnapshot;
  documentType: DocumentType;
  documentId: string;
  className?: string;
}) => {
  const label = documentLabel(snapshot, documentType, documentId);
  return <OmsCodeBadge code={label} href={hrefForDocument(documentType, documentId)} className={className} />;
};

export const SourceLink = ({
  snapshot,
  sourceType,
  sourceId,
  documentType,
  documentId,
  className,
}: {
  snapshot: OmsSnapshot;
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
