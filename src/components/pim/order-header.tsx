import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type OrderPageHeaderProps = {
  orderId: number;
};

export const OrderPageHeader = ({ orderId }: OrderPageHeaderProps) => (
  <header className="border-b border-[#d7dae0] bg-white px-4 py-4 sm:px-6">
    <Breadcrumb>
      <BreadcrumbList className="sm:gap-2">
        <BreadcrumbItem>
          <span className="text-[12px] text-[#778297]">Магазин и каталог</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <span className="text-[12px] text-[#778297]">Заказы</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-[12px] font-normal text-[#3d4c6a]">Заказ №{orderId}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
    <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#3d4c6a]">Заказ №{orderId}</h1>
      </div>
    </div>
  </header>
);
