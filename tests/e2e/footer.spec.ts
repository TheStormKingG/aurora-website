import { test, expect } from "@playwright/test";

/**
 * The footer must fit one phone screen without scrolling. It was 1228px
 * on a 390px-wide viewport (1.46x the whole viewport) before this guard
 * existed, and height creeps back one link and one margin at a time —
 * so the budget is asserted, not just documented.
 *
 * The budget is the FULL viewport height, because that is the state the
 * footer is actually seen in: scrolling to the bottom of a page is the
 * gesture that collapses mobile browser toolbars. 375x667 is the
 * smallest phone still worth supporting (4.7" iPhone SE); every larger
 * phone clears it with room to spare.
 */

const SMALLEST_PHONE = { width: 375, height: 667 };

test.use({ viewport: SMALLEST_PHONE });

test("footer fits one screen on the smallest supported phone", async ({ page }) => {
  await page.goto("/");
  const box = await page.locator("footer").first().boundingBox();
  expect(box).not.toBeNull();
  expect(
    Math.round(box!.height),
    `footer is ${Math.round(box!.height)}px tall; budget is ${SMALLEST_PHONE.height}px`
  ).toBeLessThanOrEqual(SMALLEST_PHONE.height);
});

test("footer keeps its wayfinding, contact, trust and legal jobs", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer").first();
  const nav = footer.getByRole("navigation", { name: "Footer" });

  // Four groups, and the destinations that exist nowhere else in the
  // chrome: staff sign-in, donations, payments, and the privacy set.
  for (const heading of ["Care", "Learn", "Support", "Privacy"]) {
    await expect(nav.getByRole("heading", { name: heading })).toBeVisible();
  }
  for (const label of [
    "Staff Login",
    "Donations",
    "Online Payments",
    "Privacy Centre",
    "Privacy Notice",
    "Consent Preferences",
    "Your Data Rights",
  ]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }

  await expect(footer.getByRole("link", { name: "hello@hmaurora.health" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "privacy@hmaurora.health" })).toBeVisible();
  await expect(footer.getByText("No third-party trackers")).toBeVisible();
});

test("footer links are large enough to tap", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("footer nav a");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const box = await links.nth(i).boundingBox();
    const label = (await links.nth(i).innerText()).trim();
    // Apple's minimum control size is 28x28pt; these were 20px text
    // lines before the footer was rebuilt.
    expect(Math.round(box!.height), `"${label}" tap target`).toBeGreaterThanOrEqual(28);
  }
});
