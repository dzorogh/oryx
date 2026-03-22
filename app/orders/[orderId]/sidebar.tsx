import Link from "next/link";
import { Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORDER_PRESETS } from "@/domain/packing/constants";
import { cn } from "@/lib/utils";

type SidebarProps = {
  orderId: number;
};

export const Sidebar = ({ orderId }: SidebarProps) => (
  <>
    {ORDER_PRESETS.map((preset) => {
      const active = preset.orderId === orderId;
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
              href={`/orders/${preset.orderId}`}
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
          <span className="min-w-0 truncate">{preset.label}</span>
        </Button>
      );
    })}
  </>
);
