import { describe, expect, it } from "vitest";
import type { ThankYouEntry } from "@/features/pulse/thanks/thanks-demo-data";
import { thankYouEntryToRow, thankYouRowToEntry } from "@/features/pulse/thanks/thanks-api";

const entry: ThankYouEntry = {
  id: "ty-1",
  senderId: "emp-12",
  senderName: "Alexey Nazarov",
  senderDepartment: "Security",
  recipientId: "emp-1",
  recipientName: "Anna Petrova",
  recipientDepartment: "IT",
  message: "Thanks!",
  sentAtLabel: "May 28, 2026",
};

describe("thanks supabase mapping", () => {
  it("round-trips a thank-you entry through the row shape", () => {
    expect(thankYouRowToEntry(thankYouEntryToRow(entry))).toEqual(entry);
  });
});
