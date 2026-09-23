// english-ui:ignore-file
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StoreOrdersToolbar } from "@/components/store/orders/store-orders-toolbar";
import { ORDER_PRESETS } from "@/domain/packing/constants";

export const StoreOrdersPage = () => (
  <main className="min-h-screen bg-muted/30">
    <section className="p-4 py-4">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/store/catalog" aria-label="Открыть магазин" />}>
                  Магазин
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Заказы</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <StoreOrdersToolbar />

        <Card
          size="sm"
          className="gap-0 overflow-hidden py-0 ring-1 ring-[var(--corportal-border-grey)] data-[size=sm]:gap-0 data-[size=sm]:py-0"
        >
          <CardContent className="px-0 group-data-[size=sm]/card:px-0 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-3 text-xs">Номер заказа</TableHead>
                  <TableHead className="h-9 px-3 text-xs">Название</TableHead>
                  <TableHead className="h-9 px-3 text-xs">Позиции</TableHead>
                  <TableHead className="h-9 px-3 text-xs text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ORDER_PRESETS.map((preset) => (
                  <TableRow key={preset.orderId}>
                    <TableCell className="px-3 py-2 text-sm font-semibold">{preset.orderId}</TableCell>
                    <TableCell className="px-3 py-2 text-sm">{preset.label}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-muted-foreground">{preset.order.length}</TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      <Link
                        href={`/store/orders/${preset.orderId}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                        aria-label={`Открыть упаковку заказа ${preset.orderId}`}
                      >
                        Открыть упаковку
                        <ArrowUpRight aria-hidden className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
);
