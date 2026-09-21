// english-ui:ignore-file
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ProductionOrderSectionId = "products" | "outputs" | "movements";

const SECTIONS: Array<{ id: ProductionOrderSectionId; label: string }> = [
  { id: "products", label: "Товары" },
  { id: "outputs", label: "Выпуски" },
  { id: "movements", label: "Движения" },
];

export const ProductionOrderSectionIndex = ({
  counts,
}: {
  counts: Record<ProductionOrderSectionId, number>;
}) => {
  const [current, setCurrent] = useState<ProductionOrderSectionId>("products");

  useEffect(() => {
    const stickyOffset = 72;
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (nodes.length === 0) {
      return;
    }

    const update = () => {
      const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (bottom) {
        const lastVisible = [...SECTIONS]
          .reverse()
          .find((section) => {
            const node = document.getElementById(section.id);
            if (!node) {
              return false;
            }
            const rect = node.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > stickyOffset;
          });
        if (lastVisible) {
          setCurrent(lastVisible.id);
          return;
        }
      }
      let active: ProductionOrderSectionId = "products";
      for (const section of SECTIONS) {
        const node = document.getElementById(section.id);
        if (!node) {
          continue;
        }
        if (node.getBoundingClientRect().top - stickyOffset <= 0) {
          active = section.id;
        }
      }
      setCurrent(active);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [counts.products, counts.outputs, counts.movements]);

  const activate = (id: ProductionOrderSectionId, viaKeyboard: boolean) => {
    setCurrent(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
    if (!viaKeyboard) {
      return;
    }
    const heading = document.querySelector<HTMLElement>(`#${id} h2`);
    heading?.focus();
  };

  return (
    <nav aria-label="Разделы заказа" className="min-w-0 lg:sticky lg:top-3 lg:self-start">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1.5 lg:flex-col lg:flex-nowrap">
        {SECTIONS.map((section) => {
          const active = current === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "inline-flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground motion-reduce:transition-none lg:min-h-9 lg:flex-none",
                active && "bg-muted font-semibold text-foreground",
              )}
              onClick={(event) => {
                const viaKeyboard = event.detail === 0;
                setCurrent(section.id);
                if (!viaKeyboard) {
                  return;
                }
                event.preventDefault();
                activate(section.id, true);
              }}
            >
              <span>{section.label}</span>
              <span className="tabular-nums text-muted-foreground">{counts[section.id]}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};
