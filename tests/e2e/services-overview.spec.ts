import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

/**
 * The service pillars are grouped by availability rather than badged
 * with it, so the grouping is load-bearing: if a content edit changes a
 * service's `phase`, the page silently moves it between groups. These
 * tests pin the split and the heading outline it depends on.
 *
 * The axe pass below walks the whole page before running, so it covers
 * elements in their FINAL state. That matters: the StepsIgnition labels
 * and every light-section eyebrow only reach their real colour once lit,
 * and until `--aurora-link-on-light` was darkened to #0a6f88 (5.41:1)
 * they sat at 3.54:1 — a failure a top-of-page-only scan never saw.
 */

test.use({ contextOptions: { reducedMotion: "reduce" } });

for (const path of ["/", "/services"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    // Walk the page so scroll-revealed and "ignited" elements settle into
    // their final colours before anything is measured.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 300) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForTimeout(1200);
    await injectAxe(page);
    await checkA11y(page, undefined, { detailedReport: false });
  });
}

test("home overview splits available services from the roadmap", async ({ page }) => {
  await page.goto("/");
  const section = page.locator('section[aria-labelledby="services-heading"]');

  await expect(section.getByRole("heading", { name: "Available now" })).toBeVisible();
  // The roadmap is its own section now, so it can be its own slide.
  await expect(page.getByRole("heading", { name: "Coming to your community" })).toBeVisible();

  // Four bookable services, each with its own Book link — the action
  // that replaced the "AVAILABLE NOW" badge.
  await expect(section.getByRole("link", { name: "Book" })).toHaveCount(4);

  // The platform leads the group; it is not one of the four cards.
  await expect(
    section.getByRole("heading", { name: "Aurora Digital Health Platform" })
  ).toBeVisible();

  // Roadmap items are rows, and every one names its phase.
  const roadmap = page
    .locator('section[aria-labelledby="roadmap-heading"]')
    .locator("ul li");
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
