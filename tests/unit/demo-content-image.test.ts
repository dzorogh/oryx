import { describe, expect, it } from "vitest";

import { demoContentImageUrl } from "@/lib/demo-content-image";

describe("demoContentImageUrl", () => {
  it("returns a stable URL for the same seed", () => {
    const first = demoContentImageUrl("news-1", 1600, 900);
    const second = demoContentImageUrl("news-1", 1600, 900);
    expect(first).toBe(second);
  });

  it("usually returns different URLs for different seeds", () => {
    const first = demoContentImageUrl("news-1", 1600, 900);
    const second = demoContentImageUrl("news-2", 1600, 900);
    expect(first).not.toBe(second);
  });

  it("builds an Unsplash URL with requested dimensions", () => {
    const url = demoContentImageUrl("oryx-42", 640, 480);
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
    expect(url).toContain("w=640");
    expect(url).toContain("h=480");
    expect(url).toContain("fit=crop");
    expect(url).toContain("auto=format");
  });
});
