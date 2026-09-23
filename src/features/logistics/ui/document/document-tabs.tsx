// english-ui:ignore-file
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { tabIdFromHash } from "@/features/logistics/ui/document/document-tab-hash";
import { cn } from "@/lib/utils";

export type DocumentTab = {
  id: string;
  label: string;
  count?: number | null;
  panel: ReactNode;
};

const readHashTab = (tabIds: string[]): string | null =>
  typeof window === "undefined" ? null : tabIdFromHash(window.location.hash, tabIds);

export const DocumentTabs = ({
  tabs,
  ariaLabel = "Разделы документа",
  className,
}: {
  tabs: DocumentTab[];
  ariaLabel?: string;
  className?: string;
}) => {
  const baseId = useId();
  const tabIds = tabs.map((tab) => tab.id);
  const [activeId, setActiveId] = useState(() => tabIds[0] ?? "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = useCallback(
    (id: string, { focusPanel = false }: { focusPanel?: boolean } = {}) => {
      if (!tabIds.includes(id)) {
        return;
      }
      setActiveId(id);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${id}`);
      }
      if (focusPanel) {
        requestAnimationFrame(() => {
          document.getElementById(`${baseId}-panel-${id}`)?.focus();
        });
      }
    },
    [baseId, tabIds],
  );

  useEffect(() => {
    const fromHash = readHashTab(tabIds);
    if (fromHash) {
      setActiveId(fromHash);
    } else if (!tabIds.includes(activeId)) {
      setActiveId(tabIds[0] ?? "");
    }

    const onHash = () => {
      const next = readHashTab(tabIds);
      if (next) {
        setActiveId(next);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync hash on mount / tab set change
  }, [tabIds.join("|")]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else {
      return;
    }
    event.preventDefault();
    const id = tabs[next]?.id;
    if (!id) {
      return;
    }
    select(id);
    tabRefs.current[next]?.focus();
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="-mx-1 flex gap-0.5 overflow-x-auto overflow-y-hidden px-1 shadow-[inset_0_-1px_0_var(--border)]"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-controls={`${baseId}-panel-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-1.5 px-3 pt-2.5 pb-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                selected && "font-semibold text-foreground",
              )}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
              {tab.count != null ? (
                <span
                  className={cn(
                    "rounded-full bg-muted px-1.5 text-xs tabular-nums leading-[18px] text-muted-foreground",
                    selected && "bg-foreground text-background",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
              {selected ? (
                <span
                  aria-hidden
                  className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-foreground"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={!selected}
            tabIndex={selected ? 0 : undefined}
            className="mt-3 min-w-0 outline-none"
          >
            {selected ? tab.panel : null}
          </div>
        );
      })}
    </div>
  );
};
