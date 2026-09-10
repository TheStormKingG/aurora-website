import { describe, expect, it } from "vitest";
import { axisTicks, scale } from "./trend-scale";

describe("scale", () => {
  it("pads a range so the data is not drawn on the edge", () => {
    const { lo, hi } = scale([100, 140]);
    expect(lo).toBeLessThan(100);
    expect(hi).toBeGreaterThan(140);
  });

  it("gives a flat series a band to draw in", () => {
    const { lo, hi } = scale([120, 120, 120]);
    expect(hi).toBeGreaterThan(lo);
  });

  it("gives a flat series at zero a band too", () => {
    // pad would be 0 from the percentage rule, so the floor of 1 matters.
    const { lo, hi } = scale([0, 0]);
    expect(hi - lo).toBeGreaterThanOrEqual(2);
  });
});

describe("axisTicks", () => {
  it("labels a wide range with whole numbers", () => {
    expect(axisTicks(80, 120)).toEqual([120, 100, 80]);
  });

  it("keeps every label distinct on a narrow range", () => {
    // Rounding all three to integers labelled every gridline "1" and
    // collided the React keys drawn from them.
    const ticks = axisTicks(0.8, 1.2);
    expect(new Set(ticks).size).toBe(ticks.length);
    expect(ticks.length).toBeGreaterThan(1);
  });

  // Uniqueness alone cannot fail here — the function dedupes internally,
  // so a Set comparison is always true. The count is what carries the
  // assertion: collapsing to one label is the failure being guarded.
  it("still gives three distinct labels, whatever the span", () => {
    for (const [lo, hi] of [
      [0, 0.02],
      [0.8, 1.2],
      [5, 5.4],
      [99.9, 100.1],
      [0, 10000],
    ] as const) {
      const ticks = axisTicks(lo, hi);
      expect(ticks.length, `lo=${lo} hi=${hi} produced ${ticks.join(", ")}`).toBe(3);
      expect(new Set(ticks).size).toBe(3);
    }
  });

  it("orders labels from top to bottom", () => {
    const ticks = axisTicks(80, 120);
    expect(ticks).toEqual([...ticks].sort((a, b) => b - a));
  });
});
