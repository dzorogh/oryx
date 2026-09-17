import { describe, expect, it } from "vitest";
import {
  assertDocumentCanBeCancelled,
  IRREVERSIBLE_DOCUMENT_KINDS,
  RESERVATION_CANCEL_FORBIDDEN,
} from "@/features/logistics/logistics-rules";
import { RESERVATION_OPERATION_LABELS } from "@/features/logistics/logistics-labels";
import { LOGISTICS_CODE_PREFIXES } from "@/features/logistics/logistics-codes";
import { RESERVATION_LOCATION_TYPES, RESERVATION_OPERATIONS, RESERVATION_STATUSES } from "@/features/logistics/logistics-types";

describe("unified reservation model", () => {
  it("keeps a single RSV prefix and English operation labels", () => {
    expect(LOGISTICS_CODE_PREFIXES.reservation).toBe("RSV");
    expect(RESERVATION_OPERATION_LABELS.reserve).toBe("Reserve");
    expect(RESERVATION_OPERATION_LABELS.release).toBe("Release");
    expect([...RESERVATION_OPERATIONS]).toEqual(["reserve", "release"]);
    expect([...RESERVATION_STATUSES]).toEqual(["draft", "posted"]);
    expect([...RESERVATION_LOCATION_TYPES]).toEqual(["warehouse", "production_order_line", "transfer"]);
  });

  it("forbids cancelling reservation kinds", () => {
    expect(IRREVERSIBLE_DOCUMENT_KINDS).toContain("reservation");
    expect(() => assertDocumentCanBeCancelled("reservation")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("reservation_release")).toThrow(RESERVATION_CANCEL_FORBIDDEN);
  });
});
