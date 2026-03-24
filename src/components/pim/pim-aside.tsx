import { ModuleAsideFrame } from "@/components/layout/module-aside-frame";
import { PimOrderNav } from "./pim-order-nav";

type PimAsideProps = {
  /** Переопределение активного заказа (например в unit-тестах) */
  activeOrderId?: number;
};

export const PimAside = ({ activeOrderId }: PimAsideProps) => (
  <ModuleAsideFrame title="Магазин и каталог" ariaLabel="Контекст и заказы">
    <p className="shrink-0 font-medium text-xs text-muted-foreground">Заказы</p>
    <nav aria-label="Заказы" className="min-h-0 flex-1 overflow-y-auto">
      <PimOrderNav activeOrderId={activeOrderId} />
    </nav>
  </ModuleAsideFrame>
);
