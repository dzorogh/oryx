import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PimSecondaryText } from "./pim-secondary-text";

type OrderPageHeaderProps = {
  orderId: number;
};

export const OrderPageHeader = ({ orderId }: OrderPageHeaderProps) => (
  <header className="px-4 py-4 sm:px-6 flex flex-col gap-4">
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <PimSecondaryText>Магазин и каталог</PimSecondaryText>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <PimSecondaryText>Заказы</PimSecondaryText>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-[12px] font-normal text-[#3d4c6a]">Заказ №{orderId}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#3d4c6a]">Заказ №{orderId}</h1>
      </div>
    </div>
  </header>
);
