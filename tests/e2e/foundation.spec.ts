import { test, expect } from "@playwright/test";
test("public shell and registration navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good business",
  );
  await page.getByRole("link", { name: "Create your workspace" }).click();
  await expect(page.getByRole("textbox", { name: "Full name" })).toBeVisible();
});
test("private routes require authentication", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});
// Preparation only: authenticated E2E fixtures must use an isolated test database.
// Do not add registration or booking mutations against a developer's Neon .env.
