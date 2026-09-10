import { test, expect } from "@playwright/test";

/**
 * The slide deck takes over scrolling, which is exactly the kind of
 * pattern that breaks quietly. These pin the properties that make it
 * acceptable on a site committed to WCAG 2.2 AA rather than just the
 * happy path.
 *
 * The load-bearing ones are the last two: every slide must FIT its track
 * (a slide that overflows is content clipped out of reach, WCAG 1.4.10
 * Reflow), and exactly one footer may be exposed in EITHER mode — the
 * first cut of this shipped two on the fallback path.
 */

const SLIDES = 6;

test("deck drives the home page: pager, keyboard, and a locked document", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-deck", "on");

  const pager = page.getByRole("navigation", { name: "Slides" }).getByRole("button");
  await expect(pager).toHaveCount(SLIDES);

  // The document itself must not scroll while the deck owns the viewport.
  expect(await page.evaluate(() => document.body.scrollHeight <= window.innerHeight + 4)).toBe(true);

  const current = () =>
    page.evaluate(
      () =>
        document.querySelector('[aria-label="Slides"] button[aria-current]')?.textContent ?? "?"
    );

  await expect.poll(current).toBe("1");
  await page.keyboard.press("End");
  await expect.poll(current).toBe(String(SLIDES));
  await page.keyboard.press("Home");
  await expect.poll(current).toBe("1");

  // Pager jumps are always available, even on a slide that scrolls.
  await pager.nth(3).click();
  await expect.poll(current).toBe("4");
});

test("off-screen slides stay in the DOM but cannot take focus", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-deck-pane]").first().waitFor();
  const panes = page.locator("[data-deck-pane]");
  await expect(panes).toHaveCount(SLIDES);
  // Everything but the current slide is inert.
  await expect(page.locator("[data-deck-pane][inert]")).toHaveCount(SLIDES - 1);
  // Content is still present for find-in-page and crawlers. Off-screen
  // slides are aria-hidden by design, so this must be a DOM query rather
  // than a role query — a role query would (correctly) not see them.
  await expect(
    page.locator("h2", { hasText: "Care in three simple steps" })
  ).toBeAttached();
});

test("no slide overflows its track enough to feel stuck", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-deck-pane]").first().waitFor();
  const { overflow, track } = await page.evaluate(() => {
    const panes = [...document.querySelectorAll("[data-deck-pane]")];
    return {
      overflow: panes.map((p) => p.scrollHeight - p.clientHeight),
      track: panes[0]?.clientHeight ?? 0,
    };
  });
  // Overflow is not clipped — a tall slide scrolls inside itself, which is
  // the Reflow escape hatch. But a slide the reader must scroll far into
  // before the deck will advance feels broken, and that is what this
  // guards: the services slide was 261px over its track before it was
  // split in two. A tenth of the track is the tolerance.
  const budget = Math.round(track * 0.1);
  for (const [i, px] of overflow.entries()) {
    expect(px, `slide ${i + 1} overflows by ${px}px against a ${budget}px budget`).toBeLessThanOrEqual(
      budget
    );
  }
});

test("reduced motion falls back to ordinary document flow", async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-deck", "on");
  await expect(page.getByRole("navigation", { name: "Slides" })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.scrollHeight > window.innerHeight)).toBe(true);
  await page.close();
});

for (const mode of ["deck", "fallback"] as const) {
  test(`exactly one footer is exposed in ${mode} mode`, async ({ browser }) => {
    const page = await browser.newPage(
      mode === "fallback" ? { reducedMotion: "reduce" } : undefined
    );
    await page.goto("/");
    const visible = await page.evaluate(
      () =>
        [...document.querySelectorAll("footer")].filter(
          (f) => f.getBoundingClientRect().height > 0
        ).length
    );
    expect(visible, `${mode} mode exposed ${visible} footers`).toBe(1);
    await page.close();
  });
}
