import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextOrderLineQuantity } from "@/features/logistics/logistics-rules";

describe("nextOrderLineQuantity", () => {
  it("add-new записывает введённое количество", () => {
    assert.equal(nextOrderLineQuantity("add", null, 3), 3);
  });

  it("add-existing складывает с уже имеющейся строкой", () => {
    assert.equal(nextOrderLineQuantity("add", 4, 2), 6);
  });

  it("edit заменяет количество", () => {
    assert.equal(nextOrderLineQuantity("edit", 4, 2), 2);
  });

  it("delete обнуляет строку", () => {
    assert.equal(nextOrderLineQuantity("delete", 4, 2), 0);
  });
});
