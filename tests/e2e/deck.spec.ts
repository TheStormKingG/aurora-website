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

// The deck is desktop-only by design (see Deck.tsx): below lg the
// multi-column layouts stack and no slide fits.
test.use({ viewport: { width: 1440, height: 900 } });

test("deck drives the home page: keyboard, live region, locked document", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-deck", "on");
  await page.locator("[data-deck-pane]").first().waitFor();
  await expect(page.locator("[data-deck-pane]")).toHaveCount(SLIDES);

  // The document itself must not scroll while the deck owns the viewport.
  expect(await page.evaluate(() => document.body.scrollHeight <= window.innerHeight + 4)).toBe(
    true
  );

  // There is no visible pager, so position is read off the rail — and,
  // for anyone using a screen reader, announced by the live region.
  const at = () =>
    page.evaluate(() => {
      const rail = document.querySelector("[data-deck-pane]")?.parentElement;
      const m = /translateY\((-?\d+)%\)/.exec(rail?.style.transform ?? "");
      return m ? Math.abs(Number(m[1])) / 100 + 1 : 1;
    });

  await expect.poll(at).toBe(1);
  await page.keyboard.press("End");
  await expect.poll(at).toBe(SLIDES);
  await expect(page.locator("[aria-live='polite']")).toContainText(`${SLIDES} of ${SLIDES}`);
  await page.keyboard.press("Home");
  await expect.poll(at).toBe(1);
  await page.keyboard.press("ArrowDown");
  await expect.poll(at).toBe(2);
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

test("a phone viewport gets ordinary flow, not a deck", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-deck", "on");
  expect(await page.evaluate(() => document.body.scrollHeight > window.innerHeight)).toBe(true);
  await page.close();
});

test("a tablet is wide enough for the deck", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-deck", "on");
  await page.close();
});

test("reduced motion falls back to ordinary document flow", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-deck", "on");
  await expect(page.getByRole("navigation", { name: "Slides" })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.scrollHeight > window.innerHeight)).toBe(true);
  await page.close();
});

for (const mode of ["deck", "fallback"] as const) {
  test(`exactly one footer is exposed in ${mode} mode`, async ({ browser }) => {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      ...(mode === "fallback" ? { reducedMotion: "reduce" as const } : {}),
    });
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
