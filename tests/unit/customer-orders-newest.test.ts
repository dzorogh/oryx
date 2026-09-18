import { describe, expect, it } from "vitest";
import {
  compareCustomerOrdersNewestFirst,
  visibleCustomerOrders,
} from "@/features/logistics/customer-orders-sort";
import type { CustomerOrder } from "@/features/logistics/logistics-types";

const order = (
  id: string,
  createdAt: string,
  status: CustomerOrder["status"] = "open",
): CustomerOrder => ({
  id,
  number: `OMS-${id}`,
  status,
  createdAt,
  closedAt: status === "closed" ? createdAt : null,
  expectedEndOn: null,
  description: "",
});

describe("visibleCustomerOrders", () => {
  const mixed = [
    order("70", "2026-09-17T07:55:55+00:00", "closed"),
    order("903", "2026-09-05T10:15:00+00:00"),
    order("1", "2025-11-14T15:45:26+00:00", "closed"),
    order("906", "2026-09-18T16:00:00+00:00"),
    order("999", "2026-01-01T00:00:00+00:00"),
  ];

  it("puts the latest created_at first, even when that is not the largest id", () => {
    const ids = visibleCustomerOrders(mixed, "all").map((row) => row.id);
    expect(ids[0]).toBe("906");
    expect(ids).toEqual(["906", "70", "903", "999", "1"]);
    expect(ids).not.toEqual(["1", "70", "903", "906", "999"]);
    expect(ids).not.toEqual(["999", "906", "903", "70", "1"]);
  });

  it("breaks created_at ties by numeric id descending", () => {
    const tied = [
      order("12", "2026-09-18T16:00:00+00:00"),
      order("100", "2026-09-18T16:00:00+00:00"),
      order("9", "2026-09-18T16:00:00+00:00"),
    ];
    expect(visibleCustomerOrders(tied, "all").map((row) => row.id)).toEqual(["100", "12", "9"]);
  });

  it("keeps newest-first order inside status chips", () => {
    expect(visibleCustomerOrders(mixed, "open").map((row) => row.id)).toEqual(["906", "903", "999"]);
    expect(visibleCustomerOrders(mixed, "closed").map((row) => row.id)).toEqual(["70", "1"]);
  });

  it("returns an empty list when there are no orders", () => {
    expect(visibleCustomerOrders([], "all")).toEqual([]);
    expect(visibleCustomerOrders([], "open")).toEqual([]);
  });

  it("does not mutate the source array", () => {
    const source = [order("1", "2026-01-01T00:00:00+00:00"), order("2", "2026-02-01T00:00:00+00:00")];
    const copy = [...source];
    visibleCustomerOrders(source, "all");
    expect(source).toEqual(copy);
  });
});

describe("compareCustomerOrdersNewestFirst", () => {
  it("sorts ISO timestamps descending", () => {
    const older = order("1", "2026-09-17T07:55:55+00:00");
    const newer = order("2", "2026-09-18T16:00:00+00:00");
    expect(compareCustomerOrdersNewestFirst(newer, older)).toBeLessThan(0);
    expect(compareCustomerOrdersNewestFirst(older, newer)).toBeGreaterThan(0);
  });
});
