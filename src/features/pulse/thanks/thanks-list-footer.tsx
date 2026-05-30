"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ThanksListFooterProps = {
  shownCount: number;
  totalCount: number;
  visiblePage: number;
  totalPages: number;
  paginationItems: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
};

export const ThanksListFooter = ({
  shownCount,
  totalCount,
  visiblePage,
  totalPages,
  paginationItems,
  onPageChange,
}: ThanksListFooterProps) => {
  const isFirstPage = visiblePage <= 1;
  const isLastPage = visiblePage >= totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-muted-foreground">
        Showing {shownCount} of {totalCount}
      </span>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Previous"
              aria-disabled={isFirstPage}
              className={isFirstPage ? "pointer-events-none opacity-50" : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (isFirstPage) {
                  return;
                }
                onPageChange(visiblePage - 1);
              }}
            />
          </PaginationItem>

          {paginationItems.map((item, index) => (
            <PaginationItem key={item === "ellipsis" ? `ellipsis-${index}` : `page-${item}`}>
              {item === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  isActive={item === visiblePage}
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(item);
                  }}
                  aria-label={`Go to page ${item}`}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              text="Next"
              aria-disabled={isLastPage}
              className={isLastPage ? "pointer-events-none opacity-50" : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (isLastPage) {
                  return;
                }
                onPageChange(visiblePage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
