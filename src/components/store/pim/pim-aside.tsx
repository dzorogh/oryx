import { ModuleAsideFrame } from "@/components/layout/module-aside-frame";
import { PimOrderNav } from "./pim-order-nav";

type PimAsideProps = {
  /** Переопределение активного заказа (например в unit-тестах) */
  activeOrderId?: number;
};

type PimAsideContentProps = {
  activeOrderId?: number;
  onItemClick?: () => void;
};

export const PimAsideContent = ({ activeOrderId, onItemClick }: PimAsideContentProps) => (
  <>
    <p className="shrink-0 font-medium text-xs text-muted-foreground">Orders</p>
    <nav aria-label="Orders" className="min-h-0 flex-1 overflow-y-auto">
      <PimOrderNav activeOrderId={activeOrderId} onItemClick={onItemClick} />
    </nav>
  </>
);

export const PimAside = ({ activeOrderId }: PimAsideProps) => (
  <ModuleAsideFrame title="Store" ariaLabel="Store context and orders">
    <PimAsideContent activeOrderId={activeOrderId} />
  </ModuleAsideFrame>
);
