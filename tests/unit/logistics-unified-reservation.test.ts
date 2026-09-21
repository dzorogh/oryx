import { describe, expect, it } from "vitest";
import {
  assertDocumentCanBeCancelled,
  IRREVERSIBLE_DOCUMENT_KINDS,
  POSTED_DOCUMENT_CANCEL_FORBIDDEN,
  RESERVATION_CANCEL_FORBIDDEN,
} from "@/features/logistics/logistics-rules";
import { RESERVATION_DIRECTION_LABELS } from "@/features/logistics/logistics-labels";
import { LOGISTICS_CODE_PREFIXES, formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { LOGISTICS_PATHS, redirectLegacyLogisticsPath } from "@/features/logistics/logistics-paths";
import {
  RESERVATION_DIRECTIONS,
  RESERVATION_LOCATION_TYPES,
  RESERVATION_ORIGINS,
  RESERVATION_STATUSES,
  reservationDirection,
  type Reservation,
  type ReservationLine,
} from "@/features/logistics/logistics-types";

describe("unified reservation model", () => {
  it("keeps a single RSV prefix and English direction labels", () => {
    expect(LOGISTICS_CODE_PREFIXES.reservation).toBe("RSV");
    expect(formatLogisticsCode("reservation", 8)).toBe("RSV-8");
    expect(RESERVATION_DIRECTION_LABELS.reserve).toBe("Reserve");
    expect(RESERVATION_DIRECTION_LABELS.release).toBe("Release");
    expect(RESERVATION_DIRECTION_LABELS.reassign).toBe("Reassign");
    expect([...RESERVATION_DIRECTIONS]).toEqual(["reserve", "release", "reassign"]);
    expect([...RESERVATION_STATUSES]).toEqual(["draft", "posted"]);
    expect([...RESERVATION_ORIGINS]).toEqual(["manual", "order_close"]);
    expect([...RESERVATION_LOCATION_TYPES]).toEqual(["warehouse", "production_order", "transfer"]);
    expect("reservationRelease" in LOGISTICS_CODE_PREFIXES).toBe(false);
    expect((Object.values(LOGISTICS_CODE_PREFIXES) as string[]).includes("REL")).toBe(false);
  });

  it("forbids cancelling reservation kinds", () => {
    expect(IRREVERSIBLE_DOCUMENT_KINDS).toContain("reservation");
    expect(IRREVERSIBLE_DOCUMENT_KINDS).toContain("reservation_release");
    expect(() => assertDocumentCanBeCancelled("reservation")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("reservation_release")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
    expect(RESERVATION_CANCEL_FORBIDDEN).toBe(
      "Posted reservations cannot be cancelled. Create a Reservation that releases to Free instead.",
    );
    expect(IRREVERSIBLE_DOCUMENT_KINDS).toEqual(
      expect.arrayContaining(["shipment", "shipment_return", "production_output", "transfer"]),
    );
    expect(() => assertDocumentCanBeCancelled("shipment", "posted")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("transfer", "sent")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
  });

  it("keeps destination on the header and source plus product on the line", () => {
    const header = {
      id: "1",
      number: "RSV-1",
      locationType: "warehouse",
      locationId: "2",
      toOwnerType: null,
      toOwnerId: null,
      status: "posted",
      origin: "order_close",
      note: "",
      createdAt: "2026-09-18T00:00:00Z",
    createdBy: "1",
      } satisfies Reservation;

    const line = {
      id: "1",
      reservationId: "1",
      productId: "22",
      quantity: 3,
      fromOwnerType: "order",
      fromOwnerId: "10",
    } satisfies ReservationLine;

    expect(header).not.toHaveProperty("operation");
    expect(header).not.toHaveProperty("customerOrderId");
    expect(line).toHaveProperty("productId");
    expect(line).not.toHaveProperty("customerOrderLineId");
    expect(line).not.toHaveProperty("locationType");
    expect(line.quantity).toBeGreaterThan(0);
    expect(reservationDirection(header, [line])).toBe("release");
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
