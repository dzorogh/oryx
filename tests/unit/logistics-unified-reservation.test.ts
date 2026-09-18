import { describe, expect, it } from "vitest";
import {
  assertDocumentCanBeCancelled,
  IRREVERSIBLE_DOCUMENT_KINDS,
  RESERVATION_CANCEL_FORBIDDEN,
} from "@/features/logistics/logistics-rules";
import { RESERVATION_OPERATION_LABELS } from "@/features/logistics/logistics-labels";
import { LOGISTICS_CODE_PREFIXES, formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { LOGISTICS_PATHS, redirectLegacyLogisticsPath } from "@/features/logistics/logistics-paths";
import {
  RESERVATION_LOCATION_TYPES,
  RESERVATION_OPERATIONS,
  RESERVATION_ORIGINS,
  RESERVATION_STATUSES,
  type Reservation,
  type ReservationLine,
} from "@/features/logistics/logistics-types";

describe("unified reservation model", () => {
  it("keeps a single RSV prefix and English operation labels", () => {
    expect(LOGISTICS_CODE_PREFIXES.reservation).toBe("RSV");
    expect(formatLogisticsCode("reservation", 8)).toBe("RSV-8");
    expect(RESERVATION_OPERATION_LABELS.reserve).toBe("Reserve");
    expect(RESERVATION_OPERATION_LABELS.release).toBe("Release");
    expect([...RESERVATION_OPERATIONS]).toEqual(["reserve", "release"]);
    expect([...RESERVATION_STATUSES]).toEqual(["draft", "posted"]);
    expect([...RESERVATION_ORIGINS]).toEqual(["manual", "order_close"]);
    expect([...RESERVATION_LOCATION_TYPES]).toEqual(["warehouse", "production_order_line", "transfer"]);
    expect("reservationRelease" in LOGISTICS_CODE_PREFIXES).toBe(false);
    expect((Object.values(LOGISTICS_CODE_PREFIXES) as string[]).includes("REL")).toBe(false);
  });

  it("forbids cancelling reservation kinds", () => {
    expect(IRREVERSIBLE_DOCUMENT_KINDS).toContain("reservation");
    expect(IRREVERSIBLE_DOCUMENT_KINDS).toContain("reservation_release");
    expect(() => assertDocumentCanBeCancelled("reservation")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("reservation_release")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
  });

  it("keeps location and operation on the header; lines have no productId", () => {
    const header = {
      id: "1",
      number: "RSV-1",
      customerOrderId: "10",
      locationType: "warehouse",
      locationId: "2",
      operation: "release",
      status: "posted",
      origin: "order_close",
      note: "",
      createdAt: "2026-09-18T00:00:00Z",
      postedAt: "2026-09-18T00:00:00Z",
    } satisfies Reservation;

    const line = {
      id: "1",
      reservationId: "1",
      customerOrderLineId: "100",
      quantity: 3,
    } satisfies ReservationLine;

    expect(header.operation).toBe("release");
    expect(header.locationType).toBe("warehouse");
    expect(line).not.toHaveProperty("productId");
    expect(line).not.toHaveProperty("locationType");
    expect(line).not.toHaveProperty("operation");
    expect(line.quantity).toBeGreaterThan(0);
  });

  it("redirects legacy releases URLs to the release filter", () => {
    expect(redirectLegacyLogisticsPath(["releases"])).toBe(
      `${LOGISTICS_PATHS.reservations}?operation=release`,
    );
    expect(redirectLegacyLogisticsPath(["releases", "4"])).toBe(
      `${LOGISTICS_PATHS.reservations}?operation=release`,
    );
  });
});
