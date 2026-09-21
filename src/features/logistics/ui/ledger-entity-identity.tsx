import Link from "next/link";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";

export const LedgerEntityIdentity = ({
  kind,
  code,
  href,
}: {
  kind: string;
  code?: string | null;
  href?: string | null;
}) => (
  <div className="min-w-0">
    {href ? (
      <Link href={href} className="text-sm font-medium text-primary hover:underline">
        {kind}
      </Link>
    ) : (
      <span className="text-sm font-medium">{kind}</span>
    )}
    {code ? (
      <div className="mt-0.5">
        <LogisticsCodeBadge code={code} href={href ?? undefined} />
      </div>
    ) : null}
  </div>
);
