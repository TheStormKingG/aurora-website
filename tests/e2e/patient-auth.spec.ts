import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

for (const path of ["/register/patient", "/patient-login"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: false });
  });
}

test("register form validates before submit", async ({ page }) => {
  await page.goto("/register/patient");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  // Target the password field's error node precisely (its hint text also
  // contains "10 characters", so match the error element by id).
  await expect(page.locator("#password-error")).toHaveText("Use at least 10 characters.");
});
