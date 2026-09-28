import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchAllRows, POSTGREST_PAGE_SIZE } from "@/lib/supabase/fetch-all-rows";

describe("fetchAllRows", () => {
  it("читает все строки по страницам в порядке range", async () => {
    const total = 2345;
    const all = Array.from({ length: total }, (_, index) => ({ id: index + 1 }));
    const ranges: Array<[number, number]> = [];

    const rows = await fetchAllRows(async (from, to) => {
      ranges.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });

    assert.equal(rows.length, total);
    assert.deepEqual(
      rows.map((row) => row.id),
      all.map((row) => row.id),
    );
    assert.deepEqual(ranges, [
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("ровно 1000 строк запрашивает ещё одну (пустую) страницу", async () => {
    const all = Array.from({ length: POSTGREST_PAGE_SIZE }, (_, index) => ({ id: index + 1 }));
    const ranges: Array<[number, number]> = [];

    const rows = await fetchAllRows(async (from, to) => {
      ranges.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });

    assert.equal(rows.length, POSTGREST_PAGE_SIZE);
    assert.deepEqual(ranges, [
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("ошибка на второй странице пробрасывается", async () => {
    await assert.rejects(
      () =>
        fetchAllRows(async (from) => {
          if (from === 0) {
            return {
              data: Array.from({ length: POSTGREST_PAGE_SIZE }, (_, index) => ({ id: index + 1 })),
              error: null,
            };
          }
          return { data: null, error: { message: "page 2 failed" } };
        }),
      /page 2 failed/,
    );
  });
});
