import { describe, expect, it } from "vitest";
import {
  ASSIGNED_TO_LABEL,
  formatQuantity,
  formatSignedQuantity,
  LEDGER_ASSIGNED_TO_KIND_LABELS,
  LEDGER_DOCUMENT_KIND_LABELS,
  locationKindLabel,
} from "@/features/logistics/logistics-labels";

describe("formatSignedQuantity", () => {
  it("always prefixes positives with plus", () => {
    expect(formatSignedQuantity(12)).toBe("+12");
    expect(formatSignedQuantity(12, "pcs")).toBe("+12 шт");
    expect(formatSignedQuantity(1.5, "kg")).toBe("+1.50 kg");
  });

  it("uses a Unicode minus, not a hyphen-minus", () => {
    expect(formatSignedQuantity(-5)).toBe("\u22125");
    expect(formatSignedQuantity(-5, "pcs")).toBe("\u22125 шт");
    expect(formatSignedQuantity(-5)).not.toContain("-");
    expect(formatSignedQuantity(-2.5)).toBe("\u22122.50");
  });

  it("leaves zero unsigned", () => {
    expect(formatSignedQuantity(0)).toBe("0");
    expect(formatSignedQuantity(0, "pcs")).toBe("0 шт");
    expect(formatSignedQuantity(1e-12)).toBe("0");
  });

  it("does not change unsigned stock formatting", () => {
    expect(formatQuantity(12, "pcs")).toBe("12 шт");
    expect(formatQuantity(-5)).toBe("-5");
  });
});

describe("locationKindLabel", () => {
  it("names the host entity, not the stock-place phrasing", () => {
    expect(locationKindLabel("warehouse")).toBe("Склад");
    expect(locationKindLabel("warehouse", true)).toBe("Склад завода");
    expect(locationKindLabel("production_order")).toBe("Заказ на производство");
    expect(locationKindLabel("transfer")).toBe("Перемещение");
    expect(locationKindLabel("customer_order")).toBe("Заказ клиента");
  });

  it("names ledger assigned-to and document kinds in Russian", () => {
    expect(ASSIGNED_TO_LABEL).toBe("Закреплено за");
    expect(LEDGER_ASSIGNED_TO_KIND_LABELS.free).toBe("Свободно");
    expect(LEDGER_ASSIGNED_TO_KIND_LABELS.order).toBe("Заказ клиента");
    expect(LEDGER_ASSIGNED_TO_KIND_LABELS.region).toBe("Регион");
    expect(LEDGER_DOCUMENT_KIND_LABELS.reservation).toBe("Резерв");
    expect(LEDGER_DOCUMENT_KIND_LABELS.shipment).toBe("Отгрузка");
    expect(LEDGER_DOCUMENT_KIND_LABELS.return).toBe("Возврат");
    expect(LEDGER_DOCUMENT_KIND_LABELS.output).toBe("Выпуск");
  });
});
