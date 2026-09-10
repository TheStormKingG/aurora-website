import { test, expect } from "@playwright/test";

/**
 * The home page and the header were thinned deliberately, and both creep
 * back the same way: one more nav item, one more section. The budgets are
 * asserted rather than described.
 *
 * The load-bearing claim is the last test: every destination removed from
 * the header still has to be reachable from the footer, which is on every
 * page. Cutting nav items is only safe while that holds.
 */

const DROPPED_FROM_NAV = [
  { label: "Health Resources", href: "/resources/" },
  { label: "News & Programmes", href: "/news/" },
  { label: "Careers", href: "/careers/" },
];

test("header carries at most six items", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator("header").first();
  const links = bar.getByRole("navigation", { name: "Primary" }).locator("> ul > li");
  await expect(links).toHaveCount(4);
  // Plus the two actions: one for returning patients, one for new ones.
  await expect(bar.getByRole("link", { name: "Patient Login" })).toBeVisible();
  await expect(bar.getByRole("link", { name: "Book Appointment" })).toBeVisible();
});

test("home page is four content sections", async ({ page }) => {
  await page.goto("/");
  const sections = page.locator("main section");
  await expect(sections).toHaveCount(4);
  for (const heading of [
    "Eight pillars of care, one connected system",
    "Care in three simple steps",
    "Your health story belongs to you",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("nothing dropped from the header is orphaned — the footer still carries it", async ({
  page,
}) => {
  await page.goto("/");
  const footerNav = page.locator("footer").first().getByRole("navigation", { name: "Footer" });
  for (const { label, href } of DROPPED_FROM_NAV) {
    const link = footerNav.getByRole("link", { name: label });
    await expect(link, `${label} must survive in the footer`).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
  }
});

test("the removed news band did not take /news with it", async ({ page }) => {
  await page.goto("/news");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
