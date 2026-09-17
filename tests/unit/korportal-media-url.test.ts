import { describe, expect, it } from "vitest";
import { korportalMediaConversionUrl, preferKorportalMediaConversion } from "@/lib/korportal-media-url";

const original = "https://my.globaldrive.ru/s3/media/2026/09/01/03/223416/Force-1100-(6).png";
const medium = "https://my.globaldrive.ru/s3/media/2026/09/01/03/223416/conversions/Force-1100-(6)-medium.webp";
const small = "https://my.globaldrive.ru/s3/media/2026/09/01/03/223416/conversions/Force-1100-(6)-small.webp";

describe("korportal media conversion URLs", () => {
  it("builds the Spatie conversions/{stem}-{name}.webp path", () => {
    expect(korportalMediaConversionUrl(original, "medium")).toBe(medium);
    expect(korportalMediaConversionUrl(original, "small")).toBe(small);
  });

  it("prefers medium, then small, then big, then the original", () => {
    expect(preferKorportalMediaConversion(original)).toBe(medium);
    expect(preferKorportalMediaConversion(original, ["small", "big"])).toBe(small);
    expect(preferKorportalMediaConversion(original, [])).toBe(original);
    expect(preferKorportalMediaConversion(medium)).toBe(medium);
    expect(preferKorportalMediaConversion(null)).toBeNull();
  });
});
