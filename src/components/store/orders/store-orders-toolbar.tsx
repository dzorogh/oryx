import { Card, CardHeader } from "@/components/ui/card";

export const StoreOrdersToolbar = () => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 pb-0">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Orders</h1>
        <p className="text-xs text-muted-foreground">
          Store order list. Open packing view for detailed order fulfillment.
        </p>
      </div>
    </CardHeader>
  </Card>
);
