import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

/**
 * The service pillars are grouped by availability rather than badged
 * with it, so the grouping is load-bearing: if a content edit changes a
 * service's `phase`, the page silently moves it between groups. These
 * tests pin the split and the heading outline it depends on.
 *
 * KNOWN GAP in the axe pass on "/": the StepsIgnition labels only fail
 * contrast once they are lit, which needs them scrolled into view. Lit,
 * they inherit `.section-light .eyebrow` = #0e8fae on #f5f8fc = 3.54:1,
 * below the 4.5:1 AA threshold — as does EVERY eyebrow on every light
 * section. That is a brand-token question (PDR §4.2/§12), not a services
 * one, so it is reported rather than patched here, and this test does
 * not scroll far enough to catch it. Tighten this once the token moves.
 */

for (const path of ["/", "/services"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: false });
  });
}

test("home overview splits available services from the roadmap", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="services-heading"]');

  await expect(section.getByRole("heading", { name: "Available now" })).toBeVisible();
  await expect(section.getByRole("heading", { name: "On the roadmap" })).toBeVisible();

  // Four bookable services, each with its own Book link — the action
  // that replaced the "AVAILABLE NOW" badge.
  await expect(section.getByRole("link", { name: "Book" })).toHaveCount(4);

  // The platform leads the group; it is not one of the four cards.
  await expect(
    section.getByRole("heading", { name: "Aurora Digital Health Platform" })
  ).toBeVisible();

  // Roadmap items are rows, and every one names its phase.
  const roadmap = section.locator("ul").last().locator("li");
  await expect(roadmap).toHaveCount(3);
  for (const phase of [2, 3, 4]) {
    await expect(roadmap.getByText(`Phase ${phase}`, { exact: true })).toBeVisible();
  }
});

test("services page groups by availability and offers one action per card", async ({ page }) => {
  await page.goto("/services");

  await expect(page.getByRole("heading", { name: "Available now", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "On the roadmap", level: 2 })).toBeVisible();

  // One CTA per bookable card: the card itself is the "learn more" link.
  await expect(page.getByRole("link", { name: "Book now" })).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Learn more" })).toHaveCount(0);

  // The phase badge that used to sit on all eight cards is gone.
  await expect(page.getByText("Available now — Phase One")).toHaveCount(0);
});
