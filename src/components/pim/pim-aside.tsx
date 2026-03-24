import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { ScrollableRegion } from "@/components/layout/scrollable-region";
import { PimOrderNav } from "./pim-order-nav";

type PimAsideProps = {
  /** Переопределение активного заказа (например в unit-тестах) */
  activeOrderId?: number;
};

export const PimAside = ({ activeOrderId }: PimAsideProps) => (
  <LeftDockShell
    className="left-12 z-30 w-[min(200px,40vw)] overflow-hidden border-[var(--corportal-border-grey)] bg-[var(--corportal-surface-muted)] sm:w-[200px]"
    ariaLabel="Контекст и заказы"
  >
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <div className="flex shrink-0 items-center gap-1">
        <span className="min-w-0 truncate text-sm font-bold leading-[1.66] text-foreground">
          Магазин и каталог
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
        <p className="shrink-0 font-medium text-xs text-muted-foreground">Заказы</p>
        <ScrollableRegion className="min-h-0 flex-1" ariaLabel="Заказы">
          <PimOrderNav activeOrderId={activeOrderId} />
        </ScrollableRegion>
      </div>
    </div>
  </LeftDockShell>
);
