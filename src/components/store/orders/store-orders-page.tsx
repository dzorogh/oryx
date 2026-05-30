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
              <BreadcrumbLink render={<Link href="/store/catalog" aria-label="Open Store section" />}>
                Store
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Orders</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <StoreOrdersToolbar />

        <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)]">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-3 text-xs">Order ID</TableHead>
                  <TableHead className="h-9 px-3 text-xs">Name</TableHead>
                  <TableHead className="h-9 px-3 text-xs">Items</TableHead>
                  <TableHead className="h-9 px-3 text-xs text-right">Action</TableHead>
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
                        aria-label={`Open packing for order ${preset.orderId}`}
                      >
                        Open packing
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
