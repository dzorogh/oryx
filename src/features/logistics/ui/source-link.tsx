import { hrefForSource } from "@/features/logistics/logistics-availability";
import { sourceLabel } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, SourceType } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const SourceLink = ({
  snapshot,
  sourceType,
  sourceId,
  className,
}: {
  snapshot: LogisticsSnapshot;
  sourceType: SourceType;
  sourceId: string;
  className?: string;
}) => {
  const label = sourceLabel(snapshot, sourceType, sourceId);
  return <LogisticsCodeBadge code={label} href={hrefForSource(sourceType, sourceId)} className={className} />;
};
