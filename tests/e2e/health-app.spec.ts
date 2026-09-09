import { test, expect, type Page } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env";

loadEnvLocal();
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
test.skip(!url || !serviceKey, "needs SUPABASE_SERVICE_KEY to seed a patient");
test.use({ viewport: { width: 375, height: 812 } });

const password = "Test-passw0rd!";
let email = "";
let userId = "";
const admin = () => createClient(url!, serviceKey!, { auth: { persistSession: false } });

test.beforeAll(async () => {
  email = `e2e-health+${Date.now()}@example.com`;
  const { data, error } = await admin().auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: "E2E Patient", dob: "1990-01-01" },
  });
  if (error) throw error;
  userId = data.user.id;
});

test.afterAll(async () => {
  if (userId) await admin().auth.admin.deleteUser(userId); // cascades through health.patients
});

async function signIn(page: Page) {
  await page.goto("/patient-login/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/account/patient/");
}

test("consent gate, then log a blood pressure reading", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/");

  // Consent gate. The shell only paints this form pre-consent (AppShell
  // renders ShellLoading whenever consented === onConsent) — this patient
  // is fresh, so it's the first thing after sign-in.
  await expect(page.getByRole("heading", { name: "Before you start" })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
  await page.getByRole("button", { name: /I agree/ }).click();
  await expect(page.locator("#agree-error")).toHaveText("Tick the box to continue.");
  await page.getByLabel(/I agree to Aurora storing/).check();
  await page.getByRole("button", { name: /I agree/ }).click();

  // Today. MetricCard/WaterCard wrap an <h2> in aria-labelledby, so
  // getByLabel resolves the whole card the same way it would a form control.
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  await expect(page.getByLabel("Blood pressure")).toContainText("No reading yet.");
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  // Water quick-add is optimistic (spec §9.2): the total updates before the
  // insert round-trips, and a sr-only live region announces the new total
  // (WCAG 4.1.3) once it does.
  const water = page.getByLabel("Water today");
  await water.getByRole("button", { name: "+250 ml" }).click();
  await expect(water).toContainText("250 / 2,000 ml");
  await expect(water.getByRole("status")).toHaveText("Added 250 ml. 250 of 2,000 ml today.");

  // Log sheet. The centre tab-bar button carries aria-label="Log a
  // reading" — the metric cards' own buttons read "Log your first
  // reading" / "Log a new reading" instead.
  await page.getByRole("button", { name: "Log a reading" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
  await dialog.getByLabel("Systolic (top)").fill("128");
  await dialog.getByLabel("Diastolic (bottom)").fill("82");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Blood pressure 128/82 saved");
  // bpBand checks the stage-1 diastolic threshold (>=80) before the
  // elevated-systolic one, so 82 outranks 128 into "High (stage 1)" —
  // not "Elevated", which needs both numbers under their stage-1 floor.
  await expect(dialog.getByText("High (stage 1)")).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
  await dialog.getByRole("button", { name: "Done" }).click();

  // Card updated
  const card = page.getByLabel("Blood pressure");
  await expect(card).toContainText("128/82");
  await expect(card).toContainText("High (stage 1)");
});

// Runs after the consent test in the same worker — this file isn't
// fullyParallel, so tests run in order and reuse the seeded patient's
// now-granted consent; a consented patient goes straight to Today.
test("keyboard: Escape closes the sheet and focus returns to the opener", async ({ page }) => {
  await signIn(page);
  await page.goto("/app/");
  const opener = page.getByRole("button", { name: "Log a reading" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});
