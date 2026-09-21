// english-ui:ignore-file
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";

type LogisticsTableCardProps = {
  headers: string[];
  children: ReactNode;
  empty?: string;
  isEmpty?: boolean;
  title?: string;
  action?: ReactNode;
  footer?: ReactNode;
};

export const LogisticsTableCard = ({
  headers,
  children,
  empty,
  isEmpty,
  title,
  action,
  footer,
}: LogisticsTableCardProps) => (
  <Card size="sm" className={logisticsCardClass}>
    {title || action ? (
      <div className="flex items-center justify-between gap-2 px-3">
        {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
        {action}
      </div>
    ) : null}
    <CardContent className="px-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((header) => (
              <TableHead key={header} className="h-9 px-3 text-xs">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="px-3 py-8 text-center text-sm text-muted-foreground">
                {empty ?? "Пока нет записей."}
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
      {footer}
    </CardContent>
  </Card>
);
