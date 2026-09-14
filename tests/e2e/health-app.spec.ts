import { test, expect, type Page } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env";
// Imported, never hardcoded: readConsentCookie() rejects a record whose
// version is not the current NOTICE_VERSION, so a hardcoded copy would
// silently stop suppressing the banner the next time the notice is
// revised — and bring back the flake below with it.
import {
  CONSENT_COOKIE,
  makeConsentRecord,
  mostPrivateScope,
  serializeConsent,
} from "../../src/lib/consent";

loadEnvLocal();
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
test.skip(!url || !serviceKey, "needs SUPABASE_SERVICE_KEY to seed a patient");
test.use({ viewport: { width: 375, height: 812 } });

const password = "Test-passw0rd!";
let email = "";
const createdUserIds: string[] = [];
const admin = () => createClient(url!, serviceKey!, { auth: { persistSession: false } });

/** A brand-new confirmed patient. Every id is cleaned up in afterAll. */
async function createPatient(): Promise<string> {
  const address = `e2e-health+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { data, error } = await admin().auth.admin.createUser({
    email: address, password, email_confirm: true,
    user_metadata: { full_name: "E2E Patient", dob: "1990-01-01" },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  return address;
}

test.beforeAll(async () => {
  email = await createPatient();
});

test.afterAll(async () => {
  // Deleting the auth user cascades through health.patients.
  for (const id of createdUserIds) await admin().auth.admin.deleteUser(id);
  createdUserIds.length = 0;
});

/**
 * THE FLAKE THIS FILE HAD, and why the cookie is seeded here.
 *
 * ConsentBanner is `fixed inset-x-0 bottom-0 z-[60]`. This is the only
 * spec that runs at 375x812, and at that height the banner covers the
 * centre of the Sign in button: document.elementFromPoint() on the
 * button returns the banner div, not the button. Playwright resolves the
 * button, scrolls to it, then hit-tests before clicking, finds the
 * banner, and retries until the test times out — a 30s hang whose log
 * ends at "done scrolling" and names no cause.
 *
 * It was intermittent because the banner paints after hydration: a click
 * that lands first succeeds, one that lands after it hangs. That race is
 * why a different test failed on each run, which reads like shared
 * database state and is not. The patient is created fresh per run and
 * deleted afterwards, so no state survives a run at all.
 *
 * Seeding the choice is what a returning visitor has anyway, and no spec
 * asserts on the banner, so nothing is lost by not rendering it.
 */
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    {
      name: CONSENT_COOKIE,
      value: serializeConsent(makeConsentRecord(mostPrivateScope)),
      url: baseURL ?? "http://localhost:3000",
    },
  ]);
});

async function signIn(page: Page, as: string = email) {
  await page.goto("/patient-login/");
  // If the cookie ever stops suppressing the banner, fail here saying so
  // rather than 30s later inside an unexplained click timeout.
  await expect(
    page.getByRole("button", { name: "Accept all" }),
    "cookie banner must be dismissed — it covers Sign in at this viewport"
  ).toHaveCount(0);
  await page.getByLabel("Email").fill(as);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/account/patient/");
}

/**
 * Sign in and make sure the patient is past the Art. 9 consent gate.
 *
 * The Plan 2 tests below all read or write consent-gated data, and each
 * one was written assuming an earlier test had already agreed. Running
 * any of them alone (`-g "Trends"`) creates a fresh patient in beforeAll
 * who has not, so /app/ redirects to the gate and every selector after
 * it times out. Playwright does not promise an order, so this makes each
 * test stand on its own.
 */
async function signInConsented(page: Page) {
  await signIn(page);
  await page.goto("/app/");
  const agree = page.getByRole("button", { name: /I agree/ });
  const greeting = page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ });
  // AppShell renders ShellLoading until it knows the consent state, so an
  // immediate isVisible() on the gate returns false while it is still
  // deciding — which silently skipped consenting and then waited forever
  // for a Today screen that never came. Wait for whichever real state
  // arrives before acting on it.
  await expect(agree.or(greeting).first()).toBeVisible();
  if (await agree.isVisible()) {
    await page.getByLabel(/I agree to Aurora storing/).check();
    await agree.click();
  }
  await expect(greeting).toBeVisible();
}

test("consent gate, then log a blood pressure reading", async ({ page }) => {
  // Its own patient, not the shared one. This is the only test whose
  // precondition is "has NOT consented", and previously it held that by
  // being declared first and consenting the shared patient on the way
  // through — which every later test then silently depended on. Owning a
  // fresh patient makes it independent of order, and survivable on a
  // retry (a retry of the old test found no gate and failed).
  await signIn(page, await createPatient());
  await page.goto("/app/");

  // Consent gate. The shell only paints this form pre-consent (AppShell
  // renders ShellLoading whenever consented === onConsent), and this
  // patient was created moments ago.
  //
  // Two steps, not one. Waiting for the gate alone reports "the shell is
  // still deciding" (a slow machine) and "this patient was somehow
  // already consented" (a real bug) as the same bare timeout — it did
  // exactly that on a run where the browser stalled. Resolve the shell
  // first, then assert which state it settled into.
  const gate = page.getByRole("heading", { name: "Before you start" });
  const today = page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ });
  await expect(
    gate.or(today).first(),
    "app shell never resolved to either the consent gate or Today"
  ).toBeVisible({ timeout: 20_000 });
  await expect(gate, "a patient created moments ago must meet the consent gate").toBeVisible();
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

// Establishes its own consent rather than inheriting it: the gate test
// now consents a patient of its own, so nothing else grants it for the
// shared one. signInConsented leaves the page on Today either way.
test("keyboard: Escape closes the sheet and focus returns to the opener", async ({ page }) => {
  await signInConsented(page);
  const opener = page.getByRole("button", { name: "Log a reading" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

/* ── Plan 2 walk ───────────────────────────────────────────────────────
 * Selectors here were checked against the shipped components, not copied
 * from the plan: the chart toggle is "Hide the chart" (the plan said
 * "View as table", which described a switch that never existed), and
 * "Download my data" is matched exactly because ConsentPanel renders a
 * second "Download my data first" button inside the delete confirmation.
 */

test("More: download, access history, units, and the withdraw flow", async ({ page }) => {
  await signInConsented(page);
  await page.goto("/app/more/");
  await expect(page.getByRole("heading", { name: "More", level: 1 })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  // Download produces a real file and logs itself.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^aurora-health-data-\d{4}-\d{2}-\d{2}\.json$/);

  // The access history shows the patient's own events and nothing else.
  await page.getByRole("link", { name: /who has accessed my data/i }).click();
  await expect(page.getByRole("heading", { name: /who has accessed my data/i })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  // Withdrawing stops tracking and offers a resume. This test must leave
  // the patient consented again: a withdrawn patient fails every
  // consent-gated write below, and test order is not guaranteed.
  await page.goto("/app/more/");
  await page.getByRole("button", { name: "Stop tracking" }).click();
  await page.getByRole("button", { name: /yes, stop tracking/i }).click();
  await expect(page.getByText(/tracking is stopped/i)).toBeVisible();
  await page.getByRole("button", { name: /resume tracking/i }).click();
  await expect(page.getByRole("button", { name: "Stop tracking" })).toBeVisible();
});

test("Record: add an entry, see it, remove it", async ({ page }) => {
  await signInConsented(page);
  await page.goto("/app/record/");
  await expect(page.getByRole("heading", { name: "Health record", level: 1 })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });

  await page.getByRole("button", { name: /^add condition$/i }).click();
  await page.getByLabel("Name").fill("Hypertension");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  // The label also appears inside the Edit and Remove buttons' sr-only
  // text, so a bare text match resolves to three nodes. Assert on the
  // entry itself.
  const entry = page.getByRole("listitem").filter({ hasText: "Hypertension" });
  await expect(entry).toHaveCount(1);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /remove hypertension/i }).click();
  await expect(entry).toHaveCount(0);
});

test("Trends: log a reading, then see it charted and listed", async ({ page }) => {
  await signInConsented(page);
  await page.getByRole("button", { name: "Log a reading" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Systolic (top)").fill("128");
  await dialog.getByLabel("Diastolic (bottom)").fill("82");
  await dialog.getByRole("button", { name: "Save" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();

  await page.goto("/app/trends/");
  await expect(page.getByRole("heading", { name: "Trends", level: 1 })).toBeVisible();
  // "Listed" means a row in the Entries table. Scoped to cells because a
  // looser match also hits the chart's <title> (no box, never "visible")
  // and the table's own sr-only caption; .first() because this test can
  // run more than once against the shared patient within a session and
  // each run adds a row.
  await expect(
    page.getByRole("cell").filter({ hasText: "128/82 mmHg" }).first()
  ).toBeVisible();
  // "Charted": the chart's accessible name is its caption, which opens
  // "Average ..." — proving the summary and the SVG are wired together.
  await expect(page.getByRole("img", { name: /average/i })).toBeVisible();
  await page.getByRole("button", { name: "Hide the chart" }).click();
  await expect(page.getByRole("button", { name: "Show the chart" })).toBeVisible();
  await injectAxe(page);
  await checkA11y(page, undefined, { detailedReport: false });
});
