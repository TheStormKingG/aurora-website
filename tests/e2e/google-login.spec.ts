import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

for (const path of ["/patient-login", "/register/patient"]) {
  test(`Continue with Google renders + axe clean on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: false });
  });
}
