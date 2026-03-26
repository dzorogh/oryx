import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type RailFaviconIconProps = ComponentPropsWithoutRef<"div">;

export const RailFaviconIcon = ({ className, ...rest }: RailFaviconIconProps) => (
  <div
    {...rest}
    className={cn("relative size-6 shrink-0 overflow-hidden rounded-sm bg-corportal-rail-favicon-surface", className)}
    aria-hidden
  >
    <div className="absolute inset-[20.17%_44.64%_18.88%_21.46%]">
      <svg
        className="block size-full text-corportal-rail-favicon-ink"
        viewBox="0 0 40.6867 73.133"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M35.7218 29.4766L33.2646 26.277L32.8186 25.7017L12.8918 0H0L30.7107 38.8822V73.1162L40.6867 73.133V35.5777L35.7218 29.4766Z"
          fill="currentColor"
        />
      </svg>
    </div>
    <div className="absolute inset-[20.17%_21.03%_58.8%_52.79%]">
      <svg
        className="block size-full text-corportal-rail-favicon-ink"
        viewBox="0 0 31.4163 25.236"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M31.4163 0C31.4163 0 9.74333 20.7779 9.24426 21.2637C11.2488 18.0617 13.7368 7.90369 19.2391 0.0168972L0 25.236H12.3769L31.4163 0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  </div>
);

