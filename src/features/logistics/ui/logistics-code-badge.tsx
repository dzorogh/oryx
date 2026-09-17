import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const LogisticsCodeBadge = ({
  code,
  href,
  className,
  title,
}: {
  code: string;
  href?: string | null;
  className?: string;
  title?: string;
}) => {
  if (!code) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      title={title}
      className={cn("font-mono", className)}
      render={href ? <Link href={href} /> : undefined}
    >
      {code}
    </Badge>
  );
};
