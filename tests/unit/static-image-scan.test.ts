import { describe, expect, it } from "vitest";
import {
  isAllowedPublicFile,
  scanPublicImageFiles,
  scanSourceStaticImagePaths,
  shouldScanSourceFile,
} from "../../scripts/lib/static-image-scan.mjs";

describe("shouldScanSourceFile", () => {
  it("scans app and src TSX except asset barrel files", () => {
    expect(shouldScanSourceFile("src/components/foo.tsx")).toBe(true);
    expect(shouldScanSourceFile("app/page.tsx")).toBe(true);
    expect(shouldScanSourceFile("src/assets/tenants/logos/index.ts")).toBe(false);
    expect(shouldScanSourceFile("scripts/check-static-images.mjs")).toBe(false);
  });
});

describe("scanSourceStaticImagePaths", () => {
  it("flags root-absolute image paths", () => {
    const violations = scanSourceStaticImagePaths(
      `const x = "/tenants/logos/foo.png";`,
      "src/demo.ts",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("root-image-path");
    expect(violations[0]?.text).toBe("/tenants/logos/foo.png");
  });

  it("allows relative imports in asset barrels", () => {
    expect(shouldScanSourceFile("src/assets/store/demo-images/index.ts")).toBe(false);
  });

  it("flags legacy public/ imports", () => {
    const violations = scanSourceStaticImagePaths(
      `import x from "../../public/tenants/logos/a.png";`,
      "src/lib/old.ts",
    );
    expect(violations.some((v) => v.kind === "public-import")).toBe(true);
  });

  it("respects static-images: ignore", () => {
    const violations = scanSourceStaticImagePaths(
      `const x = "/a.png"; // static-images: ignore`,
      "src/demo.ts",
    );
    expect(violations).toHaveLength(0);
  });
});

describe("scanPublicImageFiles", () => {
  it("allows favicon only", () => {
    expect(isAllowedPublicFile("favicon.ico")).toBe(true);
    expect(scanPublicImageFiles(["public/favicon.ico"])).toHaveLength(0);
  });

  it("flags other images in public/", () => {
    const violations = scanPublicImageFiles(["public/tenants/logos/a.png"]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("public-image-file");
  });
});
