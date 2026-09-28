/** PostgREST on the Oryx demo stack caps every response at 1000 rows (`db-max-rows`). */
export const POSTGREST_PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Reads every row of a query page by page. `buildPage` must apply a stable `order(...)`
 * and `range(from, to)`, otherwise pages can overlap or skip rows.
 */
export const fetchAllRows = async <T>(buildPage: (from: number, to: number) => PageResult<T>): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) {
      return rows;
    }
  }
};
