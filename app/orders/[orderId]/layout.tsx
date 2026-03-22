import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { ORDER_PRESETS } from "@/domain/packing/constants";
import { IconRail } from "./icon-rail";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

const allowedOrderIds = new Set(ORDER_PRESETS.map((preset) => preset.orderId));

type OrderPackingLayoutFrameProps = {
  orderId: number;
  sidebarNav: ReactNode;
  children: ReactNode;
};

/** Разметка страницы заказа: рейл Corportal, сайдбар, заголовок. Экспорт для unit-тестов. */
/** Отступ слева под фиксированные рейл (3rem) + сайдбар — ширина сайдбара как у колонки */
const mainOffsetClass =
  "pl-[calc(3rem+min(200px,40vw))] sm:pl-[calc(3rem+200px)]";

export const OrderPackingLayoutFrame = ({ orderId, sidebarNav, children }: OrderPackingLayoutFrameProps) => (
  <div className="corportal-shell-bg relative min-h-screen">
    <IconRail />

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
            {sidebarNav}
          </nav>
        </div>
      </div>
    </aside>

    <div
      className={`flex min-h-screen min-w-0 flex-col bg-[var(--corportal-surface-white)] ${mainOffsetClass}`}
    >
      <Header orderId={orderId} />
      {children}
    </div>
  </div>
);

type OrderLayoutProps = {
  children: ReactNode;
  params: Promise<{ orderId: string }>;
};

const OrderLayout = async ({ children, params }: OrderLayoutProps) => {
  const { orderId: raw } = await params;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !allowedOrderIds.has(parsed)) {
    notFound();
  }

  return (
    <OrderPackingLayoutFrame orderId={parsed} sidebarNav={<Sidebar orderId={parsed} />}>
      {children}
    </OrderPackingLayoutFrame>
  );
};

export default OrderLayout;
