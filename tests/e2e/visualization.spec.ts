import { expect, test } from "@playwright/test";

test("visualization smoke", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "3D визуализация упаковки контейнеров" })
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Показать контейнер 1" })).toBeVisible();
  await page.getByRole("button", { name: "Показать контейнер 2" }).click();

  await expect(page.getByLabel("Панель аудита")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});
