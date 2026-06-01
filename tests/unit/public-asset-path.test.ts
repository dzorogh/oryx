import { afterEach, describe, expect, it, vi } from "vitest";

describe("publicAssetPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns pathname unchanged when base path is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const { publicAssetPath } = await import("@/lib/public-asset-path");

    expect(publicAssetPath("/tenants/logos/globaldrive.png")).toBe(
      "/tenants/logos/globaldrive.png",
    );
  });

  it("prefixes local public paths with base path", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/oryx");
    const { publicAssetPath } = await import("@/lib/public-asset-path");

    expect(publicAssetPath("/tenants/logos/globaldrive.png")).toBe(
      "/oryx/tenants/logos/globaldrive.png",
    );
  });

  it("leaves absolute URLs unchanged", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/oryx");
    const { publicAssetPath } = await import("@/lib/public-asset-path");

    expect(publicAssetPath("https://example.com/logo.png")).toBe(
      "https://example.com/logo.png",
    );
  });

  it("does not double-prefix when path already includes base path", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/oryx");
    const { publicAssetPath } = await import("@/lib/public-asset-path");

    expect(publicAssetPath("/oryx/tenants/logos/globaldrive.png")).toBe(
      "/oryx/tenants/logos/globaldrive.png",
    );
  });
});
