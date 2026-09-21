// english-ui:ignore-file
import { Card, CardHeader } from "@/components/ui/card";

export const StoreOrdersToolbar = () => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 pb-0">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Заказы</h1>
      </div>
    </CardHeader>
  </Card>
);
