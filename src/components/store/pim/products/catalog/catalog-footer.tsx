// english-ui:ignore-file
import { CardFooter } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type CatalogFooterProps = {
  shownCount: number;
  totalCount: number;
  visiblePage: number;
  totalPages: number;
  paginationItems: Array<number | "ellipsis">;
  onPageChange: (page: number) => void;
};

export const CatalogFooter = ({
  shownCount,
  totalCount,
  visiblePage,
  totalPages,
  paginationItems,
  onPageChange,
}: CatalogFooterProps) => {
  const isFirstPage = visiblePage <= 1;
  const isLastPage = visiblePage >= totalPages;

  return (
    <CardFooter className="justify-between border-t bg-background px-3">
      <span className="text-xs text-muted-foreground">
        Показано {shownCount} из {totalCount}
      </span>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Назад"
              aria-label="Предыдущая страница"
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
                  aria-label={`Перейти на страницу ${item}`}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              text="Вперёд"
              aria-label="Следующая страница"
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
    </CardFooter>
  );
};
