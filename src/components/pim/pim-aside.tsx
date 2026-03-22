import { Star } from "lucide-react";
import { PimOrderNav } from "./pim-order-nav";

type PimAsideProps = {
  /** Переопределение активного заказа (например в unit-тестах) */
  activeOrderId?: number;
};

export const PimAside = ({ activeOrderId }: PimAsideProps) => (
  <aside
    className="fixed left-12 top-0 z-30 flex h-svh w-[min(200px,40vw)] flex-col overflow-hidden border-r border-[var(--corportal-border-grey)] bg-[var(--corportal-surface-muted)] sm:w-[200px]"
    aria-label="Контекст и заказы"
  >
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <div className="flex shrink-0 items-center gap-1 px-1 py-1">
        <div className="flex size-8 shrink-0 items-center justify-center rounded p-0.5">
          <Star aria-hidden className="size-4 text-[#3d4c6a]" strokeWidth={2} />
        </div>
        <span className="min-w-0 truncate text-[12px] font-bold leading-[1.66] text-[#3d4c6a]">
          Магазин и каталог
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2">
        <p className="shrink-0 px-3 text-[10px] font-medium leading-[1.6] text-[#3d4c6a]/50">Заказы</p>
        <nav className="min-h-0 flex-1 overflow-y-auto px-1" aria-label="Заказы">
          <PimOrderNav activeOrderId={activeOrderId} />
        </nav>
      </div>
    </div>
  </aside>
);
