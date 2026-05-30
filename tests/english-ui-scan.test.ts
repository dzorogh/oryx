import { describe, expect, it } from "vitest";
import { scanEnglishUi, shouldScanFile, stripComments } from "../scripts/lib/english-ui-scan.mjs";

describe("english-ui-scan", () => {
  it("flags Cyrillic in JSX text", () => {
    const source = `export const X = () => <button>Отправить</button>;`;
    const violations = scanEnglishUi(source);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.kind).toBe("jsx-text");
  });

  it("flags Cyrillic in UI attributes", () => {
    const source = `export const X = () => <input placeholder="Поиск" />;`;
    const violations = scanEnglishUi(source);
    expect(violations.some((item) => item.kind === "jsx-attr:placeholder")).toBe(true);
  });

  it("ignores Cyrillic in comments", () => {
    const source = `// Комментарий\nexport const X = () => <button>Send</button>;`;
    const violations = scanEnglishUi(source);
    expect(violations).toHaveLength(0);
  });

  it("ignores Cyrillic in className", () => {
    const source = `export const X = () => <div className="тест">Send</div>;`;
    const violations = scanEnglishUi(source);
    expect(violations).toHaveLength(0);
  });

  it("respects english-ui:ignore", () => {
    const source = `export const X = () => (
      // english-ui:ignore
      <button>Сказать спасибо</button>
    );`;
    const violations = scanEnglishUi(source);
    expect(violations).toHaveLength(0);
  });

  it("respects english-ui:ignore-file", () => {
    const source = `// english-ui:ignore-file\nexport const X = () => <button>Спасибо</button>;`;
    const violations = scanEnglishUi(source);
    expect(violations).toHaveLength(0);
  });

  it("strips block comments before scanning", () => {
    const stripped = stripComments(`/* Текст */ const a = 1;`);
    expect(stripped).not.toMatch(/Текст/);
  });

  it("selects only app and src tsx files", () => {
    expect(shouldScanFile("app/page.tsx")).toBe(true);
    expect(shouldScanFile("src/foo.tsx")).toBe(true);
    expect(shouldScanFile("src/components/home/news-demo-data.ts")).toBe(true);
    expect(shouldScanFile("scripts/foo.tsx")).toBe(false);
    expect(shouldScanFile("src/foo.test.tsx")).toBe(false);
  });

  it("flags ariaLabel camelCase attribute", () => {
    const source = `export const X = () => <div ariaLabel="Выбор" />;`;
    const violations = scanEnglishUi(source);
    expect(violations.some((item) => item.kind === "jsx-attr:ariaLabel")).toBe(true);
  });
});
