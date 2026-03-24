"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORDER_PRESETS } from "@/domain/packing/constants";
import { cn } from "@/lib/utils";
import { PimSecondaryText } from "./pim-secondary-text";

const orderHref = (orderId: number) => `/pim/orders/${orderId}`;

type PimOrderNavProps = {
  /** Для тестов без полного роутера Next.js */
  activeOrderId?: number;
};

export const PimOrderNav = ({ activeOrderId: activeOrderIdProp }: PimOrderNavProps) => {
  const params = useParams<{ orderId?: string }>();
  const raw = params?.orderId;
  const fromParams = raw != null && raw !== "" ? Number(raw) : NaN;
  const activeOrderId =
    activeOrderIdProp ?? (Number.isFinite(fromParams) ? fromParams : undefined);

  return (
    <>
      {ORDER_PRESETS.map((preset) => {
        const active = activeOrderId !== undefined && preset.orderId === activeOrderId;
        return (
          <Button
            key={preset.orderId}
            variant="ghost"
            nativeButton={false}
            className={cn(
              "h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-normal leading-[1.2] text-[#778297] hover:bg-[#e9e9f1]/80 hover:text-[#3d4c6a]",
              active && "bg-[#e9e9f1] font-medium text-[#3d4c6a]",
            )}
            render={
              <Link
                href={orderHref(preset.orderId)}
                scroll={false}
                role="link"
                aria-label={`Открыть ${preset.label}`}
                aria-current={active ? "page" : undefined}
                className="inline-flex w-full items-center gap-2"
              />
            }
          >
            <Circle
              aria-hidden
              className={cn("size-3 shrink-0 text-[#778297]", active && "fill-[#3d4c6a] text-[#3d4c6a]")}
              strokeWidth={2}
            />
            <PimSecondaryText className="min-w-0 truncate">{preset.label}</PimSecondaryText>
          </Button>
        );
      })}
    </>
  );
};
