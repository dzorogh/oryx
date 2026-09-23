// english-ui:ignore-file
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

export const DOCUMENT_TABLE_HEAD_CLASS =
  "h-9 px-3 text-xs font-medium text-muted-foreground";

/** Rows span the card edge to edge; only the outer cells keep an inset. */
export const FLUSH_TABLE_CLASS =
  "[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4";

type LogisticsTableCardProps = {
  headers: string[];
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
  title?: string;
  action?: ReactNode;
  footer?: ReactNode;
  /** Numeric column indices (0-based) get text-right + tabular-nums on the header. */
  numericColumns?: number[];
  /** Skip outer Card chrome — use inside DocumentSection. */
  embedded?: boolean;
  /** Right-align headers by index (action columns with empty label). */
  className?: string;
};

export const LogisticsTableCard = ({
  headers,
  children,
  empty,
  isEmpty,
  title,
  action,
  footer,
  numericColumns = [],
  embedded = false,
  className,
}: LogisticsTableCardProps) => {
  const numeric = new Set(numericColumns);
  const table = (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header, index) => (
              <TableHead
                key={`${header || "empty"}-${index}`}
                className={cn(
                  DOCUMENT_TABLE_HEAD_CLASS,
                  numeric.has(index) && "text-right",
                  !header && "w-10",
                )}
              >
                {header || <span className="sr-only">Действия</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="px-3 py-8 text-center text-sm text-muted-foreground"
              >
                {empty ?? "Пока нет записей."}
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
      {footer}
    </>
  );

  if (embedded) {
    return <div className={cn("min-w-0", FLUSH_TABLE_CLASS, className)}>{table}</div>;
  }

  return (
    <Card
      size="sm"
      className={cn(
        logisticsCardClass,
        "gap-0 overflow-hidden py-0 data-[size=sm]:gap-0 data-[size=sm]:py-0",
        className,
      )}
    >
      {title || action ? (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <CardContent className={cn("px-0 group-data-[size=sm]/card:px-0", FLUSH_TABLE_CLASS)}>{table}</CardContent>
    </Card>
  );
};
